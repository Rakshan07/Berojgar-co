from backend.app.models.auth import Role, User, AuthIdentity, UserRole, UserSession
from backend.app.models.profile import (
    Profile,
    SkillCategory,
    Skill,
    UserSkill,
    ParticipantAvailability,
)
from backend.app.models.organization import (
    Organization,
    OrganizationMember,
    OrganizerVerification,
)
from backend.app.models.event import (
    EventCategory,
    Event,
    EventRole,
    EventRequirement,
    EventRegistration,
)
from backend.app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentQuestionDraft,
    AssessmentSubmission,
    AssessmentAnswer,
    SubmissionEvaluation,
)
from backend.app.models.ai_setup import AIEventSetup
from backend.app.models.matching import (
    MatchingRun,
    ProposedTeam,
    ProposedMemberAssignment,
    MatchExplanation,
)
from backend.app.models.team import (
    Team,
    TeamMembership,
    TeamInvitation,
    TeamJoinRequest,
    ReplacementRecommendation,
    TeamMessage,
    TeamMeeting,
)
from backend.app.models.gamification import (
    DailyChallenge,
    UserChallengeAttempt,
    XPLedger,
    Achievement,
    UserAchievement,
    CollaborationFeedback,
)
from backend.app.models.notification import Notification, AuditLog

__all__ = [
    "Role",
    "User",
    "AuthIdentity",
    "UserRole",
    "UserSession",
    "Profile",
    "SkillCategory",
    "Skill",
    "UserSkill",
    "ParticipantAvailability",
    "Organization",
    "OrganizationMember",
    "OrganizerVerification",
    "EventCategory",
    "Event",
    "EventRole",
    "EventRequirement",
    "EventRegistration",
    "Assessment",
    "AssessmentQuestion",
    "AssessmentQuestionDraft",
    "AssessmentSubmission",
    "AssessmentAnswer",
    "SubmissionEvaluation",
    "AIEventSetup",
    "MatchingRun",
    "ProposedTeam",
    "ProposedMemberAssignment",
    "MatchExplanation",
    "Team",
    "TeamMembership",
    "TeamInvitation",
    "TeamJoinRequest",
    "ReplacementRecommendation",
    "TeamMessage",
    "TeamMeeting",
    "DailyChallenge",
    "UserChallengeAttempt",
    "XPLedger",
    "Achievement",
    "UserAchievement",
    "CollaborationFeedback",
    "Notification",
    "AuditLog",
]
