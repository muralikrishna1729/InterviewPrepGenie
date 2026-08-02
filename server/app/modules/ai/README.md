# `app/modules/ai/` — Groq Client Wrappers & LLM Chains

This module is the "brain" behind question generation, answer transcription, and feedback/resume/MCQ scoring. It's the part most worth understanding conceptually (not necessarily line-by-line) since it's the piece most likely to draw "why did you use X instead of Y" questions.

## Files in this module

| File | Responsibility |
|---|---|
| `client.py` | Lazily-initialized Groq async client (shared instance) |
| `llm.py` | `generate_completion` + `generate_structured` — the two LLM primitives every chain uses; normalizes Groq errors into `AIServiceError` |
| `stt.py` | Speech-to-text wrapper — transcribes submitted answer audio via Groq's STT endpoint |
| `tts.py` | Text-to-speech wrapper (available; not currently used in the interview loop) |
| `chains/question_gen.py` | Builds the next interview question from role/type/stack/experience/difficulty + prior Q&A; owns the setup-phase field sequence |
| `chains/feedback_gen.py` | Generates the post-interview feedback report from the full transcript |
| `chains/mcq_gen.py` | Generates 20 mixed-type MCQ questions from a job description (structured output) |
| `chains/resume_analysis.py` | Scores a resume against an optional job description (structured output) |

## The two LLM primitives in `llm.py`

Every chain funnels through these two functions, so error handling, JSON parsing, and model selection live in exactly one place.

- **`generate_completion(messages, model, ...)`** — raw text completion. Wraps every Groq error into a normalized `AIServiceError` with a `retryable` flag (connection/rate-limit → retryable; auth/invalid → not), logs latency, and returns the message content.
- **`generate_structured(messages, response_model, ...)`** — JSON-mode completion validated into a Pydantic model. Appends a compact schema hint to the system prompt (a short `- "field": type` list — full `model_json_schema()` output with `$defs`/`anyOf` confuses LLMs), forces `response_format={"type": "json_object"}`, tolerantly extracts the JSON block from the reply (strips markdown fences, finds the first balanced `{...}`/`[...]`), and **retries once** with a "fix the property names and types" nudge on parse/validation failure before raising `AIServiceError`.

**Model choices:** `MODEL_STANDARD = llama-3.3-70b-versatile` for anything needing structured reasoning (question gen, feedback, resume, MCQ); `MODEL_FAST = llama-3.1-8b-instant` for lighter calls like the one-paragraph post-quiz feedback.

## Why structured output instead of "just ask for JSON"

- The consumer (a Celery task, a chain) needs a **validated object**, not text to parse and hope. `generate_structured` guarantees the result satisfies the Pydantic schema (or raises a normalized error the caller can surface).
- The retry-with-hint loop measurably improves reliability on non-deterministic LLM output — a single parse failure is retried against the same conversation before giving up.

## The chains

- **`question_gen.py`** — turns (role, interview type, tech stack, experience, difficulty, previous Q&A) into the next interview question. It also owns `SETUP_QUESTIONS` + `next_setup_phase`, the fixed sequence the WebSocket setup phase walks through (role → type → tech_stack → experience → question count).
- **`feedback_gen.py`** — given the full transcript of the interview, produces the structured post-interview feedback (strengths/weaknesses/improvements/score) that the results page shows.
- **`mcq_gen.py`** — prompts for exactly 20 mixed-type questions (aptitude, job-specific, situational, code-output) grounded on a pasted job description.
- **`resume_analysis.py`** — strict ATS-style scoring rubric; scores a resume against an optional job description, clamped to 0-100.

## What this module does NOT do

It has no knowledge of WebSockets, Redis, or HTTP. It's pure orchestration/LLM-I/O. The WebSocket handlers (`app/websocket/`) and Celery tasks (`app/tasks/`) are the only callers.

## Common interview questions this module should prepare you for

- "How do you make LLM calls reliable / handle rate limits?" → normalized `AIServiceError` with a `retryable` flag, centralized in `llm.py`; callers decide whether to surface or retry.
- "How does the answer audio become text?" → `stt.py` transcribes it; the raw audio is never written to disk or stored (see `websocket/README.md`).
- "How do you guarantee the LLM returns the JSON shape you need?" → `generate_structured` with a compact schema hint, JSON mode, tolerant extraction, and one retry.
