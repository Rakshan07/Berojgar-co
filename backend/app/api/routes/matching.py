import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.matching_service import MatchingService
from backend.app.schemas.matching import (
    MatchingRunCreate,
    MatchingRunResponse,
    ProposedTeamResponse,
    ProposedMemberResponse,
    MatchExplanationResponse,
    IntakeQuestionsRequest,
    IntakeQuestionsResponse,
    IntakeQuestion,
    IntakeOption,
    CalculateCompatibilityRequest,
    CalculateCompatibilityResponse,
    TeamCompatibilityItem,
)
from backend.app.schemas.team import TeamResponse, TeamMemberResponse
from backend.app.api.dependencies import get_current_user, require_role
from backend.app.models.auth import User

router = APIRouter(tags=["Matching Engine"])

def map_matching_run_response(run) -> MatchingRunResponse:
    proposed_teams = []
    for pt in run.proposed_teams:
        members = [
            ProposedMemberResponse(
                id=m.id,
                user_id=m.user_id,
                name=m.user.full_name if m.user else None,
                suggested_role=m.suggested_role,
                is_approved=m.is_approved,
                rejection_reason=m.rejection_reason
            )
            for m in pt.members
        ]
        explanation = None
        if pt.explanation:
            explanation = MatchExplanationResponse(
                requirements_covered=pt.explanation.requirements_covered,
                partial_covered=pt.explanation.partial_covered,
                missing_capabilities=pt.explanation.missing_capabilities,
                member_contributions=pt.explanation.member_contributions,
                coverage_notes=pt.explanation.coverage_notes,
                match_reasons=pt.explanation.match_reasons,
                unassigned_participants=pt.explanation.unassigned_participants
            )
        proposed_teams.append(
            ProposedTeamResponse(
                id=pt.id,
                matching_run_id=pt.matching_run_id,
                event_id=pt.event_id,
                team_name=pt.team_name,
                status=pt.status,
                coverage_score=float(pt.coverage_score or 0),
                members=members,
                explanation=explanation,
                team_size_gap=False,
                created_at=pt.created_at
            )
        )

    return MatchingRunResponse(
        id=run.id,
        event_id=run.event_id,
        initiated_by=run.initiated_by,
        algorithm_version=run.algorithm_version,
        status=run.status,
        config_snapshot=run.config_snapshot or {},
        summary=run.summary or {},
        proposed_teams=proposed_teams,
        created_at=run.created_at,
        completed_at=run.completed_at
    )

