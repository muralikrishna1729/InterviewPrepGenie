<div align="center">

# 🧞 InterviewPrep Genie

**AI-powered voice interview simulator with resume analysis and MCQ practice**

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

</div>

---

## 📖 Overview

**InterviewPrep Genie** is a full-stack application for practicing job interviews with a real-time, AI-driven text interviewer (answers captured via webcam + mic and transcribed with speech-to-text). Beyond the core interview simulator, it bundles two supporting tools: an **AI resume analyzer** and an **MCQ (aptitude + role-specific) quiz generator** — giving candidates a complete self-prep loop from resume review to live mock interview to knowledge testing.

The core interview experience runs entirely over a **single authenticated WebSocket connection**, moving through a guided setup phase and an interactive question-and-answer phase, powered by an LLM (via Groq) orchestrated through **LangGraph**.

---

## ✨ Features

- 🎙️ **Live AI Text Interview** — role-specific questions generated on the fly, real-time answer capture via webcam + mic (transcribed with speech-to-text), retry/re-record support before submitting an answer
- 📄 **Resume Analyzer** — upload a PDF/DOCX resume, get an AI-scored breakdown of strengths, weaknesses, and ATS-friendliness
- 📝 **MCQ Practice** — auto-generated aptitude + job-specific multiple-choice quiz from a pasted job description, with AI feedback on results
- 📊 **Interview History & Feedback** — past sessions, per-interview feedback, and full transcript logs
- 🔐 **JWT Authentication** — signup/login/logout with Redis-backed token blacklist
- ⚙️ **Async Task Processing** — resume scoring, MCQ generation, and interview feedback all run as background Celery tasks so the API stays responsive
- 🐳 **Fully Dockerized** — one command spins up Postgres, Redis, the API, and the Celery worker together

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand (state), React Router |
| **Backend API** | FastAPI (Python), Alembic (migrations), SQLAlchemy (async) |
| **Database** | PostgreSQL |
| **Cache / Session Store** | Redis |
| **Background Jobs** | Celery (resume scoring, MCQ generation, feedback generation) |
| **Real-time Layer** | WebSocket (`/ws?token=JWT`) |
| **AI Orchestration** | LangGraph (interview flow graph) |
| **LLM & Speech** | Groq (LLM inference + speech-to-text) |
| **Auth** | JWT + bcrypt, Redis token blacklist |
| **Infra** | Docker, Docker Compose |

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend - React + TS + Vite"]
        UI[Practice / Interview / Dashboard / Settings UI]
        Hooks["Hooks: useWebcam, useMediaRecorder, useWebSocket, useInterviewSession"]
    end

    subgraph API["FastAPI Backend"]
        Auth[Auth Module: signup / login / logout / profile]
        InterviewCRUD[Interview REST CRUD: create / list / detail / status]
        WS[WebSocket Handler: setup phase to interview phase]
        Resume[Resume Module: upload to parse to score]
        MCQ[MCQ Module: generate to grade to feedback]
    end

    subgraph Async["Background Processing"]
        Celery[Celery Workers]
    end

    subgraph AI["AI Layer"]
        LangGraph[LangGraph Interview Flow]
        Groq[Groq LLM + STT]
    end

    subgraph Data["Data Layer"]
        Postgres[(PostgreSQL)]
        RedisDB[(Redis: sessions + token blacklist)]
    end

    UI -->|REST| Auth
    UI -->|REST| InterviewCRUD
    UI -->|REST| Resume
    UI -->|REST| MCQ
    Hooks <-->|WebSocket| WS

    WS --> LangGraph
    LangGraph --> Groq

    Resume --> Celery
    MCQ --> Celery
    WS --> Celery

    Auth --> Postgres
    Auth --> RedisDB
    InterviewCRUD --> Postgres
    WS --> RedisDB
    WS --> Postgres
    Celery --> Postgres
    Celery --> Groq
