"""Personalized assessment workflow:
- Dynamic practical case study question generation based on event brief and participant skills/roles/level
- State lifecycle: generating -> ready -> draft -> submitted -> evaluating -> completed / failed
- Private rubrics stored securely and NEVER exposed to frontend
- Draft answer auto-saving and recovery
- Strict evaluation against saved rubrics with server-side normalization
- Idempotent generation and submission handling
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.db.session import get_db
from .auth import current_user
from .db import one, rows, execute, require
from .ai_service import generate_case_studies, evaluate_answers, AIServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/events/{eid}/assessment', tags=['Assessments'])

# ─── Request Schemas ──────────────────────────────────────────────────────────

class AnswerDraft(BaseModel):
    question_id: UUID
    answer_text: str = Field(max_length=10000)

class SaveAnswersBody(BaseModel):
    answers: List[AnswerDraft] = Field(min_length=1, max_length=10)

class SubmitAssessmentBody(BaseModel):
    answers: List[AnswerDraft] = Field(min_length=1, max_length=10)

# ─── Helper Functions ─────────────────────────────────────────────────────────

def get_event_and_registration(db, eid: UUID, uid: UUID):
    event = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid), 404, 'Event not found')
    reg = require(
        one(db, "SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid AND status='registered'", eid=eid, uid=uid),
        403, 'You must register for this event before taking the assessment'
    )
    return event, reg

def sanitize_question_for_client(q: Dict[str, Any]) -> Dict[str, Any]:
    """Exposes question scenario and metadata to candidate WITHOUT private rubrics or guidelines."""
    rubric = q.get('rubric') or {}
    return {
        'id': str(q['id']),
        'submission_id': str(q['submission_id']),
        'position': q['position'],
        'prompt': q['prompt'],
        'response_type': q['response_type'],
        'target_role': rubric.get('target_role') or q.get('target_role', 'Contributor'),
        'target_skill': rubric.get('target_skill') or q.get('target_skill', 'Problem Solving'),
        'difficulty': q['difficulty'],
        'estimated_time_minutes': rubric.get('estimated_time_minutes', 15),
        'expected_response_format': rubric.get('expected_response_format', 'Written analysis (2-4 paragraphs)'),
        'max_score': float(q['max_score'])
    }

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post('/start')
async def start_assessment(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Initialize or restore the participant's personalized case study assessment.
    If an attempt is already active or ready, returns the existing attempt (prevents duplicate generation).
    """
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot take participant assessments.')
    uid = user['id']
    event, reg = get_event_and_registration(db, eid, uid)
    execute(db, 'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))', key=str(eid)+':'+str(uid))
    require(event['status'] == 'published', 400, 'Assessment is only available for published events')

    # Find the current published assessment template for this event
    assessment = one(db, "SELECT * FROM hackloop.assessments WHERE event_id=:eid ORDER BY version DESC LIMIT 1", eid=eid)
    if not assessment:
        assessment = one(db, '''INSERT INTO hackloop.assessments(event_id, version, title, status, created_by)
          VALUES(:eid, :ver, :title, 'published', :uid) RETURNING *''',
          eid=eid, ver=event.get('version', 1), title=f"Assessment - {event['title']}", uid=event['created_by'])
        db.commit()

    # Check for existing submission for this user and event
    existing_sub = one(db, '''SELECT * FROM hackloop.assessment_submissions 
      WHERE event_id=:eid AND user_id=:uid ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE''',
      eid=eid, uid=uid)

    if existing_sub:
        # Check if questions already exist
        questions = rows(db, '''SELECT * FROM hackloop.personalized_assessment_questions 
          WHERE submission_id=:sid ORDER BY position''', sid=existing_sub['id'])
        if questions:
            answers = rows(db, 'SELECT question_id, answer_text, is_draft, updated_at FROM hackloop.personalized_assessment_answers WHERE submission_id=:sid', sid=existing_sub['id'])
            ans_map = {str(a['question_id']): a['answer_text'] for a in answers}
            return {
                'submission_id': str(existing_sub['id']),
                'attempt_number': existing_sub['attempt_number'],
                'status': existing_sub['status'],
                'questions': [sanitize_question_for_client(q) for q in questions],
                'answers': ans_map,
                'evaluation_score': existing_sub.get('evaluation_score'),
                'evaluation_summary': existing_sub.get('evaluation_summary'),
                'evaluation_details': existing_sub.get('evaluation_details'),
                'error_message': existing_sub.get('error_message')
            }

    # Create new submission record in 'generating' state
    if existing_sub:
        require(existing_sub['status']=='failed', 409, 'Your assessment is already being prepared. Please refresh shortly.')
    attempt_num = (existing_sub['attempt_number'] + 1) if existing_sub else 1
    new_sub = one(db, '''INSERT INTO hackloop.assessment_submissions(
        event_id, assessment_id, user_id, attempt_number, status, created_at, updated_at
      ) VALUES (
        :eid, :aid, :uid, :attempt, 'generating', now(), now()
      ) RETURNING *''',
      eid=eid, aid=assessment['id'], uid=uid, attempt=attempt_num)
    db.commit()

    # Read participant's registration data
    skills = reg.get('selected_skills') or []
    if isinstance(skills, str):
        try: skills = json.loads(skills)
        except Exception: skills = []
    
    preferred_roles = reg.get('preferred_roles') or []
    if isinstance(preferred_roles, str):
        try: preferred_roles = json.loads(preferred_roles)
        except Exception: preferred_roles = []

    exp_level = reg.get('experience_level') or 'intermediate'
    event_brief_str = event.get('description', '')
    if event.get('expected_deliverables'):
        event_brief_str += f"\nDeliverables: {event['expected_deliverables']}"
    if event.get('event_brief'):
        try:
            eb = event['event_brief'] if isinstance(event['event_brief'], dict) else json.loads(event['event_brief'])
            event_brief_str += f"\nSummary: {eb.get('summary', '')}"
        except Exception:
            pass

    # External Gemini generation call outside DB transaction
    try:
        case_studies = await generate_case_studies(
            event_title=event['title'],
            category=event['category'],
            event_brief=event_brief_str,
            rules=event.get('rules'),
            participant_skills=skills,
            preferred_roles=preferred_roles,
            experience_level=exp_level
        )
    except AIServiceError as err:
        execute(db, "UPDATE hackloop.assessment_submissions SET status='failed', error_message=:msg WHERE id=:id",
                id=new_sub['id'], msg=str(err))
        db.commit()
        raise HTTPException(status_code=503, detail=str(err))
    except Exception as exc:
        logger.error(f"Unexpected generation error: {exc}")
        execute(db, "UPDATE hackloop.assessment_submissions SET status='failed', error_message='AI generation encountered a provider issue' WHERE id=:id",
                id=new_sub['id'])
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to generate case study questions. Please try again.")

    # Persist context and questions in database
    selected_role = preferred_roles[0] if preferred_roles else 'Contributor'
    execute(db, '''INSERT INTO hackloop.personalized_assessment_contexts(
        submission_id, event_description_snapshot, skills_snapshot, experience_level,
        generator_model, prompt_version, generated_at, selected_role, event_version
      ) VALUES (
        :sid, :desc, :skills, :exp, :model, 'v2.0', now(), :role, :ev
      )''',
      sid=new_sub['id'], desc=event_brief_str, skills=json.dumps(skills), exp=exp_level,
      model=getattr(case_studies, '_model_used', settings.AI_MODEL), role=selected_role, ev=event.get('version', 1))

    created_questions = []
    for pos, q in enumerate(case_studies.questions, start=1):
        rubric_dict = q.rubric.model_dump()
        rubric_dict['expected_response_format'] = q.expected_response_format
        rubric_dict['target_role'] = q.target_role
        rubric_dict['target_skill'] = q.target_skill

        q_row = one(db, '''INSERT INTO hackloop.personalized_assessment_questions(
            submission_id, position, prompt, response_type, difficulty, rubric, max_score
          ) VALUES (
            :sid, :pos, :prompt, 'text', :diff, :rubric, 100.0
          ) RETURNING *''',
          sid=new_sub['id'], pos=pos, prompt=q.prompt, diff=q.difficulty,
          rubric=json.dumps(rubric_dict))
        created_questions.append(q_row)

    execute(db, "UPDATE hackloop.assessment_submissions SET status='ready', selected_role=:role, updated_at=now() WHERE id=:id",
            id=new_sub['id'], role=selected_role)
    db.commit()

    return {
        'submission_id': str(new_sub['id']),
        'attempt_number': attempt_num,
        'status': 'ready',
        'questions': [sanitize_question_for_client(q) for q in created_questions],
        'answers': {},
        'evaluation_score': None,
        'evaluation_summary': None,
        'evaluation_details': None
    }

