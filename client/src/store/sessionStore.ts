import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LiveSessionState, RecordingAttempt, WsQuestion } from '../types';

const MAX_ATTEMPTS = 4;

type AnsweredItem = { id: string | number; text: string; transcript?: string };

interface SetupPayload {
  role: string;
  interview_type: string;
  experience_level: string;
  tech_stack: string[];
  number_of_questions: number;
  job_description?: string;
  resume_name?: string;
}

interface SessionStore extends LiveSessionState {
  // Setters
  setPhase: (phase: LiveSessionState['phase']) => void;
  setCurrentQuestion: (q: WsQuestion | null) => void;
  setCurrentTranscript: (transcript: string) => void;
  setIsRecording: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  setInterviewId: (id: string) => void;
  addAttempt: (attempt: Omit<RecordingAttempt, 'attemptNumber'>) => void;
  clearAttempts: () => void;
  resetSession: () => void;
  canRetry: () => boolean;
  // Answered transcript persistence
  appendAnswered: (item: AnsweredItem) => void;
  clearAnswered: () => void;
  // Setup payload for WS start
  setSetupPayload: (p: SetupPayload | null) => void;
  setupPayload: SetupPayload | null;
}

const defaultState: LiveSessionState = {
  interviewId: null,
  currentQuestion: null,
  currentTranscript: '',
  attempts: [],
  isRecording: false,
  isProcessing: false,
  phase: 'pre-check',
  answered: [],
};

export const useSessionStore = create<SessionStore>()(persist((set, get) => ({
  ...defaultState,
  setupPayload: null,

  setPhase: (phase) => set({ phase }),
  setCurrentQuestion: (q) => set({ currentQuestion: q, currentTranscript: '', attempts: [] }),
  setCurrentTranscript: (currentTranscript) => set({ currentTranscript }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setInterviewId: (interviewId) => set({ interviewId }),

  addAttempt: (attempt) => {
    const current = get().attempts;
    set({
      attempts: [
        ...current,
        { ...attempt, attemptNumber: current.length + 1 },
      ],
    });
  },

  clearAttempts: () => set({ attempts: [] }),

  canRetry: () => get().attempts.length < MAX_ATTEMPTS,

  resetSession: () => set(defaultState),

  appendAnswered: (item) => {
    const arr = get().answered ?? [];
    set({ answered: [...arr, item] });
  },
  clearAnswered: () => set({ answered: [] }),

  setSetupPayload: (p) => set({ setupPayload: p }),
}), {
  name: 'ipg-session',
  partialize: (state) => ({ answered: state.answered, interviewId: state.interviewId, setupPayload: state.setupPayload }),
}));

export { MAX_ATTEMPTS };
