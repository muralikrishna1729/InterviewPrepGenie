import React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Mic, 
  Square, 
  RotateCcw, 
  Play, 
  ChevronRight, 
  Bot, 
  AlertCircle,
  Loader2,
  Video,
  Check
} from 'lucide-react';
import { useSessionStore, MAX_ATTEMPTS } from '../store/sessionStore';
import { useWebcam } from '../hooks/useWebcam';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { Button } from '../components/Button';

export default function LiveInterviewSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Stores and Hooks
  const {
    phase,
    setPhase,
    currentQuestion,
    currentTranscript,
    isProcessing,
    attempts,
    addAttempt,
    canRetry,
  } = useSessionStore();

  const {
    isActive: isCamActive,
    hasPermission: hasCamPermission,
    permissionError,
    videoRef,
    streamRef,
    startWebcam,
  } = useWebcam({ audio: true }); // Request both video + audio

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    blobToBase64,
  } = useMediaRecorder();

  const { isConnected, submitAnswer, endInterview } = useInterviewSession(sessionId!);

  // Local state for playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  
  // Flag to know we are waiting for transcript for the current blob
  const [waitingForTranscript, setWaitingForTranscript] = useState(false);

  // Auto-save attempt when transcript arrives
  useEffect(() => {
    if (waitingForTranscript && currentTranscript && currentBlob) {
      addAttempt({
        blob: currentBlob,
        transcript: currentTranscript,
        timestamp: Date.now(),
      });
      setWaitingForTranscript(false);
    }
  }, [currentTranscript, currentBlob, waitingForTranscript, addAttempt]);

  // Handle phase completion
  useEffect(() => {
    if (phase === 'complete') {
      // Short delay for the user to see completion, then go to results
      const t = setTimeout(() => {
        navigate(`/practice/results/${sessionId}`);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [phase, navigate, sessionId]);

  // Phase: Pre-check (Permissions)
  if (phase === 'pre-check') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full rounded-2xl border p-8 shadow-card text-center"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary">
            <Video className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Hardware Check</h2>
          <p className="text-[var(--text-secondary)] mb-8 text-sm">
            We need camera and microphone access to start your interview. 
            Your feed is processed securely.
          </p>
          
          {permissionError && (
            <div
              className="mb-6 p-4 rounded-xl bg-[#EF444433] border border-[#EF444480] text-[#EF4444EE] text-sm flex flex-col gap-2"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p className="font-semibold">Camera/Microphone Access Required</p>
              </div>
              <p>
                {permissionError}. Please enable camera and microphone access in your browser settings and refresh the page.
              </p>
              <small className="mt-1 text-xs opacity-80">
                If you accidentally denied permission, check your browser permissions or site settings.
              </small>
            </div>
          )}

            <Button 
              size="lg" 
              className="w-full" 
              leftIcon={<Camera className="w-4 h-4" />}
              onClick={async () => {
                try {
                  await startWebcam();
                  setPhase('connecting');
                } catch (e) {
                  // error is handled by the hook and shown in permissionError
                }
              }}
              aria-label="Allow camera and microphone access and join interview"
            >
              Allow Access & Join
            </Button>
        </motion.div>
      </div>
    );
  }

  // Phase: Connecting to WS
  if (phase === 'connecting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-[var(--text-secondary)] font-medium">Connecting to interview room...</p>
      </div>
    );
  }

  // Helper functions for recording controls
  const handleStartRecording = async () => {
    if (!streamRef.current) return;
    setIsPlaying(false);
    setCurrentBlob(null);
    setWaitingForTranscript(false);
    
    // Switch video element back to live stream if it was on playback
    if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
    
    await startRecording(streamRef.current);
  };

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    setCurrentBlob(blob);
    
    if (currentQuestion) {
      setWaitingForTranscript(true);
      const b64 = await blobToBase64(blob);
      submitAnswer(b64, currentQuestion.question_id);
    }
  };

  const handleReplay = () => {
    if (!currentBlob) return;
    setIsPlaying(true);
  };

  // Replay effect
  useEffect(() => {
    if (isPlaying && currentBlob && playbackVideoRef.current) {
      const url = URL.createObjectURL(currentBlob);
      playbackVideoRef.current.src = url;
      playbackVideoRef.current.play().catch(() => {});
      return () => URL.revokeObjectURL(url);
    }
  }, [isPlaying, currentBlob]);

  const handleNextQuestion = () => {
    // Send a message to get next question. 
    // In our backend flow, it might just need 'next_question' or if we answered it sends it automatically.
    // The prompt says "server sends questions one at a time" and "client sends recorded audio... server returns transcript".
    // We assume the user needs to request the next question if they're satisfied, OR the backend might auto-advance.
    // We'll send a specific 'request_next' or let backend handle it. Let's send a generic "ready_for_next".
    // Actually, Prompt 1's WS handlers usually move to next question when we ask.
    // For now, let's trigger an empty submit or specific next signal if needed. 
    // We'll rely on the existing 'submit_answer' causing the transition if we pass a special flag, 
    // or just call an endpoint. The spec doesn't specify how 'next' is triggered, but usually we just send a "next" message.
    
    // Let's clear states to let UI show processing until next question arrives
    if (!isConnected) return;
    setIsPlaying(false);
    setCurrentBlob(null);
    
    // If it's the last question, we finish
    if (currentQuestion && currentQuestion.order_index >= currentQuestion.total_questions) {
      endInterview();
    }
  };

  // Format duration
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLastQuestion = currentQuestion && currentQuestion.order_index >= currentQuestion.total_questions;
  const hasAttempt = attempts.length > 0 || (currentBlob && !waitingForTranscript);

  // Main UI
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col h-screen overflow-hidden">
      
      {/* Top Banner: Current Question */}
      <div className="shrink-0 p-4 sm:p-6 pb-2 z-10">
        <motion.div 
          key={currentQuestion?.question_id}
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto rounded-2xl p-6 border shadow-card-md relative overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {/* Subtle gradient accent */}
          <div className="absolute top-0 left-0 w-1 h-full gradient-brand" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
              Question {(currentQuestion?.order_index ?? 0) + 1} of {currentQuestion?.total_questions ?? 0}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-[var(--text-primary)] leading-relaxed">
            {currentQuestion?.question_text || "Waiting for question..."}
          </h2>
        </motion.div>
      </div>

      {/* Main Grid: Interviewer + Candidate */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 pt-2 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* Left Panel: Static Interviewer */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 min-h-0 shrink-0">
          <div 
            className="flex-1 rounded-3xl border flex flex-col items-center justify-center p-6 text-center shadow-inner-sm"
            style={{ background: 'var(--bg-surface-raised)', borderColor: 'var(--border)' }}
          >
            <div className="w-24 h-24 rounded-full gradient-brand p-1 mb-4 shadow-glow-sm">
              <div className="w-full h-full bg-[var(--bg-surface)] rounded-full flex items-center justify-center">
                <Bot className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h3 className="font-medium text-[var(--text-primary)]">InterviewPrep Genie AI</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Interviewer</p>
          </div>
        </div>

        {/* Center/Right Panel: Candidate Video */}
        <div className="w-full md:w-2/3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 rounded-3xl border overflow-hidden relative shadow-card-lg bg-black">
            
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isPlaying ? 'opacity-0 absolute inset-0' : 'opacity-100'}`}
            />
            
            {/* Playback Feed */}
            {isPlaying && (
              <video
                ref={playbackVideoRef}
                controls
                className="w-full h-full object-cover absolute inset-0 z-10"
              />
            )}

            {/* Recording Indicator Overlay */}
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 border border-white/10 z-20"
                >
                  <div className="w-3 h-3 rounded-full bg-accent-record animate-record-pulse" />
                  <span className="text-white font-mono text-sm">{formatTime(duration)}</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Processing / Loading Overlay */}
            <AnimatePresence>
              {(isProcessing || phase === 'complete') && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-30"
                >
                  {phase === 'complete' ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-accent-mint/20 text-accent-mint flex items-center justify-center mb-4">
                        <Check className="w-8 h-8" />
                      </div>
                      <p className="text-white font-medium text-lg">Interview Complete!</p>
                      <p className="text-white/70 text-sm mt-1">Generating feedback...</p>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin text-white mb-4" />
                      <p className="text-white font-medium">Processing...</p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Transcript Box */}
          <div 
            className="h-24 sm:h-32 rounded-2xl border p-4 overflow-y-auto"
            style={{ background: 'var(--bg-surface-raised)', borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Live Transcript
            </p>
            {currentTranscript ? (
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                "{currentTranscript}"
              </p>
            ) : waitingForTranscript ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" /> Transcribing audio...
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] italic">
                Your transcript will appear here after you record.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div 
        className="shrink-0 border-t p-4 sm:p-6 z-10"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Recording Controls */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <Button
                variant="danger"
                size="lg"
                className="rounded-full !px-6"
                leftIcon={<Mic className="w-5 h-5" />}
                onClick={handleStartRecording}
                disabled={isProcessing || isPlaying || phase === 'complete'}
                aria-label="Start recording answer"
              >
                Record Answer
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full !px-6 border-accent-record text-accent-record hover:bg-accent-record/10"
                leftIcon={<Square className="w-5 h-5 fill-current" />}
                onClick={handleStopRecording}
                aria-label="Stop recording answer"
              >
                Stop Recording
              </Button>
            )}

            {/* Replay & Retry (show if we have a recorded blob) */}
            {currentBlob && !isRecording && (
              <>
                <Button
                  variant="secondary"
                  className="rounded-full !w-12 !h-12 !p-0 flex items-center justify-center"
                  onClick={handleReplay}
                  disabled={isProcessing || isPlaying}
                  title="Replay recording"
                  aria-label="Replay recording"
                >
                  <Play className="w-5 h-5 ml-1" />
                </Button>
                
                <div className="flex flex-col ml-2">
                  {canRetry() ? (
                    <Button
                      variant="ghost"
                      className="!py-1 !px-3 rounded-full text-sm"
                      leftIcon={<RotateCcw className="w-4 h-4" />}
                      onClick={handleStartRecording} // Retrying is just starting recording again
                      disabled={isProcessing || isPlaying}
                      aria-label="Retry recording answer"
                      title="Retry recording answer"
                    >
                      Retry
                    </Button>
                  ) : (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="text-[10px] text-center text-accent-record font-semibold"
                    >
                      No attempts left
                    </div>
                  )}
                  <span className="text-[10px] text-center text-[var(--text-secondary)]">
                    {Math.max(MAX_ATTEMPTS - attempts.length, 0)} attempts left
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Next Question / Finish */}
          <Button
            variant="primary"
            size="lg"
            className="rounded-full !px-8"
            rightIcon={isLastQuestion ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            onClick={handleNextQuestion}
            disabled={!hasAttempt || isProcessing || isRecording || phase === 'complete'}
          >
            {isLastQuestion ? 'Finish Interview' : 'Next Question'}
          </Button>

        </div>
      </div>
    </div>
  );
}