@router.get('')
def get_assessment(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Retrieve the current assessment status, assigned questions, answer drafts, and evaluation."""
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot take participant assessments.')
    uid = user['id']
    get_event_and_registration(db, eid, uid)

    sub = one(db, '''SELECT * FROM hackloop.assessment_submissions 
      WHERE event_id=:eid AND user_id=:uid ORDER BY attempt_number DESC LIMIT 1''',
      eid=eid, uid=uid)

    if not sub:
        return {'status': 'not_started'}

    questions = rows(db, '''SELECT * FROM hackloop.personalized_assessment_questions 
      WHERE submission_id=:sid ORDER BY position''', sid=sub['id'])
    answers = rows(db, 'SELECT question_id, answer_text, is_draft, updated_at FROM hackloop.personalized_assessment_answers WHERE submission_id=:sid', sid=sub['id'])
    ans_map = {str(a['question_id']): a['answer_text'] for a in answers}

    return {
        'submission_id': str(sub['id']),
        'attempt_number': sub['attempt_number'],
        'status': sub['status'],
        'selected_role': sub.get('selected_role'),
        'questions': [sanitize_question_for_client(q) for q in questions],
        'answers': ans_map,
        'evaluation_score': sub.get('evaluation_score'),
        'evaluation_summary': sub.get('evaluation_summary'),
        'evaluation_details': sub.get('evaluation_details'),
        'error_message': sub.get('error_message')
    }

@router.put('/answers')
def save_answer_drafts(eid: UUID, body: SaveAnswersBody, user = Depends(current_user), db = Depends(get_db)):
    """Save in-progress answer drafts without submitting for evaluation."""
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot take participant assessments.')
    uid = user['id']
    sub = require(
        one(db, "SELECT * FROM hackloop.assessment_submissions WHERE event_id=:eid AND user_id=:uid ORDER BY attempt_number DESC LIMIT 1",
            eid=eid, uid=uid),
        404, 'Assessment attempt not found'
    )
    require(sub['status'] in ('ready', 'draft', 'failed'), 409, f"Cannot save drafts in '{sub['status']}' status")

    for ans in body.answers:
        q = one(db, 'SELECT 1 FROM hackloop.personalized_assessment_questions WHERE submission_id=:sid AND id=:qid',
                sid=sub['id'], qid=ans.question_id)
        if not q:
            continue
        
        cleaned = ans.answer_text.strip()
        if cleaned:
            execute(db, '''INSERT INTO hackloop.personalized_assessment_answers(submission_id, question_id, answer_text, is_draft, updated_at)
              VALUES(:sid, :qid, :text, true, now())
              ON CONFLICT (submission_id, question_id) DO UPDATE SET answer_text=:text, is_draft=true, updated_at=now()''',
              sid=sub['id'], qid=ans.question_id, text=cleaned)

    execute(db, "UPDATE hackloop.assessment_submissions SET status='draft', updated_at=now() WHERE id=:id AND status='ready'", id=sub['id'])
    db.commit()
    return {'status': 'saved'}

@router.post('/submit')
async def submit_assessment(eid: UUID, body: SubmitAssessmentBody, user = Depends(current_user), db = Depends(get_db)):
    """Submit written answers for AI evaluation. Validates answer completeness,
    persists answers, updates submission state to 'evaluating', and runs structured evaluation.
    """
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot take participant assessments.')
    uid = user['id']
    event, reg = get_event_and_registration(db, eid, uid)

    sub = require(
        one(db, "SELECT * FROM hackloop.assessment_submissions WHERE event_id=:eid AND user_id=:uid ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE",
            eid=eid, uid=uid),
        404, 'Assessment attempt not found'
    )
    require(sub['status'] in ('ready', 'draft', 'failed'), 409, f"Assessment cannot be submitted in '{sub['status']}' status")

    questions = rows(db, 'SELECT * FROM hackloop.personalized_assessment_questions WHERE submission_id=:sid ORDER BY position', sid=sub['id'])
    require(bool(questions), 400, 'Assessment questions have not been generated')

    # Validate all questions have answers
    answers_dict = {str(a.question_id): a.answer_text.strip() for a in body.answers}
    for q in questions:
        qid_str = str(q['id'])
        ans_text = answers_dict.get(qid_str, '')
        require(len(ans_text) >= 20, 422, f"Answer for Question {q['position']} must be at least 20 characters")

    # Persist final answers
    for q in questions:
        qid_str = str(q['id'])
        execute(db, '''INSERT INTO hackloop.personalized_assessment_answers(submission_id, question_id, answer_text, is_draft, updated_at)
          VALUES(:sid, :qid, :text, false, now())
          ON CONFLICT (submission_id, question_id) DO UPDATE SET answer_text=:text, is_draft=false, updated_at=now()''',
          sid=sub['id'], qid=q['id'], text=answers_dict[qid_str])

    # Mark submission as evaluating
    execute(db, "UPDATE hackloop.assessment_submissions SET status='evaluating', submitted_at=now(), updated_at=now() WHERE id=:id", id=sub['id'])
    db.commit()

    context = one(db, 'SELECT * FROM hackloop.personalized_assessment_contexts WHERE submission_id=:sid', sid=sub['id'])
    selected_role = (context.get('selected_role') if context else None) or sub.get('selected_role') or 'Contributor'
    exp_level = (context.get('experience_level') if context else None) or reg.get('experience_level') or 'intermediate'

    # Run AI evaluation outside DB transaction
    try:
        eval_result = await evaluate_answers(
            event_title=event['title'],
            category=event['category'],
            questions_with_rubrics=questions,
            answers_by_question_id=answers_dict,
            participant_level=exp_level,
            selected_role=selected_role
        )
    except AIServiceError as err:
        execute(db, "UPDATE hackloop.assessment_submissions SET status='failed', error_message=:msg WHERE id=:id",
                id=sub['id'], msg=str(err))
        db.commit()
        raise HTTPException(status_code=503, detail=str(err))
    except Exception as exc:
        logger.error(f"Unexpected evaluation error: {exc}")
        execute(db, "UPDATE hackloop.assessment_submissions SET status='failed', error_message='Evaluation failed during processing' WHERE id=:id",
                id=sub['id'])
        db.commit()
        raise HTTPException(status_code=500, detail="Evaluation processing failed. You may retry submission.")

    # Server-side score calculation and normalization
    # Compute normalized score strictly in backend code
    total_rubric_score = sum(c.score for c in eval_result.criterion_scores)
    max_rubric_score = sum(c.max_score for c in eval_result.criterion_scores) or 100.0
    normalized_score = round(min(100.0, max(0.0, (total_rubric_score / max_rubric_score) * 100.0)), 2)

    eval_details = eval_result.model_dump()
    eval_details['normalized_score'] = normalized_score

    # Save to hackloop.assessment_evaluations
    eval_row = one(db, '''INSERT INTO hackloop.assessment_evaluations(
        submission_id, evaluator_type, model_identifier, rubric_version, status,
        summary, completed_at, created_at, evaluation_details
      ) VALUES (
        :sid, 'ai', :model, 'v2.0', 'completed', :summary, now(), now(), :details
      ) RETURNING id''',
      sid=sub['id'], model=getattr(eval_result, '_model_used', settings.AI_MODEL),
      summary=eval_result.overall_explanation[:1000], details=json.dumps(eval_details))

    # Save skill scores in hackloop.evaluation_skill_scores
    for sk in eval_result.skill_estimates:
        execute(db, "INSERT INTO hackloop.skills(name, category) VALUES(:name, 'Technical') ON CONFLICT (lower(name)) DO NOTHING",
                name=sk.skill_name)
        s = one(db, 'SELECT id FROM hackloop.skills WHERE lower(name)=lower(:name)', name=sk.skill_name)
        if s:
            execute(db, '''INSERT INTO hackloop.evaluation_skill_scores(
                evaluation_id, skill_id, score, confidence, explanation
              ) VALUES (:eid, :sid, :score, :conf, :exp)''',
              eid=eval_row['id'], sid=s['id'], score=round(sk.score, 2),
              conf=round(sk.confidence, 3), exp=sk.evidence_summary)

    # Update submission status to completed
    execute(db, '''UPDATE hackloop.assessment_submissions SET 
      status='completed', 
      evaluation_score=:score,
      evaluation_summary=:summary,
      evaluation_details=:details,
      error_message=NULL,
      updated_at=now()
      WHERE id=:id''',
      id=sub['id'], score=normalized_score,
      summary=eval_result.overall_explanation, details=json.dumps(eval_details))

    db.commit()

    return {
        'status': 'completed',
        'evaluation_score': normalized_score,
        'evaluation_summary': eval_result.overall_explanation,
        'evaluation_details': eval_details
    }

@router.post('/retry')
def retry_assessment(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Allow participant to retry assessment (maximum 2 attempts per event)."""
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot take participant assessments.')
    uid = user['id']
    get_event_and_registration(db, eid, uid)

    prev = one(db, 'SELECT * FROM hackloop.assessment_submissions WHERE event_id=:eid AND user_id=:uid ORDER BY attempt_number DESC LIMIT 1',
               eid=eid, uid=uid)
    require(prev, 404, 'No previous assessment attempt found')
    require(prev['attempt_number'] < 2, 409, 'Maximum of 2 assessment attempts reached for this event')

    # Delete draft/incomplete questions from previous attempt if it was failed, or start clean attempt 2
    return {'status': 'retry_permitted', 'next_attempt': prev['attempt_number'] + 1}