```

---

## 🔌 WebSocket Interview Flow

The interview itself is driven entirely through one WebSocket connection, moving through two phases: **setup** and **interview**.

```mermaid
sequenceDiagram
    participant U as User Browser
    participant WS as WebSocket Handler
    participant R as Redis Session Store
    participant LG as LangGraph
    participant G as Groq LLM and STT
    participant DB as PostgreSQL

    U->>WS: Connect /ws?token=JWT
    WS->>WS: Authenticate token
    WS->>R: Create session

    rect rgb(235, 240, 255)
    Note over U,LG: Setup Phase
    WS->>U: Ask for role, interview type, tech stack, experience, question count
    U->>WS: Submit setup answers
    WS->>R: Store session config
    end

    rect rgb(230, 250, 240)
    Note over U,G: Interview Phase
    loop For each question
        WS->>LG: Request next question
        LG->>G: Generate question context-aware
        G-->>LG: Question text
        LG-->>WS: Question
        WS->>U: Send question
        U->>U: Record answer webcam plus mic
        U->>U: Retry or re-record if needed
        U->>WS: Submit final answer audio or text
        WS->>G: Transcribe via STT if audio
        G-->>WS: Transcript
        WS->>R: Append to session transcript
    end
    end

    rect rgb(255, 245, 230)
    Note over WS,DB: Completion
    WS->>DB: Persist transcript and answers
    WS->>Celery: Queue feedback generation task
    Celery->>G: Generate feedback
    G-->>Celery: Feedback result
    Celery->>DB: Save feedback
    WS->>U: Interview complete, redirect to feedback
    end
```

**Key points:**
- Setup phase collects **role, interview type, tech stack, experience level, and question count** before any questions are asked
- Each question is generated dynamically based on prior context (not a static bank)
- Answers can be **re-recorded before submission** — nothing is sent to the backend until the user confirms
- Full transcript is persisted to PostgreSQL; feedback generation is offloaded to a Celery task so the WebSocket connection isn't blocked waiting on the LLM

---

## 📁 Project Structure

```
interview-prep-genie/
├── client/
│   ├── src/
│   │   ├── appshell/        # routed app UI: Dashboard, Practice, MCQs, Resume, Settings, session
│   │   ├── pages/           # auth + setup/results pages
│   │   ├── layouts/         # ProtectedRoute, PublicLayout
│   │   ├── hooks/           # webcam, media recorder, websocket, interview session
│   │   ├── services/        # Axios API clients (auth, interview, mcq, resume)
│   │   ├── store/           # Zustand (auth, session, theme)
│   │   └── types/
│   └── package.json
│
├── server/
│   ├── app/
│   │   ├── modules/         # auth, interview, websocket, resume, mcq
│   │   ├── ai/              # Groq + LangGraph service wrappers + chains
│   │   ├── tasks/           # Celery tasks (feedback, resume, mcq)
│   │   ├── db/models/       # SQLAlchemy models
│   │   ├── celery_app.py
│   │   └── main.py
│   ├── alembic/             # DB migrations
│   └── pyproject.toml       # uv-managed deps
│
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- A Groq API key

### Environment Variables
Create a `.env` file in the project root:

```env
POSTGRES_USER=prepuser
POSTGRES_PASSWORD=preppass
POSTGRES_DB=prep_genie_db
DATABASE_URL=postgresql+asyncpg://prepuser:preppass@postgres:5432/prep_genie_db
REDIS_URL=redis://redis:6379/0
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=your_jwt_secret_here
```

### Run with Docker Compose

```bash
docker compose up -d --build
docker compose logs -f api
```

This starts four services: `postgres`, `redis`, `api` (FastAPI, live reload), and `celery_worker`.

Verify the stack is healthy:

```bash
docker compose ps
curl http://localhost:5000/health
# Expected: {"status": "ok"}
```

### Frontend (local dev)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`, backend API at `http://localhost:5000`.

### Stopping the stack

```bash
docker compose down
```

---

