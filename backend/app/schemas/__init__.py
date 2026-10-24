from backend.app.schemas.common import MessageResponse, PaginatedResponse
from backend.app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
)
from backend.app.schemas.profile import (
    SkillResponse,
    UserSkillCreate,
    UserSkillUpdate,
    UserSkillResponse,
    ProfileUpdate,
    ProfileResponse,
)
from backend.app.schemas.event import (
    EventCategoryResponse,
    EventRequirementCreate,
    EventRequirementResponse,
    EventRoleCreate,
    EventRoleResponse,
    EventCreate,
    EventUpdate,
    EventResponse,
    EventRegistrationCreate,
    EventRegistrationResponse,
)
from backend.app.schemas.assessment import (
    AssessmentQuestionCreate,
    AssessmentQuestionResponse,
    AssessmentCreate,
    AssessmentResponse,
    SubmissionAnswerInput,
    SubmissionCreate,
    SubmissionEvaluationCreate,
    SubmissionEvaluationResponse,
    SubmissionResponse,
)
from backend.app.schemas.ai_setup import (
    AISetupRequest,
    AISetupResponse,
    AISetupApproveRequest,
    AISuggestedRole,
    AISuggestedRequirement,
    AISuggestedQuestion,
)
from backend.app.schemas.matching import (
    MatchingRunCreate,
    MatchingRunResponse,
    ProposedTeamResponse,
    ProposedMemberResponse,
    MatchExplanationResponse,
)
from backend.app.schemas.team import (
    TeamMemberResponse,
    TeamResponse,
    TeamBlueprintResponse,
    MemberLeaveRequest,
    CandidateReplacement,
    ReplacementRecommendationResponse,
    ApplyReplacementRequest,
    TeamMessageCreate,
    TeamMessageResponse,
)
from backend.app.schemas.gamification import (
    DailyChallengeResponse,
    SubmitChallengeRequest,
    ChallengeResultResponse,
    XPLedgerResponse,
    AchievementResponse,
)
from backend.app.schemas.notification import NotificationResponse, AuditLogResponse
