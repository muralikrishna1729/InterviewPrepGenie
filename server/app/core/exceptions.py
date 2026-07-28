"""
AIServiceError(provider: str, message: str, status_code: int | None)
-- normalized exception type used by all three AI wrappers (Groq LLM, Groq STT,
ElevenLabs TTS) so call sites handle one error shape regardless of provider.
"""
