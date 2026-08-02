# `app/websocket/` — Live Interview Engine

This is the single most complex module in the backend. It runs the entire live interview experience over one persistent connection per session. If you can only deeply understand one folder in this project for an interview, make it this one.

## Purpose

Everything about running a mock interview — asking questions one at a time, capturing answers, and wrapping up — happens here, driven by messages over a WebSocket rather than a sequence of REST calls.

## Files in this module

| File | Responsibility |
|---|---|
| `router.py` | FastAPI WebSocket route (`/ws?token=...`) — authenticates the JWT, connects via `ConnectionManager`, and dispatches each inbound message to the right handler based on `type` |
| `connection_manager.py` | Tracks connected sockets per user; `send_json`/`disconnect`/`is_connected` |
| `session_store.py` | Thin wrapper around Redis reads/writes for session state (setup + interview keys, 2h TTL) |
| `handlers/setup_handler.py` | Collects the interview setup fields one at a time, then creates the interview |
| `handlers/interview_handler.py` | Asks each question, receives answer audio → transcribes → persists → advances; triggers completion |

There is no separate `dispatcher.py` or `schemas.py` — dispatch is a simple `if msg_type == ...` chain inside `router.py`, and message shapes are plain dicts documented in `client/src/types/index.ts` (the WebSocket message contract).

## Connection lifecycle, step by step

1. **Client connects** to `/ws?token=<JWT>`
2. `router.py` verifies the JWT (same logic as the REST auth dependency), reads `sub` as the user id, and registers the socket with `ConnectionManager`
3. The client sends `start_setup` or `start_interview` to begin a phase; each handler stores its session state in Redis via `session_store.py`
4. Setup state and interview state are **separate Redis keys** (`session:{user_id}:setup` and `session:{user_id}:interview`), each with a 2-hour TTL — enough for a full interview, short enough not to leak
5. When the interview phase's handler detects the last question was answered, it persists the transcript to Postgres and enqueues the Celery feedback task
6. The connection closes (client-initiated or server-initiated after completion)

## Setup phase — concept walkthrough (`handlers/setup_handler.py`)

The setup phase is a **small conversational form** driven by WebSocket messages, using the field sequence from `chains/question_gen.SETUP_QUESTIONS` / `next_setup_phase`:

- The server sends a `setup_question` message for the current field; the client replies with `setup_answer` (`{ field, value }`)
- Each answer is validated against the current expected field (a mismatch sends an `error` with `code="field_mismatch"`)
- The sequence is **role → interview_type → tech_stack → experience_level → difficulty → number_of_questions**. **Non-technical** interview types skip `tech_stack` (handled by the conditional edge in `next_setup_phase`).
- Once all fields are collected, `handle_setup_answer` creates the interview row via `modules/interview/service.create_interview` and sends `setup_complete` with the new `interview_id`

## Interview phase — concept walkthrough (`handlers/interview_handler.py`)

1. Client sends `start_interview` with the `interview_id` created during setup (or by the Practice page's `POST /api/interviews`)
2. The handler loads the interview detail, marks it `in_progress`, and builds a Redis session (question index, previous Q&A, role/type/stack/experience/difficulty)
3. `_send_next_question` calls `chains/question_gen.generate_next_question` (which is also where difficulty is coerced to `Easy/Medium/Hard`) and sends a `question` message
4. Client records locally, allows retry, and sends `submit_answer` with the question id + `audio_base64`
5. The handler validates the question id matches, base64-decodes the audio, and calls `stt.transcribe_audio` — **the raw audio is never written to disk or stored**
6. The transcript is persisted to Postgres (`Answer` row), appended to the session's Q&A history, and the next question is sent
7. When the last question is answered, `_complete_interview` persists the transcript, enqueues feedback generation (Celery), and sends `interview_complete`

## Why Redis, not just an in-memory Python dict, for session state

This is a **guaranteed follow-up question** if you mention WebSockets in an interview:
- A plain in-process dict would tie every session to exactly one running server process — if you ever run more than one API instance (or the process restarts), in-flight interviews would silently vanish
- Redis makes the session external to any single process, so any instance behind a load balancer can pick up the next message for a given `interview_id`

## Common interview questions this module should prepare you for

- "Walk me through what happens from the moment the browser opens the WebSocket to the first question being asked."
- "What happens if the connection drops mid-interview?" → session state lives in Redis, keyed by user id, so a reconnect can resume from wherever the phase left off (assuming the client re-sends `start_interview` with the same `interview_id`)
- "Why not just use Socket.IO or a simpler polling approach?" → raw WebSocket needs no extra library, and interview turns are latency-sensitive enough that polling would add a noticeable delay to a conversational feel
- "Where does the answer audio go?" → it's transcribed to text via Groq STT and discarded — only the transcript is stored, never the recording
