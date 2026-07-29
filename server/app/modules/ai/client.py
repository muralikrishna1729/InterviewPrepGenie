"""Shared Groq async client for LLM and STT wrappers."""

from groq import AsyncGroq

from app.config import settings

groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
