# `app/modules/mcq/` — MCQ Practice Module

Generates a 20-question quiz (mixed types: aptitude, job-specific, situational, code-output) from a pasted job description, grades it server-side, and returns AI feedback. Sessions are **persisted to Postgres**; all LLM work is offloaded to Celery.

## Files in this module

| File | Responsibility |
|---|---|
| `router.py` | REST endpoints — `POST /api/mcq/generate`, `GET /api/mcq/{id}`, `POST /api/mcq/{id}/submit` |
| `service.py` | `strip_answer_key` (the one function that removes `correct_index` before any question reaches an HTTP response) + `grade_answers` (pure, no AI) |

The Celery side lives in `app/tasks/mcq_tasks.py` (not a local `tasks.py`): `generate_mcq_task` calls the `mcq_gen` chain and stores questions; `grade_and_feedback_task` produces the post-submit AI feedback paragraph.

## Code flow, step by step

1. Client `POST`s `{ job_title?, job_description }` to `/api/mcq/generate`
2. `router.py` creates a `McqSession` row (`status="pending"`) and enqueues `generate_mcq_task` — the endpoint returns **202** immediately with the session id
3. The worker runs `generate_mcq_questions` (via `chains/mcq_gen.py`, structured output), de-duplicates by normalized question text, and writes `session.questions` + `status="ready"`
4. Client polls `GET /api/mcq/{id}` until `status == "ready"`, then renders the quiz
5. Client submits `{ answers: { question_index: option_index } }` to `POST /api/mcq/{id}/submit`
6. `service.grade_answers` grades synchronously against the stored `correct_index` keys; score/correct/total are persisted and the session becomes `"submitted"`
7. `grade_and_feedback_task` runs async and fills in `session.feedback`; the frontend polls `GET /api/mcq/{id}` briefly until it arrives

## How the answer key stays secret

Every `McqSession.questions` row keeps `correct_index` (the answer key) — but **only server-side**. `strip_answer_key` in `service.py` is the single conversion path used by the router to build client responses: it drops `correct_index` and returns `McqQuestionForClient` (question_index, question_text, options, category). The browser never receives the correct answer until after grading.

## Why persisted in Postgres, not in-memory

An earlier design held sessions in an in-process dict; that lost every in-progress quiz on restart and broke behind multiple API instances. Now sessions are real rows, so history survives restarts, grading is reproducible, and the answer key lives in the same place it's graded — the DB.

## Common interview questions this module should prepare you for

- "How do you prevent someone from reading the API response to get the answers?" → `correct_index` is withheld from every client-facing response by `strip_answer_key`; grading happens server-side against the stored key.
- "Why does submit return `feedback: null`?" → grading is synchronous and immediate, but the AI feedback paragraph is an LLM call, so it's queued to Celery and the client polls for it.
