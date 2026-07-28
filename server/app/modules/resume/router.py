"""
POST /api/resume/analyze (UploadFile, max 5MB, PDF/DOCX only)
Dispatches Celery task, returns task id or awaits short-poll result.
"""
