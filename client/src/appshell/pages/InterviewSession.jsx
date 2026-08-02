import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  Mic, RotateCcw, Send, StopCircle,
  CheckCircle2, AlertTriangle, FileText, Loader2, WifiOff,
  Maximize, Minimize
} from 'lucide-react';

import { useWebcam } from '../../hooks/useWebcam';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { useInterviewSession } from '../../hooks/useInterviewSession';
import { useSessionStore } from '../../store/sessionStore';

// ─── Live transcript via Web Speech API (self-review only) ───────────────────
// Fix 5: finalized segments and the in-progress interim segment are tracked
// separately. setFinalText uses the functional form so committed text is never
// rewritten or duplicated by later interim events.
function useLiveTranscript(active) {
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (active) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      recognitionRef.current = rec;
      setFinalText('');
      setInterim('');

      rec.onresult = (e) => {
        let newInterim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            setFinalText((prev) => prev + chunk + ' ');
          } else {
            newInterim = chunk;
          }
        }
        setInterim(newInterim);
      };

      rec.onerror = () => { };          // suppress browser permission denials
      rec.onend = () => {
        // auto-restart while still active (browser often stops after silence)
        if (recognitionRef.current === rec && active) {
          try { rec.start(); } catch { }
        }
      };

      try { rec.start(); } catch { }

      return () => {
        recognitionRef.current = null;
        try { rec.stop(); } catch { }
      };
    } else {
      // stop when recording ends
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
        recognitionRef.current = null;
      }
    }
  }, [active]);

  return { finalText, interim, transcript: finalText + interim };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SessionProgress({ current, total, elapsedMs, onEnd, isFullscreen, onToggleFullscreen }) {
  const pct = Math.min(100, Math.round(((current - 1) / Math.max(total, 1)) * 100));
  const mm = Math.floor(elapsedMs / 60000).toString().padStart(2, '0');
  const ss = Math.floor((elapsedMs % 60000) / 1000).toString().padStart(2, '0');

  return (
    // Compact floating strip — top-left corner, does not stretch full width
    <div className="flex items-center gap-2 mb-1 shrink-0">
      {/* Pill-shaped counter */}
      <span className="text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] border border-[var(--border)] rounded-full px-3 py-1 tabular-nums whitespace-nowrap">
        Q {current}/{total}
      </span>

      {/* Mini progress bar */}
      <div className="w-24 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {/* Timer */}
      <span className="text-xs tabular-nums text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] border border-[var(--border)] rounded-full px-3 py-1">
        {mm}:{ss}
      </span>

      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        className="p-1.5 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
      </button>

      {/* End interview — pushed to the right */}
      <Button variant="destructive" className="ml-auto px-3 py-1 text-xs" onClick={onEnd}>End Interview</Button>
    </div>
  );
}

