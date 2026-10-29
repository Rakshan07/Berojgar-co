import asyncio
from types import SimpleNamespace
import pytest
from backend.app.live import ai_service

class Busy(Exception):
    code = 503

async def no_wait(_):
    pass

def test_temporary_busy_switches_model(monkeypatch):
    calls=[]
    async def generate(**kwargs):
        calls.append(kwargs['model'])
        if len(calls)==1: raise Busy()
        return 'evaluated'
    client=SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate)))
    monkeypatch.setattr(ai_service.settings,'AI_FALLBACK_MODELS','gemini-3.5-flash-lite,gemini-3.8-flash')
    monkeypatch.setattr(ai_service.asyncio,'sleep',no_wait)
    assert asyncio.run(ai_service.generate_with_retry(client,model='gemini-3.1-flash-lite'))=='evaluated'
    assert calls==['gemini-3.1-flash-lite','gemini-3.5-flash-lite']

def test_permanent_error_does_not_cycle_models(monkeypatch):
    calls=[]
    async def generate(**kwargs):
        calls.append(kwargs['model'])
        raise ValueError('Invalid configuration')
    client=SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate)))
    with pytest.raises(ai_service.AIServiceError):
        asyncio.run(ai_service.generate_with_retry(client,model='gemini-3.1-flash-lite'))
    assert len(calls)==1

def test_all_busy_is_bounded_and_preserves_honest_error(monkeypatch):
    calls=[]
    async def generate(**kwargs):
        calls.append(kwargs['model'])
        raise Busy()
    client=SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate)))
    monkeypatch.setattr(ai_service.asyncio,'sleep',no_wait)
    with pytest.raises(ai_service.AIServiceError,match='answers are saved'):
        asyncio.run(ai_service.generate_with_retry(client,model='gemini-3.1-flash-lite'))
    assert len(calls)==3
