import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { useSessionStore } from '../store/sessionStore';
import type { 
  WsMessage, 
  WsQuestion, 
  WsTranscript, 
  WsInterviewComplete,
  WsError 
} from '../types';

export const useInterviewSession = (interviewId: string) => {
  const {
    phase,
    setPhase,
    setCurrentQuestion,
    setCurrentTranscript,
    setIsProcessing,
    setInterviewId,
    appendAnswered,
  } = useSessionStore();

  const [wsError, setWsError] = useState<{ code: string; message: string } | null>(null);

  const handleMessage = useCallback((data: unknown) => {
    const msg = data as WsMessage;
    
    switch (msg.type) {
      case 'question': {
        const questionData = msg as WsQuestion;
        // Before moving to next question, persist the previous one as answered
        const prev = useSessionStore.getState().currentQuestion;
        const prevTranscript = useSessionStore.getState().currentTranscript;
        if (prev) {
          appendAnswered({
            id: (prev as any).question_id ?? (prev as any).id ?? prev.order_index,
            text: (prev as any).question_text ?? (prev as any).text ?? 'Previous question',
            transcript: prevTranscript,
          });
        }
        setWsError(null); // clear any previous error when a question arrives
        setCurrentQuestion(questionData);
        setPhase('question');
        setIsProcessing(false);
        break;
      }
      case 'transcript_ready': {
        const transcriptData = msg as WsTranscript;
        setCurrentTranscript(transcriptData.transcript);
        setIsProcessing(false);
        break;
      }
      case 'feedback_ready':
      case 'interview_complete': {
        setPhase('complete');
        setIsProcessing(false);
        break;
      }
      case 'error': {
        const errorData = msg as WsError;
        console.error('[WS Error]', errorData.code, errorData.message);
        // Surface the error to the page so the user can see it
        setWsError({ code: errorData.code, message: errorData.message });
        setIsProcessing(false);
        break;
      }
      default:
        console.log('[WS] Unhandled message type:', msg.type);
    }
  }, [setCurrentQuestion, setPhase, setIsProcessing, setCurrentTranscript, appendAnswered]);

  const { isConnected, connectionStatus, sendMessage, disconnect } = useWebSocket({
    onMessage: handleMessage,
    onOpen: () => {
      // Initiate the interview session on the server side. Fires on EVERY
      // successful connect (including round-8 reconnects), not just the first.
      console.log('[WS] Socket open — sending start_interview for', interviewId);
      sendMessage({ type: 'start_interview', interview_id: interviewId });
      setPhase('connecting');
    },
    onClose: () => {
      console.log('WS Connection closed');
      // Could handle reconnection UI if necessary
    },
    enabled: phase !== 'pre-check' && phase !== 'complete'
  });

  const submitAnswer = useCallback(async (audioBase64: string, questionId: string) => {
    setIsProcessing(true);
    setWsError(null);
    // KEY FIX: backend WS router reads raw["audio_base64"] — was incorrectly sent as "audio_data"
    sendMessage({
      type: 'submit_answer',
      question_id: questionId,
      audio_base64: audioBase64,
    });
  }, [sendMessage, setIsProcessing]);
  
  const endInterview = useCallback(() => {
    setIsProcessing(true);
    sendMessage({ type: 'end_interview' });
    setPhase('complete');
  }, [sendMessage, setIsProcessing, setPhase]);

  // Set the current interview ID on mount
  useEffect(() => {
    setInterviewId(interviewId);
  }, [interviewId, setInterviewId]);

  return {
    isConnected,
    connectionStatus,
    submitAnswer,
    endInterview,
    disconnect,
    wsError,
    setWsError,
  };
};