function QuestionPanel({ current, total, category, text, loading }) {
  return (
    <Card className="border border-[var(--border)] p-4 shrink-0">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 bg-indigo-900/30 rounded-full px-3 py-1">
          Question {current} of {total}
        </span>
        {category && (
          <span className="text-xs font-semibold rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] px-3 py-1 uppercase tracking-wider border border-[var(--border)]">
            {category}
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-4 flex items-center gap-3 text-[var(--text-secondary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-lg">Waiting for question…</span>
        </div>
      ) : (
        <h2 className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight max-h-[16vh] overflow-y-auto">
          {text}
        </h2>
      )}
    </Card>
  );
}

function TranscriptStrip({ items }) {
  if (!items || !items.length) return null;
  return (
    <Card className="p-4 shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Answered so far</h3>
        <span className="text-xs text-[var(--text-secondary)]">{items.length} complete</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-24 overflow-hidden">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
            <span className="truncate">{it.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Live Transcript Panel ────────────────────────────────────────────────────

function LiveTranscriptPanel({ finalText, interim, isRecording }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [finalText, interim]);

  const SpeechAvailable =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    // Fix 3: h-full so this card stretches to the camera panel height (grid uses items-stretch).
    // The outer card is fixed to the row height; only the inner scroll area overflows.
    <Card className="flex flex-col border border-[var(--border)] h-full">
      {/* Header — fixed height */}
      <div className="flex items-center gap-2 shrink-0">
        <FileText className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Live transcript
        </h3>
        <span className="ml-auto text-xs text-[var(--text-secondary)] italic">for your reference only</span>
      </div>
      {!SpeechAvailable && (
        <p className="text-xs text-[var(--text-secondary)] mt-2 shrink-0">
          Your browser doesn't support live transcription. Chrome or Edge recommended.
        </p>
      )}
      {SpeechAvailable && !isRecording && !finalText && !interim && (
        <p className="text-xs text-[var(--text-secondary)] mt-2 shrink-0">
          Transcript will appear here once you start answering…
        </p>
      )}
      {/* Scrollable area — grows to fill remaining height, scrolls on overflow.
          Fix 5: finalized text lives in its own stable node; the live interim
          segment is rendered separately (greyed/italic) so partial updates only
          touch that small span, never re-rendering the whole transcript block. */}
      <div
        ref={scrollRef}
        className="mt-3 flex-1 overflow-y-auto text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap min-h-0"
      >
        {finalText && <div>{finalText}</div>}
        {interim && <span className="text-gray-400 italic">{interim}</span>}
        {!finalText && !interim && (isRecording ? <span className="animate-pulse">Listening…</span> : null)}
      </div>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const {
    currentQuestion,
    phase,
    setPhase,
    setupPayload,
    answered = [],
  } = useSessionStore();

  const total = currentQuestion?.total_questions ?? setupPayload?.number_of_questions ?? 10;
  // order_index is 0-based from the WS; display 1-based ("Question 1 of 10").
  const current = (currentQuestion?.order_index ?? 0) + 1;
  const category = currentQuestion?.category ?? undefined;
  const questionText = currentQuestion?.question_text ?? '';
  const questionLoading = !currentQuestion;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Webcam / recording hooks
  const { videoRef, streamRef, startWebcam } = useWebcam({ audio: true });
  const { isRecording, duration, startRecording, stopRecording, blobToBase64 } = useMediaRecorder();
  const { submitAnswer, endInterview, wsError, setWsError, connectionStatus } = useInterviewSession(sessionId);

  const [blob, setBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const submitSuccessTimerRef = useRef(null);

  // Clear any pending success timer on unmount to avoid setState-after-unmount
  useEffect(() => {
    return () => {
      if (submitSuccessTimerRef.current) {
        clearTimeout(submitSuccessTimerRef.current);
      }
    };
  }, []);

  // Corner PIP ref — always shows live stream
  const cornerVideoRef = useRef(null);

  // Live transcript (Web Speech API — for self-review only, NOT submitted)
  const { finalText: liveFinalText, interim: liveInterim } = useLiveTranscript(isRecording);

  // Beforeunload prompt to mitigate session loss
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (phase !== 'pre-check' && phase !== 'complete') {
        e.preventDefault();
        e.returnValue = 'You have an interview in progress — are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // ── Mount: start webcam only (WS is held until user clicks Begin) ──────────
  useEffect(() => {
    startWebcam().catch(() => { });
    setPhase('pre-check'); // hold WS connection until user gesture (for fullscreen)
  }, []); // intentional empty deps — only run once on mount

  // ── Wire corner PIP to the live stream ───────────────────────────────────
  // Poll briefly because streamRef.current may not be ready synchronously
  useEffect(() => {
    if (cornerVideoRef.current && streamRef.current) {
      cornerVideoRef.current.srcObject = streamRef.current;
      return;
    }
    const id = setInterval(() => {
      if (cornerVideoRef.current && streamRef.current) {
        cornerVideoRef.current.srcObject = streamRef.current;
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }); // no dep array — re-runs each render so corner always tracks stream

  // ── Manage main video srcObject vs blob URL ───────────────────────────────
  // Bug 3 fix: when a blob exists, clear srcObject and use blob URL.
  // When no blob, attach live stream back to main video.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (blob) {
      // Stop live stream from main video — play the recording instead
      vid.srcObject = null;
      const url = URL.createObjectURL(blob);
      vid.src = url;
      vid.controls = true;
      vid.muted = false;
      vid.load();
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      // Re-attach live stream
      vid.src = '';
      vid.controls = false;
      if (streamRef.current) {
        vid.srcObject = streamRef.current;
        vid.muted = true;
      }
    }
  }, [blob]);

  // ── Defensive re-attach for the main video ────────────────────────────────
  // startWebcam resolves asynchronously (after mount), and the session-phase
  // <video> element is a different node from the pre-check one. If the [blob]
  // effect ran before the stream was ready, the main video would stay black.
  // Poll briefly until the live stream is attached (mirrors the corner-PIP
  // pattern above).
  useEffect(() => {
    if (!blob) {
      const attach = () => {
        const vid = videoRef.current;
        if (!vid) return true; // no element yet — keep polling
        if (vid.srcObject === streamRef.current) return true; // already attached
        if (streamRef.current) {
          vid.srcObject = streamRef.current;
          vid.muted = true;
          return true;
        }
        return false; // stream not ready yet — keep polling
      };
      if (attach()) return;
      const id = setInterval(() => {
        if (attach()) clearInterval(id);
      }, 200);
      return () => clearInterval(id);
    }
  }, [blob, phase]);

  // ── Elapsed timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsedMs((ms) => ms + 1000), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Bug 9: navigate to results when WS signals interview_complete ─────────
  useEffect(() => {
    if (phase === 'complete') {
      const interviewId =
        useSessionStore.getState().interviewId ?? sessionId;
      navigate(`/practice/session/${interviewId}/results`, { replace: true });
    }
  }, [phase, navigate, sessionId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onStart = async () => {
    if (!streamRef.current) return;
    setBlob(null);
    await startRecording(streamRef.current);
  };

  const onStop = async () => {
    const b = await stopRecording();
    if (b && b.size > 0) {
      setBlob(b);
    }
  };

  const onRetry = () => {
    setBlob(null);
    // Re-attach live stream immediately
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.controls = false;
    }
  };

  const onSubmit = async () => {
    if (!blob || !currentQuestion) return;
    try {
      setSubmitting(true);
      setWsError(null);
      setSubmitSuccess(false);
      const b64 = await blobToBase64(blob);
      await submitAnswer(b64, currentQuestion.question_id ?? String(current));
      setBlob(null);
      // Brief visual confirmation before the next question arrives via WS.
      setSubmitSuccess(true);
      if (submitSuccessTimerRef.current) clearTimeout(submitSuccessTimerRef.current);
      submitSuccessTimerRef.current = setTimeout(() => setSubmitSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setSubmitSuccess(false);
      setWsError({
        code: 'submission_failed',
        message: err.message || 'Failed to submit your answer. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndConfirmed = () => {
    setConfirmEnd(false);
    endInterview();
    // phase will become 'complete' via WS, which triggers the useEffect above
  };

  // ── Fullscreen on the interview content container ─────────────────────────
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => console.log('[Fullscreen blocked]', err));
    } else {
      document.exitFullscreen().catch((err) => console.log(err));
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Begin interview: single user-gesture that requests fullscreen + opens WS ─
  const onBeginInterview = useCallback(() => {
    // Request fullscreen first (must be in a direct user gesture handler)
    if (containerRef.current && !document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        // Fullscreen blocked/denied — continue without it, interview must not block
        console.log('[Fullscreen blocked, continuing without it]', err);
      });
    }
    // Enable the WebSocket by transitioning out of pre-check
    setPhase('connecting');
  }, [setPhase]);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasBlob = !!blob;

  // ── Pre-check gate: shown before WS is enabled; user gesture enables fullscreen ─
  if (phase === 'pre-check') {
    return (
      <div
        ref={containerRef}
        className="min-h-[60vh] flex flex-col items-center justify-center gap-8"
        style={isFullscreen ? { background: 'var(--bg-base)', height: '100vh', width: '100vw', padding: '2rem' } : {}}
      >
        {/* Camera preview */}
        <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-[var(--border)]">
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          <div className="absolute inset-0 flex items-end p-4">
            <span className="text-xs text-white/60 bg-black/50 rounded-full px-3 py-1">Camera preview — adjust before starting</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Ready to begin?</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            Make sure your camera and microphone are working, then click below. The interview will start immediately.
          </p>
        </div>

        <Button
          onClick={onBeginInterview}
          className="px-8 py-3 text-base"
        >
          <Maximize className="w-4 h-4 mr-2" />
          Begin Interview
        </Button>
      </div>
    );
 }

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-hidden gap-3"
      style={{
        height: '100vh',
        ...(isFullscreen ? { background: 'var(--bg-base)', padding: '1rem', width: '100vw' } : {}),
      }}
    >
      {/* 1) Compact progress strip */}
      <SessionProgress
        current={current}
        total={total}
        elapsedMs={elapsedMs}
        onEnd={() => setConfirmEnd(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* End confirmation */}
      {confirmEnd && (
        <Card className="p-4 shrink-0">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)]">End interview?</div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                You'll stop here and view results so far. This can't be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" onClick={() => setConfirmEnd(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleEndConfirmed}>End now</Button>
            </div>
          </div>
        </Card>
      )}

      {/* WS Error banner — shows backend errors like "Interview not found" */}
      {wsError && (
        <Card className="border border-red-500/40 p-4 shrink-0">
          <div className="flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Connection error</div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{wsError.message}</p>
              {wsError.code === 'not_found' && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  The interview session could not be found. Try starting a new interview from Practice.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Reconnecting banner */}
      {connectionStatus === 'reconnecting' && (
        <Card className="border border-yellow-500/40 bg-yellow-500/5 p-4 shrink-0">
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-yellow-500 animate-spin shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Reconnecting...</div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">We lost connection to the server. Attempting to reconnect...</p>
            </div>
          </div>
        </Card>
      )}

      {/* Disconnected/Failed reconnection banner */}
      {connectionStatus === 'disconnected' && phase !== 'pre-check' && phase !== 'complete' && (
        <Card className="border border-red-500/40 bg-red-500/5 p-4 shrink-0">
          <div className="flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Connection lost</div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Please refresh the page to reconnect and resume the interview.</p>
            </div>
          </div>
        </Card>
      )}

      {/* 2) Question panel — show loading state when no question yet */}
      <QuestionPanel
        current={current}
        total={total}
        category={category}
        text={questionText}
        loading={questionLoading}
      />

      {/* 3+4+5) Camera area + controls + live transcript — items-stretch keeps both panels equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-stretch flex-1 min-h-0">

        {/* Camera card with PIP overlay — Bug 2 fix: corner is absolute INSIDE main container */}
        <Card className="border border-[var(--border)] overflow-hidden p-4 flex flex-col min-h-0">
          {/* Unified video container — PIP corner is positioned inside this.
              Classic 4:3 camera shape, centered, capped at 640px wide and
              55vh tall so the whole interview still fits one viewport
              (page is overflow-hidden, grid row is flex-1 min-h-0). */}
          <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] max-h-[55vh] rounded-xl overflow-hidden bg-black shadow-inner">

            {/* Main video — Fix 2: mirrored with scaleX(-1) for natural self-view.
                The CSS transform is display-only; recorded Blob data is NOT flipped. */}
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Corner PIP: live cam — always visible, absolutely inside the main container */}
            {hasBlob && (
              <div className="absolute top-3 right-3 z-20 w-36 aspect-video rounded-lg border-2 border-white/70 shadow-lg overflow-hidden bg-black">
                {/* Fix 2: corner PIP also mirrored for consistency */}
                <video
                  ref={cornerVideoRef}
                  muted
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            )}

            {/* Recording overlay */}
            {isRecording && (
              <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-sm font-medium z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span>Recording</span>
                <span className="text-slate-400">|</span>
                <span className="tabular-nums">
                  {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Review badge */}
            {hasBlob && !isRecording && (
              <div className="absolute bottom-3 left-3 bg-indigo-700/90 px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-sm font-medium z-10">
                <span>Review your answer</span>
              </div>
            )}
          </div>

          {/* Bug 4 — Explicit app-styled Start / Stop / Retry / Submit buttons */}
          <div className="flex flex-wrap items-center gap-3 justify-center mt-3 shrink-0">
            {/* Start Answer — only when idle (no blob, not recording) */}
            {!isRecording && !hasBlob && (
              <Button
                onClick={onStart}
                disabled={submitting}
                className="px-5 py-2.5 flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Start Answer
              </Button>
            )}

            {/* Stop Answer — only while recording */}
            {isRecording && (
              <Button
                onClick={onStop}
                disabled={submitting}
                className="px-5 py-2.5 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <StopCircle className="w-4 h-4" />
                Stop Answer
              </Button>
            )}

            {/* Retry — only when blob exists */}
            <Button
              variant="secondary"
              onClick={onRetry}
              disabled={!hasBlob || isRecording || submitting}
              className="px-5 py-2.5 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </Button>

            {/* Submit — only when blob exists */}
            <Button
              onClick={onSubmit}
              disabled={!hasBlob || isRecording || submitting || submitSuccess}
              className={`px-5 py-2.5 flex items-center gap-2 ${submitSuccess ? '!bg-teal-600 !hover:bg-teal-700' : ''}`}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : submitSuccess ? (
                <><CheckCircle2 className="w-4 h-4" /> Answer submitted!</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Answer</>
              )}
            </Button>
          </div>
        </Card>

        {/* Bug 5 — Live transcript panel (self-review, not submitted) */}
        <LiveTranscriptPanel finalText={liveFinalText} interim={liveInterim} isRecording={isRecording} />
      </div>

      {/* 4) Transcript strip of answered questions */}
      <TranscriptStrip items={answered} />
    </div>
  );
}
