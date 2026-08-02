# `src/hooks/` — Interview Media & Realtime Hooks

These custom hooks are what make the live interview page work: camera preview, mic recording, audio playback, and the WebSocket connection itself. Kept as hooks (not inline component logic) so `InterviewSession` stays focused on layout/state, not raw browser media APIs.

## Hooks in this folder

| Hook | Responsibility |
|---|---|
| `useWebcam.ts` | Requests camera permission, exposes a live `MediaStream` for preview, handles cleanup on unmount |
| `useMicRecorder.ts` | Three variants — continuous, push-to-talk, generic — for capturing audio into a recordable blob |
| `useAudioPlayback.ts` | Plays back AI-generated TTS audio (question read-aloud) and/or the user's own recorded answer for review before submit |
| `useWebSocket.ts` | Owns the WebSocket connection lifecycle: connect, auth, send/receive typed messages, reconnect handling |

## `useWebcam.ts` — concept walkthrough
1. On mount, calls `navigator.mediaDevices.getUserMedia({ video: true })`
2. Stores the resulting `MediaStream` in state, exposes a `videoRef` for the component to attach to a `<video>` element
3. On unmount, explicitly stops every track on the stream — **this matters**: forgetting to stop tracks on unmount is the classic bug that leaves the camera's hardware light on after navigating away from the interview page
4. Exposes a `hasPermission` / `error` state so the UI can show a clear "camera access denied" message instead of a silently blank preview

## `useMicRecorder.ts` — why three variants instead of one
- **Continuous** — records the whole time a question is active, useful for a natural conversational flow where the user doesn't have to remember to press anything
- **Push-to-talk** — user holds a button while speaking, useful for noisy environments or when the user wants explicit control over exactly what gets captured
- **Generic** — a lower-level shared implementation the other two build on (start/stop/pause primitives), so continuous and push-to-talk aren't duplicating `MediaRecorder` boilerplate
- All three ultimately produce the same output shape (an audio `Blob` + duration), so the rest of the app (retry/submit logic) doesn't need to know which recording mode was used

## `useWebSocket.ts` — concept walkthrough
1. Opens the connection with the JWT as a query param: `wss://.../ws?token=...`
2. Exposes a typed `send(message)` function and a `lastMessage` (or event-callback) for the component to react to inbound messages — mirrors the `schemas.py` message shapes on the backend so both sides agree on the contract
3. Handles reconnect logic: if the connection drops mid-interview, the hook can attempt to reconnect using the same `session_id`, relying on the backend's Redis-backed session store to resume from wherever the interview left off (see `backend/app/websocket/README.md`)
4. Cleans up the connection on unmount (component leaving the interview page) to avoid a dangling open socket

## Why these are hooks and not logic embedded directly in `InterviewSession.jsx`
- Each hook wraps a **browser API with real cleanup requirements** (media streams, socket connections) — hooks' `useEffect` cleanup pattern is exactly the right shape for "acquire a resource on mount, release it on unmount"
- Keeping them separate also makes each one independently testable/mockable, and reusable if a future feature (e.g. a "camera test" page in Settings) needs the same webcam logic without the rest of the interview flow

## Common interview questions this folder should prepare you for
- "How do you make sure the camera turns off when the user leaves the page?" → `useWebcam`'s cleanup function explicitly stops every `MediaStreamTrack`, not just letting the component unmount and hoping garbage collection handles it
- "What happens on a dropped WebSocket connection mid-interview?" → the hook can reconnect using the same `session_id`; state resumption is the backend's responsibility via its Redis session store, not something the frontend hook re-derives itself
- "Why three separate recording modes?" → different UX needs (hands-free vs explicit control) built on one shared primitive, not three independent implementations