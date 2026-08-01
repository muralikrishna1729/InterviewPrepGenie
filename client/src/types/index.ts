// ============================================================
// Core types shared across the app
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Interview {
  id: string;
  user_id: string;
  role: string;
  interview_type: 'Technical' | 'Non-Technical' | 'Mixed';
  tech_stack: string[];
  experience_level: 'Entry' | 'Mid' | 'Senior';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  number_of_questions: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  questions?: Question[];
  feedback?: Feedback;
}

export interface Question {
  id: string;
  interview_id: string;
  question_text: string;
  order_index: number;
  created_at: string;
  answer?: Answer | null;
}

export interface Answer {
  id: string;
  interview_id: string;
  question_id: string;
  transcript: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  interview_id: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  model_answers: string[];
  summary: string;
  score: number;
  created_at: string;
}

export interface TranscriptChunk {
  id: string;
  interview_id: string;
  chunk_text: string;
  order_index: number;
}

// ---------- WebSocket message shapes ----------

export type WsMessageType =
  | 'setup_question'
  | 'setup_complete'
  | 'question'
  | 'transcript_ready'
  | 'interview_complete'
  | 'feedback_ready'
  | 'error';

export interface WsMessage {
  type: WsMessageType;
  [key: string]: unknown;
}

export interface WsQuestion extends WsMessage {
  type: 'question';
  question_id: string;
  question_text: string;
  order_index: number;
  total_questions: number;
}

export interface WsTranscript extends WsMessage {
  type: 'transcript_ready';
  question_id: string;
  transcript: string;
}

export interface WsInterviewComplete extends WsMessage {
  type: 'interview_complete';
  interview_id: string;
}

export interface WsSetupComplete extends WsMessage {
  type: 'setup_complete';
  interview_id: string;
  summary: Record<string, string>;
}

export interface WsError extends WsMessage {
  type: 'error';
  code: string;
  message: string;
  retryable: boolean;
}

// ---------- Recording attempt ----------

export interface RecordingAttempt {
  attemptNumber: number;
  blob: Blob;
  transcript: string;
  timestamp: number;
}

// ---------- Session state ----------

export interface LiveSessionState {
  interviewId: string | null;
  currentQuestion: WsQuestion | null;
  currentTranscript: string;
  attempts: RecordingAttempt[];
  isRecording: boolean;
  isProcessing: boolean;
  phase: 'pre-check' | 'connecting' | 'question' | 'processing' | 'complete';
  answered?: Array<{ id: string | number; text: string; transcript?: string }>;
}

// ---------- MCQ ----------

export interface McqQuestion {
  question_text: string;
  options: string[];
  correct_index: number;
  category: string;
}

export interface McqSession {
  id: string;
  user_id: string;
  job_title: string | null;
  job_description: string;
  questions: McqQuestion[] | null;
  status: 'pending' | 'ready' | 'submitted' | 'failed';
  score: number | null;
  correct_count: number | null;
  total: number;
  feedback: string | null;
  created_at: string;
}

// ---------- Resume ----------

export interface ResumeAnalysis {
  id: string;
  user_id: string;
  filename: string;
  status: 'pending' | 'completed' | 'failed';
  score: number | null;
  strengths: string[];
  weaknesses: string[];
  grammar_suggestions: string[];
  ats_tips: string[];
  improvements: string[];
  created_at: string;
}
