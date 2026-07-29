"""
Groq LLM client wrapper (Llama 3.3 70B for feedback/questions,
llama-3.1-8b-instant for lighter/faster calls).
Raises AIServiceError on failure -- normalized shape.
"""

import json
import time

from groq import APIConnectionError, APIStatusError, AuthenticationError, RateLimitError
from pydantic import BaseModel, ValidationError

from app.core.exceptions import AIServiceError
from app.core.logging import get_logger
from app.modules.ai.client import groq_client

logger = get_logger(__name__)

MODEL_STANDARD = "llama-3.3-70b-versatile"
MODEL_FAST = "llama-3.1-8b-instant"

_PROVIDER = "groq_llm"


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


async def generate_completion(
    messages: list[dict],
    model: str = MODEL_FAST,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    response_format: dict | None = None,
) -> str:
    """Returns the raw text content of the completion. Raises AIServiceError on failure."""
    logger.debug("groq_llm call: model=%s, messages=%d", model, len(messages))
    start = time.monotonic()

    try:
        kwargs: dict = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format is not None:
            kwargs["response_format"] = response_format

        response = await groq_client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""
        elapsed = time.monotonic() - start
        logger.info("groq_llm success: model=%s, latency=%.2fs", model, elapsed)
        return content

    except AIServiceError:
        raise
    except Exception as exc:
        error = _wrap_groq_error(exc)
        logger.error("groq_llm failed: %s", error)
        raise error from exc


async def generate_structured(
    messages: list[dict],
    response_model: type[BaseModel],
    model: str = MODEL_STANDARD,
    max_tokens: int = 4096,
) -> BaseModel:
    """
    Calls generate_completion with JSON mode forced, parses the result into
    response_model. Raises AIServiceError if the response fails Pydantic validation.
    """
    schema_hint = (
        f"\n\nRespond with a single JSON object matching this schema "
        f"(use these exact field names):\n"
        f"{json.dumps(response_model.model_json_schema(), indent=2)}"
    )
    enriched = list(messages)
    if enriched and enriched[0].get("role") == "system":
        enriched[0] = {
            **enriched[0],
            "content": (enriched[0].get("content") or "") + schema_hint,
        }
    else:
        enriched.insert(0, {"role": "system", "content": schema_hint.strip()})

    raw = await generate_completion(
        enriched,
        model=model,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    try:
        parsed = response_model.model_validate(json.loads(raw))
        logger.info("groq_llm structured ok: model=%s schema=%s", model, response_model.__name__)
        return parsed
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.error(
            "groq_llm structured parse failed: schema=%s error=%s raw_preview=%s",
            response_model.__name__,
            exc,
            raw[:500],
        )
        raise AIServiceError(
            _PROVIDER, f"invalid structured response: {exc}", retryable=False
        ) from exc
