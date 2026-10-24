from typing import Dict, Any, List, Optional
from backend.app.integrations.ai.base import BaseAIProvider, AISetupOutput
from backend.app.schemas.ai_setup import (
    AISuggestedRole,
    AISuggestedRequirement,
    AISuggestedQuestion,
    ProfileEvidenceExtractionResponse,
    ExtractedSkillEvidence
)

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
                AISuggestedRole(name="Lead Speaker", description="Opens arguments and defines overall team case trajectory", suggested_count=1),
                AISuggestedRole(name="Research & Evidence Lead", description="Synthesizes factual precedents, statistics, and counter-evidence", suggested_count=1),
                AISuggestedRole(name="Rebuttal Specialist", description="Dissects opposing reasoning, identifies logical fallacies, and defends motions", suggested_count=1),
                AISuggestedRole(name="Whip Speaker", description="Delivers crystallization speech and summarizes core clashes", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Argumentation", category="Debate", required=True, min_proficiency=3, target_count=2, priority=1),
                AISuggestedRequirement(skill_name="Research & Analysis", category="Research", required=True, min_proficiency=2, target_count=2, priority=2),
                AISuggestedRequirement(skill_name="Presentation", category="Soft Skills", required=True, min_proficiency=3, target_count=2, priority=1),
                AISuggestedRequirement(skill_name="Rebuttal", category="Debate", required=False, min_proficiency=2, target_count=2, priority=3),
                AISuggestedRequirement(skill_name="Critical Thinking", category="Soft Skills", required=False, min_proficiency=2, target_count=2, priority=3),
            ]
            questions = [
                AISuggestedQuestion(
                    question_text="What is your practical experience level in structured parliamentary or policy debate?",
                    skill_target="Argumentation",
                    question_type="multiple_choice",
                    options=[
                        "Seasoned debater (won regional/national tournaments)",
                        "Active debater (participated in 3+ inter-collegiate rounds)",
                        "Intermediate (class or club debate experience)",
                        "Novice / Enthusiastic beginner"
                    ],
                    category="practical_experience",
                    rubric_guidelines="Assesses competitive debate history and baseline speech confidence."
                ),
                AISuggestedQuestion(
                    question_text="Which debate role and contribution style best fits your strengths?",
                    skill_target="Role Preference",
                    question_type="multiple_choice",
                    options=[
                        "Opening speaker (framing motions, establishing definitions)",
                        "Rebuttal / Clash speaker (deconstructing opponent points)",
                        "Whip speaker (synthesizing clashes and delivering final summary)",
                        "Research & Evidence specialist (building data-backed briefing cards)"
                    ],
                    category="role_preference",
                    rubric_guidelines="Maps speaker positioning within parliamentary team structure."
                ),
                AISuggestedQuestion(
                    question_text="How do you handle rapid case prep under strict 15-minute preparation limits?",
                    skill_target="Collaboration",
                    question_type="multiple_choice",
                    options=[
                        "Divide and conquer: assign distinct points to each speaker",
                        "Collaborative brainstorm: synthesize one strong narrative together",
                        "Evidence-first: rapidly look up precedents before speech structure"
                    ],
                    category="collaboration_style",
                    rubric_guidelines="Identifies team prep synchronization and high-pressure coordination."
                ),
                AISuggestedQuestion(
                    question_text="What is your availability for team practice debates before the tournament?",
                    skill_target="Availability",
                    question_type="multiple_choice",
                    options=[
                        "High: 10+ hours/week including evenings and weekend mocks",
                        "Moderate: 5-8 hours/week with flexible practice windows",
                        "Limited: 2-4 hours/week focused purely on round prep"
                    ],
                    category="problem_solving_commitment",
                    rubric_guidelines="Ensures schedule compatibility for mock round coordination."
                ),
            ]
            explanation = "Debate competitions require balanced speaker pairs capable of rapid rebuttal, fact synthesis, and structured closing arguments."

        elif "research" in cat_lower or "academic" in cat_lower:
            roles = [
                AISuggestedRole(name="Research Lead", description="Formulates hypotheses, designs methodology, and oversees rigor", suggested_count=1),
                AISuggestedRole(name="Data & Quantitative Analyst", description="Runs statistical modeling, data cleaning, and computational pipelines", suggested_count=1),
                AISuggestedRole(name="Literature Reviewer", description="Synthesizes prior work, benchmarks state of the art, and cites precedents", suggested_count=1),
                AISuggestedRole(name="Academic Writer", description="Drafts clear abstracts, methodology sections, and final manuscript", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Research & Analysis", category="Research", required=True, min_proficiency=3, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Academic Writing", category="Research", required=True, min_proficiency=2, target_count=1, priority=2),
                AISuggestedRequirement(skill_name="Python", category="Backend", required=True, min_proficiency=2, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Literature Review", category="Research", required=False, min_proficiency=2, target_count=1, priority=3),
                AISuggestedRequirement(skill_name="Data Visualization", category="Data", required=False, min_proficiency=2, target_count=1, priority=3),
            ]
            questions = [
                AISuggestedQuestion(
                    question_text="Which tools and methods do you most comfortably use for empirical data analysis?",
                    skill_target="Data Analysis",
                    question_type="multiple_choice",
                    options=[
                        "Python (pandas, numpy, scipy, scikit-learn)",
                        "R / RStudio (tidyverse, ggplot2, stats models)",
                        "SQL & database querying with BI visualization",
                        "Qualitative synthesis and structured literature review"
                    ],
                    category="practical_experience",
                    rubric_guidelines="Checks quantitative analysis stack."
                ),
                AISuggestedQuestion(
                    question_text="What primary contribution do you want to provide for the research deliverable?",
                    skill_target="Role Preference",
                    question_type="multiple_choice",
                    options=[
                        "Core methodology & experimental pipeline implementation",
                        "Literature review and conceptual framework synthesis",
                        "Statistical evaluation and benchmark visualization",
                        "Drafting and polishing the academic manuscript"
                    ],
                    category="role_preference",
                    rubric_guidelines="Ensures complementary research responsibilities."
                ),
                AISuggestedQuestion(
                    question_text="How do you prefer tracking progress and sharing research notes?",
                    skill_target="Collaboration",
                    question_type="multiple_choice",
                    options=[
                        "Shared Notion / Overleaf docs with weekly async reviews",
                        "Active GitHub repository with Jupyter notebooks and PRs",
                        "Daily synchronous 15-minute sync calls"
                    ],
                    category="collaboration_style",
                    rubric_guidelines="Avoids tooling mismatch in team workflows."
                ),
                AISuggestedQuestion(
                    question_text="What is your estimated weekly time commitment for this research sprint?",
                    skill_target="Availability",
                    question_type="multiple_choice",
                    options=[
                        "15+ hours/week (primary project focus)",
                        "8-12 hours/week (consistent dedicated blocks)",
                        "4-7 hours/week (contributing in defined subtasks)"
                    ],
                    category="problem_solving_commitment",
                    rubric_guidelines="Aligns research velocity expectations."
                ),
            ]
            explanation = "Research sprints thrive when analytical rigor and coding are paired with disciplined documentation and academic writing."

        elif "creative" in cat_lower or "design" in cat_lower:
            roles = [
                AISuggestedRole(name="Creative Director", description="Maintains narrative arc, artistic vision, and aesthetic cohesion", suggested_count=1),
                AISuggestedRole(name="Visual & UI Designer", description="Executes branding, color tokens, layout, and graphic assets", suggested_count=1),
                AISuggestedRole(name="Copywriter & Storyteller", description="Authors narrative scripts, brand messaging, and campaign copy", suggested_count=1),
                AISuggestedRole(name="Motion & Media Producer", description="Edits video, motion graphics, or sound design deliverables", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Branding", category="Design", required=True, min_proficiency=3, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Storytelling", category="Creative", required=True, min_proficiency=2, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="UX Design", category="Design", required=False, min_proficiency=2, target_count=1, priority=2),
                AISuggestedRequirement(skill_name="Video Production", category="Creative", required=False, min_proficiency=2, target_count=1, priority=3),
                AISuggestedRequirement(skill_name="Typography", category="Design", required=False, min_proficiency=2, target_count=1, priority=3),
            ]
            questions = [
                AISuggestedQuestion(
                    question_text="What is your primary creative medium and software toolkit?",
                    skill_target="Creative Tools",
                    question_type="multiple_choice",
                    options=[
                        "Figma & vector design (branding, UI, layout systems)",
                        "After Effects / Premiere (motion graphics, video editing)",
                        "Copywriting & narrative script development",
                        "3D modeling / WebGL / creative generative media"
                    ],
                    category="practical_experience",
                    rubric_guidelines="Maps candidate artistic discipline."
                ),
                AISuggestedQuestion(
                    question_text="What role do you gravitate toward in creative group projects?",
                    skill_target="Role Preference",
                    question_type="multiple_choice",
                    options=[
                        "Creative Lead (driving concept, vision, and critique)",
                        "Hands-on Crafter (polishing visuals, assets, and details)",
                        "Storyteller (writing compelling narrative arc)",
                        "Integrator (assembling audio, visuals, and interactive demos)"
                    ],
                    category="role_preference",
                    rubric_guidelines="Pairs vision drivers with asset implementers."
                ),
                AISuggestedQuestion(
                    question_text="How do you prefer giving and receiving creative feedback?",
                    skill_target="Collaboration",
                    question_type="multiple_choice",
                    options=[
                        "Direct, candid iterations in shared Figma/Miro boards",
                        "Scheduled design reviews with structured rubric criteria",
                        "Async written notes with annotated screenshots"
                    ],
                    category="collaboration_style",
                    rubric_guidelines="Ensures constructive team critique dynamic."
                ),
                AISuggestedQuestion(
                    question_text="What is your time availability for design reviews and production crunch?",
                    skill_target="Commitment",
                    question_type="multiple_choice",
                    options=[
                        "High: Available for evening creative sprints and final polish",
                        "Moderate: Scheduled 5-10 hours with predictable milestones",
                        "Flexible weekend bursts"
                    ],
                    category="problem_solving_commitment",
                    rubric_guidelines="Ensures delivery readiness before final deadline."
                ),
            ]
            explanation = "Creative sprints necessitate multidisciplinary visual communication, coupling narrative writing with high-polish motion and graphic design."

        else:  # Default: Hackathon / Technical / College Project / Startup
            roles = [
                AISuggestedRole(name="Frontend Lead", description="Architects UI components, layout responsiveness, and client-side interactions", suggested_count=1),
                AISuggestedRole(name="Backend / API Lead", description="Designs data models, database queries, and secure API endpoints", suggested_count=1),
                AISuggestedRole(name="UI/UX Designer", description="Produces user flows, wireframes, and design system tokens", suggested_count=1),
                AISuggestedRole(name="Product & Pitch Lead", description="Refines value proposition, pitch deck, and coordinates milestone delivery", suggested_count=1),
            ]
            reqs = [
                AISuggestedRequirement(skill_name="Frontend Development", category="Technical", required=True, min_proficiency=2, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="Backend Development", category="Technical", required=True, min_proficiency=2, target_count=1, priority=1),
                AISuggestedRequirement(skill_name="UX Design", category="Design", required=True, min_proficiency=2, target_count=1, priority=2),
                AISuggestedRequirement(skill_name="Project Management", category="Management", required=False, min_proficiency=1, target_count=1, priority=3),
                AISuggestedRequirement(skill_name="SQL", category="Data", required=False, min_proficiency=1, target_count=1, priority=3),
            ]
            questions = [
                AISuggestedQuestion(
                    question_text="What technical domain do you feel most confident shipping production code in?",
                    skill_target="Technical Focus",
                    question_type="multiple_choice",
                    options=[
                        "Frontend UI (React, Vite, Vue, Tailwind, responsive CSS)",
                        "Backend Services (Python, FastAPI, Node.js, SQL databases)",
                        "AI / ML integration (LLM APIs, PyTorch, data engineering)",
                        "Full-stack generalist (connecting client, server, and deployment)"
                    ],
                    category="practical_experience",
                    rubric_guidelines="Identifies primary technical anchor."
                ),
                AISuggestedQuestion(
                    question_text="What type of team responsibility do you want to lead during the hackathon?",
                    skill_target="Role Preference",
                    question_type="multiple_choice",
                    options=[
                        "System Architecture & API engineering",
                        "Polished User Experience & UI interaction craft",
                        "Product Strategy, User Research & Presentation Pitch",
                        "End-to-end glue engineer (integrations, testing, deployment)"
                    ],
                    category="role_preference",
                    rubric_guidelines="Distributes ownership and prevents duplicate leads."
                ),
                AISuggestedQuestion(
                    question_text="What is your preferred working rhythm during rapid development?",
                    skill_target="Collaboration",
                    question_type="multiple_choice",
                    options=[
                        "Constant active Discord / voice channel presence during hacking blocks",
                        "Async Git-first rhythm (issue tickets, pull requests, clear handoffs)",
                        "Hybrid: 2 quick daily standups with focused solo execution blocks"
                    ],
                    category="collaboration_style",
                    rubric_guidelines="Matches communication cadence to avoid team friction."
                ),
                AISuggestedQuestion(
                    question_text="What is your target time availability during this event?",
                    skill_target="Availability",
                    question_type="multiple_choice",
                    options=[
                        "All-in: 25+ hours over the hackathon weekend",
                        "Dedicated: 15-20 hours with scheduled breaks",
                        "Focused contributor: 8-12 hours targeting specific modules"
                    ],
                    category="problem_solving_commitment",
                    rubric_guidelines="Ensures realistic commitment alignment."
                ),
            ]
            explanation = "A balanced technical team pairs reliable frontend and backend execution with dedicated product design to deliver a complete, cohesive prototype."

        return AISetupOutput(
            suggested_roles=roles,
            suggested_requirements=reqs,
            suggested_questions=questions,
            explanation=explanation
        )

    async def analyze_profile_evidence(
        self,
        content: Optional[str] = None,
        source_type: str = "resume",
        candidate_name: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        mime_type: Optional[str] = None
    ) -> ProfileEvidenceExtractionResponse:
        """Deterministic domain extraction matching resume/document content or file bytes."""
        text_content = content or ""
        
        # If PDF file uploaded, extract text using pypdf
        if file_bytes and mime_type == "application/pdf":
            try:
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                extracted_pages = [page.extract_text() or "" for page in reader.pages]
                text_content = "\n".join(extracted_pages)
            except Exception as e:
                text_content = f"Uploaded PDF resume for {candidate_name or 'Candidate'} with software engineering experience."
        elif file_bytes and (mime_type or "").startswith("image/"):
            # Image resume
            text_content = f"Image resume document for {candidate_name or 'Candidate'} featuring Full-stack engineering, React, Python, and UI Design."

        content_lower = text_content.lower()
        skills = []


        skill_map = [
            ("Python", "Backend", ["python", "django", "fastapi", "flask"], 3, 0.9, True),
            ("React", "Frontend", ["react", "redux", "next.js", "jsx"], 3, 0.85, True),
            ("PostgreSQL", "Data", ["postgres", "postgresql", "sql", "psycopg"], 3, 0.8, True),
            ("TypeScript", "Frontend", ["typescript", "ts"], 2, 0.75, False),
            ("Tailwind CSS", "Frontend", ["tailwind", "tailwindcss"], 3, 0.8, False),
            ("Docker", "DevOps", ["docker", "container", "dockerfile"], 2, 0.7, False),
            ("Figma", "Design", ["figma", "wireframe", "prototype"], 3, 0.85, True),
            ("Machine Learning", "AI", ["pytorch", "tensorflow", "scikit-learn", "nlp", "llm"], 3, 0.8, True),
        ]

        for name, cat, keywords, prof, conf, verified in skill_map:
            for kw in keywords:
                if kw in content_lower:
                    idx = content_lower.find(kw)
                    snippet = text_content[max(0, idx - 30):min(len(text_content), idx + 80)].strip().replace("\n", " ")
                    prof_map = {1: "Exploring", 2: "Developing", 3: "Independent", 4: "Advanced / Mentor"}
                    skills.append(ExtractedSkillEvidence(
                        skill_name=name,
                        category=cat,
                        evidence_snippet=f"...{snippet}...",
                        estimated_proficiency=prof,
                        proficiency_label=prof_map.get(prof, "Developing"),
                        confidence=conf,
                        is_verified=verified,
                        source_reference=f"{source_type.capitalize()} analysis"
                    ))
                    break

        if not skills:
            skills.append(ExtractedSkillEvidence(
                skill_name="General Problem Solving",
                category="General",
                evidence_snippet="Stated general project involvement in uploaded content.",
                estimated_proficiency=2,
                proficiency_label="Developing",
                confidence=0.5,
                is_verified=False,
                source_reference=source_type
            ))


        roles = []
        if any("frontend" in s.skill_name.lower() or "react" in s.skill_name.lower() for s in skills):
            roles.append("Frontend Lead")
        if any("backend" in s.skill_name.lower() or "python" in s.skill_name.lower() for s in skills):
            roles.append("Backend Lead")
        if any("design" in s.skill_name.lower() or "figma" in s.skill_name.lower() for s in skills):
            roles.append("UI/UX Designer")
        if not roles:
            roles = ["Core Contributor"]

        return ProfileEvidenceExtractionResponse(
            candidate_name=candidate_name or "Candidate",
            summary=f"Extracted {len(skills)} validated capability evidence items from provided {source_type}.",
            extracted_skills=skills,
            project_experiences=[{"title": f"Documented {source_type} experience", "description": "Verified practical technology usage in submitted evidence"}],
            preferred_roles=roles,
            interests=["Collaborative Events", "Software Engineering"],
            provider="mock-deterministic",
            model="heuristic-extractor-v1"
        )
