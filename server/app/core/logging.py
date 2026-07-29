"""
Centralized logging for PrepGenie.

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)

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


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


class _DevFormatter(logging.Formatter):
    def __init__(self) -> None:
        super().__init__("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")


def _resolve_log_level() -> int:
    if settings.LOG_LEVEL:
        return getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    return logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO


def configure_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    level = _resolve_log_level()
    is_prod = settings.ENVIRONMENT.lower() == "production"
    formatter: logging.Formatter = _JsonFormatter() if is_prod else _DevFormatter()

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

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a logger under the configured 'app' hierarchy."""
    configure_logging()
    if name.startswith("app."):
        return logging.getLogger(name)
    return logging.getLogger(f"app.{name}")


configure_logging()
logger = get_logger("app")