@router.post("/events/{event_id}/matching-runs", response_model=MatchingRunResponse, status_code=status.HTTP_201_CREATED)
def trigger_matching_run(
    event_id: uuid.UUID,
    req: MatchingRunCreate,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = MatchingService(db)
        run = service.execute_matching_run(event_id, current_user.id, req)
        return map_matching_run_response(run)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/events/{event_id}/matching-runs", response_model=List[MatchingRunResponse])
def list_matching_runs_for_event(
    event_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    service = MatchingService(db)
    runs = service.list_matching_runs(event_id)
    return [map_matching_run_response(service.get_matching_run(r.id)) for r in runs]

@router.get("/matching-runs/{run_id}", response_model=MatchingRunResponse)
def get_matching_run_detail(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = MatchingService(db)
    run = service.get_matching_run(run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matching run not found")
    return map_matching_run_response(run)

@router.post("/matching-runs/{run_id}/approve", response_model=List[TeamResponse])
def approve_matching_run(
    run_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = MatchingService(db)
        teams = service.approve_matching_run(run_id, current_user.id)
        res = []
        for t in teams:
            members = [
                TeamMemberResponse(
                    membership_id=m.id,
                    user_id=m.user_id,
                    name=m.user.full_name if m.user else "",
                    role=m.role,
                    status=m.status,
                    skills=[],
                    joined_at=m.joined_at,
                    departed_at=m.departed_at,
                    departure_reason=m.departure_reason
                )
                for m in t.memberships
            ]
            res.append(TeamResponse(
                id=t.id,
                event_id=t.event_id,
                name=t.name,
                status=t.status,
                matching_run_id=t.matching_run_id,
                members=members,
                created_at=t.created_at,
                published_at=t.published_at
            ))
        return res
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/matching-runs/{run_id}/reject", response_model=MatchingRunResponse)
def reject_matching_run(
    run_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = MatchingService(db)
        run = service.reject_matching_run(run_id, current_user.id)
        return map_matching_run_response(run)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/events/{event_id}/intake-questions", response_model=IntakeQuestionsResponse)
def get_event_intake_questions(
    event_id: uuid.UUID,
    req: IntakeQuestionsRequest,
    db: Session = Depends(get_db)
):
    """Generates non-technical contribution questions based on participant skills and 1-3 personality questions."""
    skill_names = [s.get("name", "").lower() for s in req.user_skills]
    skill_questions = []

    # Frontend focus
    if any("react" in s or "vue" in s or "front" in s or "css" in s for s in skill_names):
        skill_questions.append(
            IntakeQuestion(
                id="q_skill_frontend",
                type="skill_focus",
                title="In frontend and UI development, what part of the build do you enjoy driving most?",
                subtitle="Focus on your contribution style — non-technical.",
                options=[
                    IntakeOption(id="rapid_ui", label="Rapid UI layout & styling", desc="Translating wireframes into responsive, polished components quickly"),
                    IntakeOption(id="state_data", label="State & API integration", desc="Wiring data flows, client state, and backend endpoints"),
                    IntakeOption(id="design_sys", label="Design systems & micro-interactions", desc="Component libraries, tokens, and UX polish"),
                ]
            )
        )

    # Backend focus
    if any("python" in s or "node" in s or "back" in s or "fastapi" in s or "sql" in s for s in skill_names):
        skill_questions.append(
            IntakeQuestion(
                id="q_skill_backend",
                type="skill_focus",
                title="When working on backend deliverables, where do you spend most of your energy?",
                subtitle="Focus on your contribution style — non-technical.",
                options=[
                    IntakeOption(id="core_api", label="REST/GraphQL API endpoints", desc="Designing clean contracts, input validation, and business logic"),
                    IntakeOption(id="db_modeling", label="Data modeling & query design", desc="Database schemas, relations, migrations, and performance"),
                    IntakeOption(id="integrations", label="Third-party integrations & pipelines", desc="Auth, background workers, webhooks, and cloud infrastructure"),
                ]
            )
        )

    # Fallback if fewer than 2
    if len(skill_questions) < 2:
        skill_questions.append(
            IntakeQuestion(
                id="q_skill_general",
                type="skill_focus",
                title="What type of hands-on contribution energizes you most during a team sprint?",
                subtitle="Focus on your contribution style — non-technical.",
                options=[
                    IntakeOption(id="feature_ship", label="Shipping core user features", desc="Delivering functional, testable milestones from start to finish"),
                    IntakeOption(id="architecture", label="Systems connection & glue logic", desc="Connecting frontend to backend, setting up configs, and debugging"),
                    IntakeOption(id="product_polish", label="User experience & presentation polish", desc="Sharpening the pitch, user onboarding, and demo flow"),
                ]
            )
        )

    # 1 to 3 Personality / Collaboration questions
    personality_questions = [
        IntakeQuestion(
            id="p_comm",
            type="personality",
            title="Communication & Working Rhythm",
            subtitle="How do you naturally collaborate best with your teammates during active hours?",
            options=[
                IntakeOption(id="async", label="Async-First Builder", desc="Deep solo focus blocks with frequent written updates"),
                IntakeOption(id="cadence", label="Structured Syncs", desc="Quick morning & afternoon standups, then autonomous execution"),
                IntakeOption(id="pairing", label="Live Pairing & Huddles", desc="Continuous voice room open, active screensharing and brainstorming"),
            ]
        ),
        IntakeQuestion(
            id="p_crunch",
            type="personality",
            title="Blocker & Crunch Handling",
            subtitle="When facing an unexpected roadblock or a tight deadline, what is your instinct?",
            options=[
                IntakeOption(id="scope_down", label="Pragmatic Scope-Down", desc="Aggressively trim secondary features to guarantee a polished core MVP"),
                IntakeOption(id="swarm", label="Team Swarm", desc="Rally the whole team into a quick huddle to brainstorm and crack it together"),
                IntakeOption(id="workaround", label="Fast Pivot / Workaround", desc="Immediately substitute with a proven library or simplified approach"),
            ]
        ),
        IntakeQuestion(
            id="p_ambition",
            type="personality",
            title="Event Ambition & Mindset",
            subtitle="What is your primary personal motivation for joining this event?",
            options=[
                IntakeOption(id="podium", label="Competitive Podium Finish", desc="Aiming to build a standout winner, polish the presentation, and win"),
                IntakeOption(id="learning", label="Skill Expansion & Tech Experimentation", desc="Trying new frameworks, expanding capabilities, and taking creative risks"),
                IntakeOption(id="community", label="Peer Connection & Collaborative Fun", desc="Meeting great builders, having fun, and shipping a cool project together"),
            ]
        ),
    ]

    return IntakeQuestionsResponse(
        skill_questions=skill_questions[:2],
        personality_questions=personality_questions
    )


@router.post("/events/{event_id}/calculate-compatibility", response_model=CalculateCompatibilityResponse)
def calculate_event_team_compatibility(
    event_id: uuid.UUID,
    req: CalculateCompatibilityRequest,
    db: Session = Depends(get_db)
):
    """Calculates explainable 4-factor compatibility for candidate teams with role-need matching and full-stack flex."""
    results = []
    user_skill_names = [s.get("name", "").lower() for s in req.user_skills]
    user_categories = [s.get("category", "").lower() for s in req.user_skills]
    user_preferred_roles = [r.lower() for r in (req.preferred_roles or [])]

    user_has_frontend = any("front" in s or "react" in s or "vue" in s or "ui" in s for s in user_skill_names) or "frontend" in user_categories
    user_has_backend = any("back" in s or "python" in s or "node" in s or "fastapi" in s or "sql" in s for s in user_skill_names) or "backend" in user_categories
    is_fullstack = (user_has_frontend and user_has_backend) or any("full" in r or "stack" in r for r in user_preferred_roles)

    user_comm = req.answers.get("p_comm", "cadence")
    user_ambition = req.answers.get("p_ambition", "podium")

    for team in req.teams:
        team_id = str(team.get("id", ""))
        team_name = team.get("name", "Unnamed Team")
        members = team.get("members", [])
        member_roles = [m.get("role", "").lower() for m in members]

        spots_left = max(0, 5 - len(members))
        is_full = spots_left == 0

        team_has_frontend = any("front" in r or "react" in r or "ui lead" in r for r in member_roles)
        team_has_backend = any("back" in r or "python" in r or "backend lead" in r for r in member_roles)

        need_bonus = 0
        redundancy_penalty = 0
        role_overlap_warning = None
        proposed_role = "Contributor"

        if is_fullstack:
            if not team_has_frontend and team_has_backend:
                proposed_role = "Frontend Lead / UI Architect (Full-Stack Flex)"
                need_bonus += 36
            elif not team_has_backend and team_has_frontend:
                proposed_role = "Backend Lead / API Architect (Full-Stack Flex)"
                need_bonus += 36
            elif not team_has_frontend and not team_has_backend:
                proposed_role = "Lead Full-Stack Architect"
                need_bonus += 40
            else:
                proposed_role = "Systems Integrator & DevOps"
                redundancy_penalty += 16
                role_overlap_warning = "Team already has dedicated Frontend and Backend leads."
        elif user_has_frontend and not user_has_backend:
            if not team_has_frontend:
                proposed_role = "Frontend Lead"
                need_bonus += 38
            else:
                proposed_role = "Secondary Frontend Support"
                redundancy_penalty += 32
                role_overlap_warning = "Role Overlap: Team already has a Frontend Lead. Joining duplicates existing UI ownership."
        elif user_has_backend and not user_has_frontend:
            if not team_has_backend:
                proposed_role = "Backend Lead"
                need_bonus += 38
            else:
                proposed_role = "Secondary Backend Support"
                redundancy_penalty += 32
                role_overlap_warning = "Role Overlap: Team already has a Backend Lead. Joining duplicates backend ownership."
        else:
            proposed_role = "Technical Contributor"
            need_bonus += 15

        skill_score = max(5, min(40, 15 + need_bonus - redundancy_penalty))
        comm_score = 25 if user_comm in ["async", "cadence"] else 20
        ambition_score = 18 if user_ambition == "podium" else 15
        capacity_score = 10 if spots_left > 0 else 0

        overall = skill_score + comm_score + ambition_score + capacity_score
        if is_full:
            overall = min(40, overall)
        if role_overlap_warning:
            overall = min(60, overall)
        overall = max(25, min(98, overall))

        tier = "Top Synergy · Critical Need" if overall >= 90 else "High Compatibility" if overall >= 78 else "Moderate Match" if overall >= 65 else "Role Overlap / Low Need"

        highlights = []
        if role_overlap_warning:
            highlights.append(role_overlap_warning)
        else:
            highlights.append(f"Direct Need Match: Fills this team's empty {proposed_role} requirement")

        if is_fullstack and not role_overlap_warning:
            highlights.append("Bridges technical communication across UI, API, and database workflows")

        highlights.append(f"Aligned on {user_comm} collaboration cadence")

        results.append(
            TeamCompatibilityItem(
                team_id=team_id,
                team_name=team_name,
                overall_score=overall,
                synergy_tier=tier,
                proposed_role=proposed_role,
                spots_left=spots_left,
                is_full=is_full,
                highlights=highlights
            )
        )

    # Sort descending by compatibility
    results.sort(key=lambda x: x.overall_score, reverse=True)
    return CalculateCompatibilityResponse(compatible_teams=results)
