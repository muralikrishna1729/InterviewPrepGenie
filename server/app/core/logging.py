"""
Centralized logging for PrepGenie.

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)

    # Key=value context for grep-able single-line events:
    logger.info("interview_created", interview_id=id, role=role, num_questions=3)
    # ^ logs:  ... | INFO | app.module | interview_created interview_id=... role=... num_questions=3

Rule: never log passwords, JWTs, raw API keys, or other secrets.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

_LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
_CONFIGURED = False


def _kv(record: logging.LogRecord) -> str:
    """Render any extra key=value pairs attached to a LogRecord."""
    extras = getattr(record, "_ctx", None)
    if not extras:
        return ""
    return " " + " ".join(f"{k}={v}" for k, v in extras.items())


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
        }
        ctx = getattr(record, "_ctx", None)
        if ctx:
            payload.update(ctx)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


class _KeyValueFormatter(logging.Formatter):
    """Dev-friendly one-line format: message followed by key=value context."""

    def __init__(self) -> None:
        super().__init__("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record) + _kv(record)
        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return base


class _CtxLogger(logging.LoggerAdapter):
    """
    LoggerAdapter that lets callers pass extra key=value context which is
    appended to every emitted line, e.g.:
        logger.info("ws_connected", user_id=id, active=2)
    """

    def __init__(self, logger: logging.Logger, **ctx):
        super().__init__(logger, {})
        self._static_ctx = ctx

    def _merge(self, kwargs: dict) -> dict:
        merged = dict(self._static_ctx)
        merged.update(kwargs)
        return merged

    def process(self, msg, kwargs):
        ctx = dict(self._static_ctx)
        # Pull out any extra kwargs the caller passed
        extras = {k: v for k, v in kwargs.items() if k not in ("exc_info", "stack_info", "extra")}
        if extras:
            ctx.update(extras)
        kwargs = {k: v for k, v in kwargs.items() if k in ("exc_info", "stack_info", "extra")}
        kwargs["extra"] = {"_ctx": ctx}
        return msg, kwargs

    def exception(self, msg, *args, **kwargs):
        kwargs.setdefault("exc_info", True)
        self.log(logging.ERROR, msg, *args, **kwargs)


def _resolve_log_level() -> int:
    if settings.LOG_LEVEL:
        return getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    return logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO


def _configure_sqlalchemy_levels(level: int) -> None:
    """
    SQLAlchemy's own logger dumps every query at INFO (echo or not). Silence it
    by default; only raise it when SQL_DEBUG=true AND we're at DEBUG level.
    """
    sql_logger = logging.getLogger("sqlalchemy.engine")
    pool_logger = logging.getLogger("sqlalchemy.pool")
    if settings.SQL_DEBUG and level <= logging.DEBUG:
        sql_logger.setLevel(logging.DEBUG)
        pool_logger.setLevel(logging.DEBUG)
    else:
        sql_logger.setLevel(logging.WARNING)
        pool_logger.setLevel(logging.WARNING)


def configure_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    level = _resolve_log_level()
    is_prod = settings.ENVIRONMENT.lower() == "production"
    formatter: logging.Formatter = _JsonFormatter() if is_prod else _KeyValueFormatter()

    root = logging.getLogger("app")
    root.setLevel(level)
    root.propagate = False

    if not root.handlers:
        console = logging.StreamHandler(sys.stdout)
        console.setLevel(level)
        console.setFormatter(formatter)
        root.addHandler(console)

        log_file = _LOG_DIR / f"app_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    _configure_sqlalchemy_levels(level)
    _CONFIGURED = True


def get_logger(name: str, **ctx) -> _CtxLogger:
    """
    Return a logger under the configured 'app' hierarchy.

    Optional keyword args become static key=value context on every line, e.g.:
        get_logger(__name__, user_id=user_id)
    """
    configure_logging()
    if name.startswith("app."):
        base = logging.getLogger(name)
    else:
        base = logging.getLogger(f"app.{name}")
    return _CtxLogger(base, **ctx)


# Configure exactly once at import (idempotent via _CONFIGURED).
if not _CONFIGURED:
    configure_logging()

logger = get_logger("app")
