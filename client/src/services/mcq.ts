import { apiClient } from './api';
import type { McqSession, McqSubmitResult } from '../types';

export const mcqService = {
  /** Kick off generation. Returns the session (questions pending via Celery). */
  generate: async (payload: { job_title?: string; job_description: string }): Promise<McqSession> => {
    const { data } = await apiClient.post<McqSession>('/api/mcq/generate', payload);
    return data;
  },

  /** Fetch a session; questions arrive once status becomes 'ready'. */
  getById: async (id: string): Promise<McqSession> => {
    const { data } = await apiClient.get<McqSession>(`/api/mcq/${id}`);
    return data;
  },

  /** Submit answers (keyed by question_index). */
  submit: async (id: string, answers: Record<number, number>): Promise<McqSubmitResult> => {
    const { data } = await apiClient.post<McqSubmitResult>(`/api/mcq/${id}/submit`, { answers });
    return data;
  },
};
