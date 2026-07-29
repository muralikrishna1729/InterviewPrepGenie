"""
Celery app instance, broker=REDIS_URL, backend=REDIS_URL.
Autodiscovers tasks in app.tasks.*
"""

from celery import Celery

from app.config import settings

celery_app = Celery(
    "prepgenie",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.interview_tasks", "app.tasks.resume_tasks", "app.tasks.mcq_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)
