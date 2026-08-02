# Notes for AI — read before building

## Salvaged hooks (in /client/_salvage)
- `useWebcam.ts` — working webcam preview hook, reuse as-is or adapt into services/hooks
- `useMicRecorder.ts` — working mic recording hook with blobToBase64 helper. 
  Note: Prompt 1 needs a SINGLE MediaRecorder capturing video+audio together 
  (not separate mic-only) for the interview session — adapt this pattern, 
  don't reuse the audio-only approach directly.

## Backend API (FastAPI, already built) — actual routes, don't invent different ones

**Auth** (`/api/auth`)
- POST /api/auth/signup — returns { access_token }
- POST /api/auth/login — returns { access_token }
- POST /api/auth/logout — 204 no content
- GET /api/auth/profile — current user

**Interviews** (`/api/interviews`)
- POST /api/interviews — create interview
- GET /api/interviews — list interviews (supports query params)
- GET /api/interviews/{id} — full detail by ID
- PATCH /api/interviews/{id}/status — update status

**MCQ** (`/api/mcq`)
- POST /api/mcq/generate
- GET /api/mcq/{id}
- POST /api/mcq/{id}/submit

**Resume** (`/api/resume`)
- POST /api/resume/analyze
- GET /api/resume/{id}

**WebSocket**
- ws://<host>/ws?token=<jwt> — auth via token query param

## Additional salvaged files
- `useWebSocket.ts` — solid, reusable WebSocket hook: handles connect/reconnect, 
  token-based auth via URL query param, StrictMode-safe, exposes onMessage/onOpen/
  onClose/onError callbacks + sendMessage(). Use as-is, just verify VITE_WS_URL 
  matches the FastAPI backend port.
- `authStore.ts` — good token+user Zustand store shape. ONE CHANGE NEEDED: 
  currently persists to sessionStorage — Prompt 1 requires the JWT in a cookie 
  instead, so update the persist middleware accordingly (or drop persist entirely 
  and handle cookie reading/writing separately per Prompt 1's spec).
- `tailwind.config.js` (copied to /client root, not _salvage) — keep the shadows/
  radius/keyframes/animations as-is, but REPLACE the `colors` block (brand/violet/
  slate) with the new design tokens from Prompt 1 (--bg-base #0B0E14, --primary 
  #6C5CE7, --accent-mint #2DD4A7, etc.)


## Important
- No API versioning prefix currently (routes are /api/..., not /api/v1/...)
- CORS currently permissive (all origins) — fine for local dev
- JWT auth: Bearer token in Authorization header (not cookie-based on backend yet — 
  Prompt 1 says store in cookie client-side, so client sets its own cookie and 
  reads it into the Authorization header via Axios interceptor)