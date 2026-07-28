# AI Voice Interview Simulator -- Python Backend

Scaffold only. See project chat history / architecture notes for the full
design: FastAPI + PostgreSQL + Redis + Celery + Groq (LLM+STT) + ElevenLabs (TTS).

Build order:
1. DB models (app/db/models.py) + Alembic migration
2. Auth module
3. Interview REST CRUD
4. AI service wrappers (llm.py, stt.py, tts.py) + AIServiceError normalization
5. WebSocket + Redis session store + LangGraph interview flow
6. Resume + MCQ modules + Celery tasks
7. Docker Compose wiring
