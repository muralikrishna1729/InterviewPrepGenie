"""
Groq Whisper (whisper-large-v3-turbo) wrapper.
Input: audio bytes (from push-to-talk recording, webm/ogg).
Output: transcript string. Raises AIServiceError on failure.
"""

import io
import time

from groq import APIConnectionError, APIStatusError, AuthenticationError, RateLimitError

from app.core.exceptions import AIServiceError
from app.core.logging import get_logger
from app.modules.ai.client import groq_client

logger = get_logger(__name__)

STT_MODEL = "whisper-large-v3-turbo"
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024
_PROVIDER = "groq_stt"


def _wrap_groq_error(exc: Exception) -> AIServiceError:
    if isinstance(exc, APIConnectionError):
        return AIServiceError(_PROVIDER, "connection failed", retryable=True)
    if isinstance(exc, RateLimitError):
        return AIServiceError(_PROVIDER, "rate limited", status_code=429, retryable=True)
    if isinstance(exc, AuthenticationError):
        return AIServiceError(_PROVIDER, "invalid API key", status_code=401, retryable=False)
    if isinstance(exc, APIStatusError):
        status_code = exc.status_code
        retryable = status_code >= 500
        return AIServiceError(_PROVIDER, str(exc), status_code=status_code, retryable=retryable)
    return AIServiceError(_PROVIDER, str(exc), retryable=False)


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str | None = None,
) -> str:
    """Returns the transcript text. Raises AIServiceError on failure."""
    if not audio_bytes:
        raise AIServiceError(_PROVIDER, "invalid audio data", status_code=400, retryable=False)

    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise AIServiceError(
            _PROVIDER,
            f"audio exceeds {MAX_AUDIO_SIZE_BYTES} byte limit",
            status_code=413,
            retryable=False,
        )

    logger.debug("groq_stt call: size=%d bytes, filename=%s", len(audio_bytes), filename)
    start = time.monotonic()

    try:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        kwargs: dict = {"file": audio_file, "model": STT_MODEL}
        if language is not None:
            kwargs["language"] = language

        response = await groq_client.audio.transcriptions.create(**kwargs)
        transcript = (response.text or "").strip()
        elapsed = time.monotonic() - start
        logger.info("groq_stt success: size=%d bytes, latency=%.2fs", len(audio_bytes), elapsed)
        return transcript

    except AIServiceError:
        raise
    except Exception as exc:
        error = _wrap_groq_error(exc)
        logger.error("groq_stt failed: %s", error)
        raise error from exc
