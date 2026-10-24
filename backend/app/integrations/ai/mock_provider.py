from typing import Dict, Any, List
from backend.app.integrations.ai.base import BaseAIProvider, AISetupOutput
from backend.app.schemas.ai_setup import AISuggestedRole, AISuggestedRequirement, AISuggestedQuestion

class MockAIProvider(BaseAIProvider):
    """Deterministic, high-fidelity AI provider for local testing, demo, and fallback."""

    async def generate_event_setup(
        self,
        event_title: str,
        category: str,
        description: str,
        constraints: Dict[str, Any],
        known_skills: List[str]
    ) -> AISetupOutput:
        cat_lower = category.lower()

        if "debate" in cat_lower:
            roles = [
                AISuggestedRole(name="Lead Speaker", description="Opens arguments and defines team trajectory", suggested_count=1),
                AISuggestedRole(name="Research Lead", description="Synthesizes factual precedents and evidence cards", suggested_count=1),
                AISuggestedRole(name="Rebuttal Specialist", description="Dissects opposing reasoning and defends motion", suggested_count=1),
                AISuggestedRole(name="Whip Speaker", description="Delivers crystallization speech and summarizes clashes", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Argumentation", category="Debate", required=True, min_proficiency=3, target_count=2, priority=1),
                AISuggestedRequirement(skill_name="Research & Analysis", category="Research", required=True, min_proficiency=2, target_count=2, priority=2),
                AISuggestedRequirement(skill_name="Presentation", category="Soft Skills", required=True, min_proficiency=3, target_count=4, priority=1),
                AISuggestedRequirement(skill_name="Rebuttal", category="Debate", required=False, min_proficiency=2, target_count=2, priority=3),
                AISuggestedRequirement(skill_name="Communication", category="Soft Skills", required=False, min_proficiency=2, target_count=2, priority=3),
            ]
            questions = [
                AISuggestedQuestion(question_text="Describe a time when you successfully defended a nuanced motion under time pressure.", skill_target="Argumentation", rubric_guidelines="Look for structured logic and clarity under pressure."),
                AISuggestedQuestion(question_text="What is your methodology for quickly evaluating opposing evidence reliability?", skill_target="Research & Analysis", rubric_guidelines="Verifies source validation and critical thinking."),
            ]
            explanation = "Debate competitions require balanced speaker pairs capable of rapid rebuttal, fact synthesis, and structured closing arguments."

        elif "research" in cat_lower:
            roles = [
                AISuggestedRole(name="Research Lead", description="Designs research methodology and thesis formulation", suggested_count=1),
                AISuggestedRole(name="Data Analyst", description="Runs exploratory analysis and quantitative models", suggested_count=1),
                AISuggestedRole(name="Technical Implementer", description="Implements computational pipelines and benchmarks", suggested_count=1),
                AISuggestedRole(name="Academic Writer", description="Drafts documentation and manuscript sections", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Research & Analysis", category="Research", required=True, min_proficiency=3, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Academic Writing", category="Research", required=True, min_proficiency=2, target_count=1, priority=2),
                AISuggestedRequirement(skill_name="Python", category="Backend", required=True, min_proficiency=2, target_count=2, priority=1),
                AISuggestedRequirement(skill_name="Literature Review", category="Research", required=False, min_proficiency=2, target_count=1, priority=3),
                AISuggestedRequirement(skill_name="Data Visualization", category="Data", required=False, min_proficiency=2, target_count=1, priority=3),
            ]
            questions = [
                AISuggestedQuestion(question_text="Describe your experience with formal literature reviews and data synthesis.", skill_target="Research & Analysis", rubric_guidelines="Checks rigor, citation handling, and reproducibility awareness."),
                AISuggestedQuestion(question_text="What Python data analysis libraries do you use most frequently and why?", skill_target="Python", rubric_guidelines="Evaluates familiarity with pandas, numpy, and scientific packages."),
            ]
            explanation = "Research sprints thrive when analytical rigor in Python is paired with disciplined documentation and academic writing."

        elif "creative" in cat_lower:
            roles = [
                AISuggestedRole(name="Creative Director", description="Maintains narrative arc and aesthetic cohesion", suggested_count=1),
                AISuggestedRole(name="Visual Designer", description="Executes branding, typography, and layout assets", suggested_count=1),
                AISuggestedRole(name="Storyteller / Copywriter", description="Authors voice, messaging, and campaign scripts", suggested_count=1),
                AISuggestedRole(name="Video Producer", description="Edits motion assets and final audiovisual deliverables", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Branding", category="Design", required=True, min_proficiency=3, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Storytelling", category="Creative", required=True, min_proficiency=2, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Video Production", category="Creative", required=True, min_proficiency=2, target_count=1, priority=2),
                AISuggestedRequirement(skill_name="UX Design", category="Design", required=False, min_proficiency=1, target_count=1, priority=3),
                AISuggestedRequirement(skill_name="Motion Design", category="Design", required=False, min_proficiency=2, target_count=1, priority=3),
            ]
            questions = [
                AISuggestedQuestion(question_text="Share a creative project where you balanced strong visual style with clear storytelling.", skill_target="Storytelling", rubric_guidelines="Checks narrative coherence and aesthetic alignment."),
            ]
            explanation = "Creative sprints necessitate multidisciplinary visual communication, coupling narrative writing with high-polish motion and graphic design."

        else: # Default: Hackathon / Technical / Academic
            roles = [
                AISuggestedRole(name="Frontend Lead", description="Architects UI components, layout, and client-side interactions", suggested_count=1),
                AISuggestedRole(name="Backend Lead", description="Designs APIs, data models, and services", suggested_count=1),
                AISuggestedRole(name="UI/UX Designer", description="Produces user flows, wireframes, and design system tokens", suggested_count=1),
                AISuggestedRole(name="Team Coordinator", description="Keeps team synchronized and manages submission timeline", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Frontend Development", category="Technical", required=True, min_proficiency=2, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Backend Development", category="Technical", required=True, min_proficiency=2, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="UX Design", category="Design", required=True, min_proficiency=2, target_count=1, priority=2),
                AISuggestedRequirement(skill_name="Project Management", category="Management", required=False, min_proficiency=1, target_count=1, priority=3),
                AISuggestedRequirement(skill_name="SQL", category="Data", required=False, min_proficiency=1, target_count=1, priority=3),
            ]
            questions = [
                AISuggestedQuestion(question_text="Describe a full-stack project or rapid prototype you helped build from concept to deployment.", skill_target="Full-Stack", rubric_guidelines="Identifies practical development experience, trade-off awareness, and execution velocity."),
                AISuggestedQuestion(question_text="How do you coordinate with team members when integrating frontend components with backend APIs?", skill_target="Collaboration", rubric_guidelines="Highlights communication habits and error-handling agreements."),
            ]
            explanation = "A balanced technical team pairs reliable frontend and backend execution with dedicated product design to deliver a complete, cohesive prototype."

        return AISetupOutput(
            suggested_roles=roles,
            suggested_requirements=reqs,
            suggested_questions=questions,
            explanation=explanation
        )
