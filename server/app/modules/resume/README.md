# `app/modules/resume/` — Resume Analyzer

Upload a resume (PDF/DOCX), get an AI-scored breakdown back: strengths, weaknesses, grammar suggestions, ATS keyword tips, and concrete improvements — scored against an optional job description. Analysis records are **persisted to Postgres**; the LLM scoring runs in a Celery task.

## Files in this module

| File | Responsibility |
|---|---|
| `router.py` | REST endpoints — `POST /api/resume/analyze`, `GET /api/resume/{id}`, plus `PUT/GET/DELETE /api/resume/default` |
| `service.py` | `extract_resume_text` — pulls raw text out of the uploaded file (PDF via `pypdf`, DOCX via `python-docx`), 5MB cap, rejects scanned images with no extractable text |
| `default_resume.py` | Per-user "default resume" stored on disk (`uploads/<user_id>/resume.<ext>`) so the Practice/Interview setup pages can pre-select it without a re-upload |

The Celery side lives in `app/tasks/resume_tasks.py`: `analyze_resume_task` runs `chains/resume_analysis.analyze_resume_text` and persists the result.

## Code flow, step by step

1. Client `POST`s a file (PDF or DOCX, capped at 5MB) plus an optional `job_description` form field to `/api/resume/analyze`
2. `service.py` reads the bytes **into memory only** (no write to disk) and extracts plain text
3. `router.py` creates a `ResumeAnalysis` row (`status="pending"`) and enqueues `analyze_resume_task(resume_id, extracted_text, job_description)` — returns **202** with the record
4. The worker runs the scoring chain against the job description (if provided) and fills in score + all list fields, setting `status="completed"` (or `"failed"` on error — a row never stays stuck at `pending`)
5. Client polls `GET /api/resume/{id}` until `status == "completed"` and renders the breakdown

## Why async (and why persisted)

- **Why async:** LLM scoring takes seconds, so the upload endpoint returns immediately (202) and the worker fills in the result — the API stays responsive.
- **Why persisted:** past analyses remain viewable by id (the product can show history later without a schema change). Only the extracted text and analysis are stored — **the uploaded file bytes are never written to disk**.
- **Failure handling:** a failed analysis sets `status="failed"` (not stuck at `pending` forever), and the frontend shows a retry prompt.

## Default resume (`/api/resume/default`)

A convenience feature: the user can save one resume per account to disk (`uploads/<user_id>/resume.<ext>`, 5MB cap, PDF/DOCX only; uploading a new one replaces the old). The Practice and Interview-setup pages call `GET /api/resume/default` to pre-select it. Stored on disk (not in a DB column) because it's an opaque binary blob, not queryable data; `server/uploads/` is gitignored.

## Common interview questions this module should prepare you for

- "How do you parse PDFs/DOCX?" → `pypdf` for PDFs, `python-docx` for DOCX, both in-memory via `io.BytesIO` — nothing is written to disk.
- "What happens if the LLM call fails?" → the Celery task catches `AIServiceError`/exceptions, sets `status="failed"`, and commits — the row is never left at `pending`.
- "Is the resume content stored?" → only the extracted analysis; the raw file bytes are discarded after extraction.