## 📡 API Overview

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/profile` |
| **Interview** | `POST /interviews`, `GET /interviews`, `GET /interviews/:id`, `PATCH /interviews/:id/status`, `POST /interviews/:id/model-answers` |
| **WebSocket** | `WS /ws?token=JWT` — setup + interview flow |
| **Resume** | `POST /resume/analyze`, `GET /resume/:id` |
| **MCQ** | `POST /mcq/generate`, `GET /mcq/:id`, `POST /mcq/:id/submit` |

All routes are prefixed with `/api` (e.g. `POST /api/interviews`).

Full interactive API docs available at `http://localhost:5000/docs` (FastAPI Swagger UI) once the backend is running.

---

## 🗄️ Database Schema (simplified)

```
User --< Interview --< Question --< Answer
              |
              +--< Feedback
              +--< TranscriptChunk

User --< ResumeAnalysis   (persisted; Celery fills strengths/weaknesses/ats_tips)
User --< McqSession       (persisted; Celery generates questions + feedback)
```

---

## 🧠 Technical Deep Dive — Why It's Built This Way

The parts of this project most worth being able to explain in an interview aren't the CRUD endpoints — they're the design decisions below. Each one covers **what it does, why it was built that way, and what the tradeoff is**.

### 1. Why a single WebSocket connection instead of multiple REST calls
The interview itself (setup → questions → answers → completion) all happens over **one** WebSocket connection (`/ws?token=JWT`), not a series of REST requests.
- **Why:** an interview is inherently a stateful, multi-turn conversation — the next question depends on everything said before it, and the client needs to receive server-pushed content (new questions, transcripts) without polling. A single persistent connection avoids re-authenticating on every turn and avoids the latency of round-tripping through HTTP for something this chatty.
- **Tradeoff:** WebSocket state is harder to horizontally scale than stateless REST — hence the Redis session store described below, so any API instance can pick up an in-flight session rather than requiring "sticky" connections to one server process.

### 2. Two-phase state machine: Setup → Interview
The WebSocket handler isn't one flat loop — it's split into two explicit phases (`setup.handler.ts` equivalent → `interview-response.handler.ts` equivalent).
- **Why:** cleanly separating "collecting interview parameters" from "asking/grading questions" keeps each handler small and testable, and makes it obvious where in the conversation a dropped connection failed — you know whether to resume from setup or resume mid-question.
- **How:** the session object in Redis carries a `phase` field; the handler dispatches incoming messages based on current phase rather than one giant switch statement covering the whole interview.

### 3. Why LangGraph instead of a plain function-calling loop
Question generation is orchestrated through **LangGraph** rather than a simple "call the LLM, get a question" loop.
- **Why:** LangGraph models the interview as an explicit graph of steps (generate question → wait for answer → evaluate → decide next question difficulty/topic → repeat), which makes the flow's state transitions visible and debuggable, instead of being implicit in a chain of if/else branches inside one function.
- **Interview-defensible answer if asked "why not just prompt-chain manually":** manual chaining works for a fixed sequence, but this flow needs conditional branching (e.g. adjusting difficulty based on a weak answer) and needs to be resumable mid-session — a graph structure represents that more explicitly than nested conditionals.

### 4. Redis as the session store (not just a cache)
Redis isn't used here for caching — it holds the **live, in-progress interview session state** (current phase, question count, answers-so-far) while the interview is happening.
- **Why:** PostgreSQL is for durable, finished records (completed interviews, feedback); Redis holds transient, fast-changing state that only needs to survive for the duration of one session and benefits from sub-millisecond read/write during a real-time conversation.
- **On completion:** the session is flushed from Redis into PostgreSQL as the permanent transcript/answer record, and the Redis key is cleared.

### 5. The answer capture pipeline (webcam + mic → retry → submit)
Recording isn't sent to the backend the moment the user stops talking — there's a **local review step** first.
- **Flow:** mic/webcam capture locally → user can retry (discard and re-record) as many times as needed → only on explicit "Submit" does the recorded answer get sent over the WebSocket for transcription/scoring.
- **Why:** sending audio immediately on every stop would mean every false start or stumble becomes a permanent, gradeable answer. Keeping the recording client-side until confirmed submission protects the user from a single bad take ruining a question, without needing any "undo" logic on the backend.

