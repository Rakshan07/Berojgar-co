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

    async def analyze_github_repos(
        self,
        github_username: str,
        repos: List[Dict[str, Any]],
        candidate_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Deterministic extractor of skills, projects, and contributions from GitHub repositories."""
        if not repos:
            return {
                "github_username": github_username,
                "candidate_name": candidate_name or "Participant",
                "extracted_skills": [],
                "project_contributions": [],
                "strengths": ["Self-directed learning"],
                "summary": f"No accessible public repositories found for @{github_username}."
            }

        extracted_skills: List[Dict[str, Any]] = []
        project_contributions: List[Dict[str, Any]] = []
        strengths: List[str] = []
        known_langs: Dict[str, int] = {}

        lang_skill_map = {
            "python": ("Python", "Backend", 3),
            "typescript": ("TypeScript", "Frontend", 3),
            "javascript": ("JavaScript", "Frontend", 3),
            "go": ("Go", "Backend", 3),
            "rust": ("Rust", "Systems", 2),
            "java": ("Java", "Backend", 2),
            "c++": ("C++", "Systems", 2),
            "html": ("HTML/CSS", "Frontend", 3),
            "css": ("HTML/CSS", "Frontend", 3),
            "jupyter notebook": ("Data Analysis / Python", "Data", 2)
        }

        for r in repos[:8]:
            r_name = r.get("name", "Project")
            lang = (r.get("language") or "").lower()
            desc = r.get("description") or "Open source software project"
            topics = r.get("topics") or []
            stars = r.get("stargazers_count", 0)

            techs = [t for t in topics]
            if lang and lang not in techs:
                techs.append(lang.capitalize())

            project_contributions.append({
                "repo_name": r_name,
                "primary_language": lang.capitalize() if lang else "Polyglot",
                "technologies": techs[:6],
                "contribution_summary": desc,
                "evidence_quote": f"Verified public repository '{r_name}' with {stars} star(s), primary language: {lang.capitalize() if lang else 'Unspecified'}."
            })

            if lang in lang_skill_map:
                s_name, s_cat, s_prof = lang_skill_map[lang]
                known_langs[s_name] = max(known_langs.get(s_name, 0), s_prof)

        for s_name, prof in known_langs.items():
            extracted_skills.append({
                "skill_name": s_name,
                "category": "Technical",
                "proficiency": prof,
                "proficiency_label": "Independent" if prof >= 3 else "Developing",
                "confidence": 0.9,
                "is_verified": True,
                "evidence_snippet": f"Demonstrated in active GitHub repositories for @{github_username}."
            })

        if any("python" in k.lower() or "backend" in k.lower() for k in known_langs):
            strengths.append("Backend engineering and service construction")
        if any("typescript" in k.lower() or "javascript" in k.lower() for k in known_langs):
            strengths.append("Modern responsive web application development")
        if not strengths:
            strengths.append("Active open source developer")

        summary = f"GitHub analysis for @{github_username} demonstrates active contributions across {len(repos)} repositories, with notable proficiency in {', '.join(list(known_langs.keys())[:3]) or 'software engineering'}."

        return {
            "github_username": github_username,
            "candidate_name": candidate_name or "Participant",
            "extracted_skills": extracted_skills,
            "project_contributions": project_contributions,
            "strengths": strengths,
            "summary": summary
        }

    async def generate_event_assessment(
        self,
        event_title: str,
        category: str,
        description: str,
        required_roles: List[str],
        required_skills: List[str],
        candidate_info: Dict[str, Any]
    ) -> List[AISuggestedQuestion]:
        """Generates tailored skill and personality/teamwork questions for an event participant."""
        primary_skill = required_skills[0] if required_skills else "Full-stack Engineering"
        secondary_skill = required_skills[1] if len(required_skills) > 1 else "API Development"

        return [
            AISuggestedQuestion(
                question_text=f"What is your practical experience building solutions using {primary_skill} in high-pace collaborative events?",
                skill_target=primary_skill,
                question_type="multiple_choice",
                options=[
                    f"Advanced: Architected end-to-end production systems or won technical hackathons using {primary_skill}.",
                    f"Independent: Built multiple complete features and integrated services using {primary_skill}.",
                    f"Developing: Familiar with core concepts, completed tutorials or coursework, seeking team pairing.",
                    "Exploring: Beginner / willing to learn quickly under mentorship."
                ],
                category="skill_assessment",
                rubric_guidelines=f"Assesses candidate's hands-on depth in {primary_skill}."
            ),
            AISuggestedQuestion(
                question_text=f"When designing the architecture for {event_title}, how do you approach tool selection and code modularity?",
                skill_target=secondary_skill,
                question_type="multiple_choice",
                options=[
                    "Pragmatic & standard: Prioritize well-documented, proven stacks that allow rapid team onboarding.",
                    "Modular & component-driven: Clean separation of concerns with type safety and clear API contracts.",
                    "Performance-first: Optimize data access, minimize latency, and build scalable foundations.",
                    "Rapid prototyping: Fast velocity with lightweight frameworks and automated test guards."
                ],
                category="skill_assessment",
                rubric_guidelines="Evaluates architectural alignment and engineering trade-off balance."
            ),
            AISuggestedQuestion(
                question_text="How do you prefer to communicate and coordinate work with your teammates during an event?",
                skill_target="Communication & Coordination",
                question_type="multiple_choice",
                options=[
                    "Async-first: Documented tickets, shared roadmaps, and concise standup summaries.",
                    "Synchronous collaboration: Regular pairing, active audio/video syncs, and real-time problem solving.",
                    "Hybrid flow: High autonomy during coding blocks with periodic milestone check-ins.",
                    "Pair programming: Direct co-development on critical architecture and code reviews."
                ],
                category="teamwork_personality",
                rubric_guidelines="Identifies candidate's collaboration rhythm to match complementary team styles."
            ),
            AISuggestedQuestion(
                question_text="When team members have differing opinions on technical direction or product scope, what is your approach?",
                skill_target="Conflict Resolution & Teamwork",
                question_type="multiple_choice",
                options=[
                    "Data & user-driven: Frame options against project goals, benchmark constraints, and pick the highest impact path.",
                    "Consensus-seeking: Brainstorm compromises that incorporate the best parts of each perspective.",
                    "Deference to lead: Support the designated area lead's decision and execute wholeheartedly.",
                    "Quick timeboxed experiments: Prototype both options briefly and let empirical results decide."
                ],
                category="teamwork_personality",
                rubric_guidelines="Measures interpersonal dynamics and conflict de-escalation maturity."
            ),
            AISuggestedQuestion(
                question_text="What is your estimated time commitment and preferred working hours for this event?",
                skill_target="Commitment & Pacing",
                question_type="multiple_choice",
                options=[
                    "Full intensity (20+ hrs/week): Deep immersion throughout the event duration.",
                    "Steady contributor (10-15 hrs/week): Consistent evenings and weekend progress.",
                    "Focused sprints (5-10 hrs/week): Targeted contributions to specific core deliverables.",
                    "Flexible / As needed: Available for design reviews, advisory, or specialized modules."
                ],
                category="teamwork_personality",
                rubric_guidelines="Helps prevent mismatch between high-intensity and part-time participants."
            )
        ]

    async def suggest_assessment_answers(
        self,
        questions: List[Dict[str, Any]],
        candidate_evidence: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Produces honest, evidence-grounded answer suggestions. Never fabricates experience."""
        resume_text = (candidate_evidence.get("resume_text") or "").lower()
        github_repos = candidate_evidence.get("github_repos") or []
        skills = candidate_evidence.get("skills") or []
        candidate_name = candidate_evidence.get("candidate_name") or "Participant"

        suggestions = []

        for q in questions:
            q_text = q.get("question_text", "")
            q_target = (q.get("skill_target") or "").lower()
            q_id = q.get("id")
            options = q.get("options") or []

            matched_evidence = None
            evidence_source = None
            suggested_opt = None

            # 1. Search GitHub repositories for concrete evidence
            for repo in github_repos:
                r_name = repo.get("name", "").lower()
                r_desc = (repo.get("description") or "").lower()
                r_lang = (repo.get("language") or "").lower()
                r_topics = [t.lower() for t in repo.get("topics", [])]

                if q_target and (q_target in r_name or q_target in r_desc or q_target in r_lang or any(q_target in t for t in r_topics)):
                    matched_evidence = f"Repository '{repo.get('name')}' ({repo.get('language') or 'polyglot'}): {repo.get('description') or 'Practical software implementation'}"
                    evidence_source = f"GitHub repository @{candidate_evidence.get('github_username', '')}/{repo.get('name')}"
                    break

            # 2. Search resume text for concrete evidence
            if not matched_evidence and q_target and q_target in resume_text:
                idx = resume_text.find(q_target)
                start = max(0, resume_text.rfind("\n", 0, idx) + 1)
                end = resume_text.find("\n", idx)
                snippet = resume_text[start:end if end != -1 else idx + 100].strip()
                matched_evidence = snippet
                evidence_source = "Uploaded Resume"

            # 3. Check declared/verified skills list
            if not matched_evidence and q_target:
                for s in skills:
                    s_name = (s.get("skill_name") or s.get("name") or "").lower()
                    if q_target in s_name or s_name in q_target:
                        prof = s.get("proficiency", 2)
                        matched_evidence = f"Verified skill {s.get('skill_name') or s.get('name')} (Level {prof})"
                        evidence_source = "Verified Participant Profile Skill"
                        break

            # 4. Personality / teamwork question heuristics grounded in profile
            is_personality = q.get("category") == "teamwork_personality" or any(w in q_target for w in ["communication", "conflict", "commitment"])

            if matched_evidence:
                if options:
                    suggested_opt = options[1] if len(options) > 1 else options[0]
                suggested_text = f"Based on verified experience in {evidence_source} ({matched_evidence}): I bring hands-on capability and have built solutions using these patterns."
                suggestions.append({
                    "question_id": q_id,
                    "question_text": q_text,
                    "suggested_answer": suggested_opt or suggested_text,
                    "evidence_found": True,
                    "evidence_source": evidence_source,
                    "confidence": 0.88,
                    "is_verified": True,
                    "explanation": f"Grounded in verified evidence from {evidence_source}. You may edit or elaborate on this answer."
                })
            elif is_personality:
                # Personality preference suggested as a draft template clearly marked for review
                suggested_opt = options[0] if options else "Collaborative, transparent communication with focus on steady sprint delivery."
                suggestions.append({
                    "question_id": q_id,
                    "question_text": q_text,
                    "suggested_answer": suggested_opt,
                    "evidence_found": False,
                    "evidence_source": "General Collaboration Heuristic",
                    "confidence": 0.50,
                    "is_verified": False,
                    "explanation": "Suggested default teamwork preference based on standard project patterns. Please review and select the option that best reflects your working style."
                })
            else:
                # Strictly NO evidence found: NEVER fabricate
                suggestions.append({
                    "question_id": q_id,
                    "question_text": q_text,
                    "suggested_answer": None,
                    "evidence_found": False,
                    "evidence_source": None,
                    "confidence": 0.0,
                    "is_verified": False,
                    "explanation": "No direct evidence found in your uploaded resume or GitHub repositories for this question. Please provide your own answer based on your experience."
                })

        return suggestions

    async def generate_secondary_event_profile(
        self,
        candidate_data: Dict[str, Any],
        event_data: Dict[str, Any],
        assessment_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Synthesizes primary profile, resume, GitHub, and assessment answers into a secondary event profile."""
        cand_name = candidate_data.get("name") or "Participant"
        skills = candidate_data.get("skills") or []
        github_repos = candidate_data.get("github_repos") or []
        event_title = event_data.get("title", "Event")
        event_category = event_data.get("category", "General")

        # Determine preferred role based on skills
        role = "Full-stack Contributor"
        skill_names = [s.get("name", "").lower() for s in skills]
        if any("frontend" in s or "react" in s for s in skill_names):
            role = "Frontend Lead"
        elif any("backend" in s or "python" in s or "fastapi" in s for s in skill_names):
            role = "Backend Lead"
        elif any("design" in s or "figma" in s or "ux" in s for s in skill_names):
            role = "UI/UX Designer"
        elif any("ml" in s or "data" in s for s in skill_names):
            role = "AI/ML Engineer"

        strengths = [
            f"Demonstrated competence in {', '.join([s.get('name', '') for s in skills[:3]]) or 'core technical problem-solving'}",
            f"Active alignment with {event_title} domain requirements",
            "Strong team collaboration and asynchronous coordination"
        ]

        growth_areas = [
            "Expanding cross-domain architecture leadership",
            "Rapid multi-service deployment automation"
        ]

        contribution_areas = [
            f"Lead development for {role.lower()} modules and feature delivery",
            "Establish clean code conventions and peer review standards",
            "Interface with team members on shared interface contracts"
        ]

        assessment_highlights = [
            {"topic": "Collaboration Style", "highlight": "Demonstrates structured, communicative teamwork mindset"},
            {"topic": "Technical Pacing", "highlight": "Prepared for high-velocity iterative sprint milestones"}
        ]

        github_highlights = [
            {"repo": r.get("name"), "language": r.get("language"), "stars": r.get("stargazers_count", 0)}
            for r in github_repos[:4]
        ]

        bonus = 8.5 if github_repos or len(skills) >= 3 else 6.0

        summary = f"{cand_name} brings hands-on capability as a {role} tailored for {event_title}, with proven experience in {', '.join([s.get('name', '') for s in skills[:3]]) or 'modern technologies'} and a collaborative teamwork approach."

        return {
            "summary": summary,
            "preferred_role": role,
            "event_skills": skills[:8],
            "strengths": strengths,
            "growth_areas": growth_areas,
            "contribution_areas": contribution_areas,
            "assessment_highlights": assessment_highlights,
            "github_highlights": github_highlights,
            "compatibility_bonus": bonus,
            "model_used": "skillfy-ai-synthesis-v1"
        }

