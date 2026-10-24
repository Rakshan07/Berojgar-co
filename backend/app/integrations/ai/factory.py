from backend.app.core.config import settings
from backend.app.integrations.ai.base import BaseAIProvider
from backend.app.integrations.ai.gemini_provider import GeminiProvider
from backend.app.integrations.ai.mock_provider import MockAIProvider
from backend.app.integrations.ai.openai_provider import OpenAICompatibleProvider

def get_ai_provider() -> BaseAIProvider:
    provider = settings.AI_PROVIDER.lower()
    if provider == "gemini":
        return GeminiProvider(
            api_key=settings.effective_gemini_api_key,
            model=settings.AI_MODEL
        )
    elif provider in ("openai", "anthropic"):
        return OpenAICompatibleProvider(
            api_key=settings.AI_API_KEY,
            model=settings.AI_MODEL
        )
    return MockAIProvider()

