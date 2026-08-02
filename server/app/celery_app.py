"""
Celery app instance. Broker and result backend both use Redis (same
instance as session state; split DB indexes later if needed).
Autodiscovers tasks in app.tasks.*
"""

import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from celery import Celery

from app.config import settings

celery_app = Celery(
    "prepgenie",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.interview_tasks",
        "app.tasks.resume_tasks",
        "app.tasks.mcq_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
)

celery_app.autodiscover_tasks(["app"])
