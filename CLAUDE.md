# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InterviewPrep Genie — full-stack AI interview simulator: real-time voice/text mock interviews over a single WebSocket, plus a resume analyzer and MCQ quiz generator. Frontend is React 19 + TypeScript + Vite (`client/`), backend is FastAPI + PostgreSQL + Redis + Celery + Groq/LangGraph (`server/`).

Note: the README's project-structure section says `frontend/`/`backend/` — the actual directories are `client/` and `server/`. `client_old_reference/` and `client/_salvage/` hold code from a prior client implementation being salvaged during the ongoing frontend rebuild; don't treat them as active source. Read `client/NOTES_FOR_AI.md` before frontend work — it documents the actual backend routes and which salvaged files to reuse.

## Commands

### Backend (run from `server/`)

Docker Compose is the primary way to run the stack (postgres, redis, api, celery_worker):

```bash
docker compose up -d --build      # start everything; api runs alembic upgrade head then uvicorn --reload on :5000
docker compose logs -f api        # follow API logs
docker compose down               # stop
```

Requires a `server/.env` (GROQ_API_KEY, JWT secret, etc.). Redis is exposed on host port **6380** (container 6379); Postgres on 5432. Health check: `curl http://localhost:5000/health`.

Python deps are managed with `uv` (`pyproject.toml` + `uv.lock`), Python ≥3.13. For host-side runs:

```bash
uv sync                                    # install deps
uv run uvicorn app.main:app --port 5000 --reload
uv run alembic upgrade head                # migrations
uv run alembic revision --autogenerate -m "msg"
uv run celery -A app.celery_app worker --loglevel=info --pool=solo   # --pool=solo needed on Windows
uv run python test_e2e_interview.py        # E2E WebSocket interview test (needs running API + DB)
```

There is no pytest suite; `test_e2e_interview.py` is a standalone script that drives the full setup→interview WebSocket flow against a live server.

### Frontend (run from `client/`)

```bash
npm run dev       # Vite dev server on :5173
npm run build     # tsc -b && vite build
npm run lint      # eslint
```

## Architecture

### Backend (`server/app/`)

- `main.py` — FastAPI app; mounts routers from each module. No API version prefix: routes are `/api/auth`, `/api/interviews`, `/api/mcq`, `/api/resume`, plus `/ws`.
- `modules/<name>/` — each feature (auth, interview, mcq, resume) is `router.py` + `service.py`.
- `modules/ai/` — Groq client wrappers (`llm.py`, `stt.py`, `tts.py`) and LangChain/LangGraph chains in `chains/` (`question_gen.py`, `feedback_gen.py`, `mcq_gen.py`, `resume_analysis.py`).
- `websocket/` — the core interview flow. `router.py` authenticates `/ws?token=JWT`, then dispatches to two phase handlers in `handlers/`: `setup_handler.py` (collect role, type, tech stack, experience, question count) then `interview_handler.py` (question/answer loop). Live session state lives in Redis via `session_store.py` (keys `session:{user_id}:setup` / `:interview`, 2h TTL) — not in process memory.
- `tasks/` — Celery tasks (`interview_tasks.py`, `mcq_tasks.py`, `resume_tasks.py`). Anything involving an LLM call not needed for the next immediate user action (feedback generation, resume scoring, MCQ generation) is offloaded here; results are persisted to Postgres by the worker.
- `db/models/` — one file per model (User → Interview → Question → Answer; Interview also has Feedback and TranscriptChunk; plus McqSession, ResumeAnalysis). `models_legacy.py` is old.
- `core/` — `security.py` (JWT create/verify), `redis.py` (shared client), `deps.py` (FastAPI deps), `exceptions.py`, `logging.py`.
- `schemas/` — Pydantic request/response schemas, shared across routers and tasks.

Key flow: an interview runs entirely over one WebSocket connection. Transient session state is in Redis; on completion the transcript is flushed to Postgres and feedback generation is queued to Celery so the socket isn't blocked on the LLM.

Auth: JWT Bearer tokens with a Redis blacklist checked on every authenticated request/WS connect (logout = blacklist the token).

### Frontend (`client/src/`)

- `pages/` — route pages (Dashboard, InterviewSetup, LiveInterviewSession, InterviewResults, Login/Signup, etc.); `layouts/` has `ProtectedRoute`, app shell.
- `hooks/` — `useWebSocket.ts` (reconnect + token-in-query auth, StrictMode-safe), `useWebcam.ts`, `useMediaRecorder.ts`, `useInterviewSession.ts`. Interview capture uses a single MediaRecorder for video+audio; answers stay client-side (retry/re-record) until the user explicitly submits.
- `store/` — Zustand stores (`authStore`, `sessionStore`, `themeStore`). JWT is stored client-side and sent as a Bearer header via an Axios interceptor in `services/api.ts`.
- `services/` — Axios API clients per domain.

### Docker gotcha

Both `api` and `celery_worker` bind-mount the repo (`.:/app`) **plus** an anonymous volume for `/app/.venv` — this keeps the container's Linux-built venv from being clobbered by the host's Windows one. Don't remove that volume line or native deps (asyncpg, bcrypt) break.