### 6. Why feedback generation is offloaded to Celery, not done inline on the WebSocket
When an interview ends, feedback generation (an LLM call scoring the whole transcript) happens as an **async Celery task**, not synchronously before telling the user "done."
- **Why:** LLM calls for a full-transcript evaluation can take several seconds — blocking the WebSocket (and the user's browser tab) on that would make the "end of interview" moment feel frozen. Queuing it lets the API immediately confirm completion and the frontend can poll/subscribe for feedback readiness separately.
- **Same pattern reused for:** resume scoring and MCQ generation/grading — anything involving an LLM call that isn't needed for the *next* immediate user action is pushed to a Celery worker.

### 7. Resume Analyzer — persisted, processed asynchronously
Resume uploads are accepted as a multipart file (PDF/DOCX, 5MB cap), parsed synchronously, and the extracted text is queued to a Celery task. The analysis record (score, strengths, weaknesses, grammar, ATS tips, improvements) is persisted to a `resume_analyses` table, and the frontend polls `GET /api/resume/:id` until it completes.
- **Why async:** LLM scoring takes seconds, so the upload endpoint returns immediately (202) and the result is filled in by the worker — the API stays responsive.
- **Design note:** the uploaded file bytes are not written to disk; only the extracted analysis is stored, so past analyses remain viewable by id without storing raw documents.

### 8. MCQ sessions — persisted, with the answer key stripped client-side
MCQ sessions are stored in a `mcq_sessions` table. Questions are generated by a Celery task; the server-side JSON keeps `correct_index` (the answer key) but the API strips it before sending to the frontend (`McqQuestionForClient`), so the key is never exposed to the client. On submit the answers are graded server-side and a follow-up Celery task produces AI feedback.
- **Why strip the answer key:** the correct answer must never reach the browser before grading — that would make the quiz trivially gameable. The key stays in the DB JSON and is only used when grading.
- **Tradeoff:** the current model still blocks submit until Celery finishes generating feedback, but the core grading is synchronous and immediate.

### 9. Auth: JWT + Redis blacklist (not just stateless JWT)
Logout isn't just "delete the token client-side" — logged-out tokens are added to a **Redis blacklist** that's checked on every authenticated request/connection.
- **Why:** plain JWTs are stateless and can't be "revoked" once issued — without a blacklist, a stolen or copied token would stay valid until it naturally expires, even after the user hits logout. Redis gives just enough server-side state to support real revocation without giving up JWT's main benefit (not hitting Postgres on every request to check session validity).

### 10. Docker Compose dev setup — the live-mount + anonymous-volume trick
The Docker Compose config bind-mounts the whole project folder into the containers (`.:/app`) **plus** a separate anonymous volume just for `.venv` (`/app/.venv`).
- **Why the bind mount:** without it, the container only has whatever was baked in at `docker build` time — every code change would require a full image rebuild, defeating live development.
- **Why the extra `.venv` exclusion matters:** mounting the whole host folder over `/app` would otherwise also overwrite the container's own Linux-built `.venv` with the host's Windows-native one — breaking every native dependency (e.g. `asyncpg`, `bcrypt`) immediately. The anonymous volume tells Docker "exclude this one subfolder from the bind mount, keep the container's own copy." It's a small line with an outsized effect on whether the stack boots at all.
- **Auto-migration on boot:** the API container runs `alembic upgrade head` before starting uvicorn, so the schema is always current on every `docker compose up` without a manual migration step.

---

## 🧭 Roadmap

- [ ] End-to-end testing of the WebSocket interview flow against a real connection
- [ ] Real Groq-call testing for resume upload and MCQ generation
- [x] MCQ + resume persistence (Postgres-backed, answer key stripped client-side)
- [x] Interview session state on Redis
- [ ] Production-hardened Docker image (currently dev-mode with live reload)
- [ ] Text-to-speech playback of questions (currently text-only; STT input works)

---

## 📄 License

This project is for educational/portfolio purposes.

---

<div align="center">
Built as part of an interview-prep portfolio project.
</div>