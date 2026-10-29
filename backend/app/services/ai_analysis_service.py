import io
import re
import uuid
from typing import Optional, List, Dict, Any
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.logging import logger
from backend.app.integrations.ai.factory import get_ai_provider

class AIAnalysisService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = get_ai_provider()

    def extract_resume_text(self, user_id: uuid.UUID) -> Optional[str]:
        """Extracts text content from uploaded resume documents in hackloop.profile_documents."""
        query = text("""
            SELECT id, filename, media_type, content
            FROM hackloop.profile_documents
            WHERE user_id = :uid AND category IN ('resume', 'qualification', 'supporting')
            ORDER BY created_at DESC LIMIT 1
        """)
        doc = self.db.execute(query, {"uid": user_id}).mappings().first()
        if not doc or not doc["content"]:
            return None

        content_bytes = bytes(doc["content"])
        media_type = doc.get("media_type") or ""
        filename = (doc.get("filename") or "").lower()

        # Extract text if PDF
        if media_type == "application/pdf" or filename.endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(content_bytes))
                pages_text = [page.extract_text() or "" for page in reader.pages]
                full_text = "\n".join(pages_text).strip()
                if full_text:
                    return full_text
            except Exception as e:
                logger.warning(f"pypdf extraction failed for doc {doc['id']}: {e}")

        # Plain text fallback
        try:
            return content_bytes.decode("utf-8", errors="ignore").strip()
        except Exception:
            return None

    async def fetch_github_repos(self, github_url_or_username: Optional[str]) -> List[Dict[str, Any]]:
        """Safely fetches public GitHub repositories via GitHub REST API with timeout and error handling."""
        if not github_url_or_username:
            return []

        cleaned = github_url_or_username.strip()
        # Extract username if full URL provided
        if "github.com/" in cleaned:
            parts = cleaned.split("github.com/")[-1].strip("/").split("/")
            username = parts[0] if parts else ""
        else:
            username = cleaned.lstrip("@").strip()

        if not username or re.search(r"[^a-zA-Z0-9_\-]", username):
            return []

        api_url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=10"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Skillfy-Intelligence-Engine"
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(api_url, headers=headers)
                if res.status_code == 200:
                    repos = res.json()
                    results = []
                    for r in repos:
                        if not r.get("fork"): # Prioritize original projects
                            results.append({
                                "name": r.get("name"),
                                "description": r.get("description") or "",
                                "language": r.get("language") or "",
                                "topics": r.get("topics") or [],
                                "stargazers_count": r.get("stargazers_count", 0),
                                "updated_at": r.get("updated_at")
                            })
                    return results if results else repos[:5]
                elif res.status_code in (403, 404):
                    logger.info(f"GitHub API returned {res.status_code} for user {username}")
                    return []
        except Exception as e:
            logger.info(f"GitHub fetch skipped or timed out for {username} ({e})")
            return []

        return []

    async def analyze_participant_evidence(
        self,
        user_id: uuid.UUID,
        candidate_name: Optional[str] = None,
        github_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Performs comprehensive AI analysis across participant's uploaded resume and GitHub repositories."""
        # 1. Fetch user and profile details
        user_row = self.db.execute(
            text("SELECT id, email, display_name FROM hackloop.users WHERE id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        profile_row = self.db.execute(
            text("SELECT bio, github_url, preferred_roles, interests FROM hackloop.profiles WHERE user_id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        name = candidate_name or (user_row["display_name"] if user_row else "Participant")
        github_url = github_override or (profile_row["github_url"] if profile_row else None)

        # 2. Extract resume text
        resume_text = self.extract_resume_text(user_id)

        # 3. Fetch GitHub repositories
        github_repos = await self.fetch_github_repos(github_url)

        # 4. Run AI analysis
        # First, resume evidence extraction
        resume_analysis = None
        if resume_text:
            resume_analysis = await self.ai.analyze_profile_evidence(
                content=resume_text,
                source_type="resume",
                candidate_name=name
            )

        # Second, GitHub repositories analysis
        github_analysis = await self.ai.analyze_github_repos(
            github_username=github_url or "developer",
            repos=github_repos,
            candidate_name=name
        )

        # Combine extracted skills
        skills_dict: Dict[str, Dict[str, Any]] = {}
        if resume_analysis:
            for s in resume_analysis.extracted_skills:
                skills_dict[s.skill_name.lower()] = {
                    "skill_name": s.skill_name,
                    "category": s.category,
                    "proficiency": s.estimated_proficiency,
                    "proficiency_label": s.proficiency_label or "Developing",
                    "confidence": s.confidence,
                    "is_verified": s.is_verified,
                    "evidence_snippet": s.evidence_snippet
                }

        for s in github_analysis.get("extracted_skills", []):
            k = s["skill_name"].lower()
            if k in skills_dict:
                # Merge and upgrade proficiency if GitHub validates it
                skills_dict[k]["proficiency"] = max(skills_dict[k]["proficiency"], s.get("proficiency", 2))
                skills_dict[k]["is_verified"] = True
                skills_dict[k]["evidence_snippet"] += f" | {s.get('evidence_snippet', '')}"
            else:
                skills_dict[k] = s

        strengths = list(set((github_analysis.get("strengths") or []) + (resume_analysis.preferred_roles if resume_analysis else [])))
        if not strengths:
            strengths = ["Technical Engineering", "Collaborative Problem Solving"]

        summary_parts = []
        if resume_analysis and resume_analysis.summary:
            summary_parts.append(resume_analysis.summary)
        if github_analysis and github_analysis.get("summary"):
            summary_parts.append(github_analysis.get("summary"))
        if not summary_parts:
            summary_parts.append(f"{name} is an active participant ready for collaborative event matching.")

        combined_summary = " ".join(summary_parts)

        return {
            "participant_id": user_id,
            "candidate_name": name,
            "github_username": github_url,
            "resume_found": bool(resume_text),
            "github_accessible": bool(github_repos),
            "extracted_skills": list(skills_dict.values()),
            "project_contributions": github_analysis.get("project_contributions", []),
            "strengths": strengths,
            "summary": combined_summary,
            "provider": getattr(self.ai, "model", "ai-engine"),
            "model": getattr(self.ai, "model", "skillfy-v1")
        }
