import { apiClient } from './api';
import type { Interview } from '../types';

interface CreateInterviewPayload {
  role: string;
  interview_type: string;
  tech_stack: string[];
  experience_level: string;
  number_of_questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface PatchStatusPayload {
  status: Interview['status'];
}

export const interviewService = {
  create: async (payload: CreateInterviewPayload): Promise<Interview> => {
    const { data } = await apiClient.post<Interview>('/api/interviews', payload);
    return data;
  },

  list: async (): Promise<Interview[]> => {
    const { data } = await apiClient.get<Interview[]>('/api/interviews');
    return data;
  },

  getById: async (id: string): Promise<Interview> => {
    const { data } = await apiClient.get<Interview>(`/api/interviews/${id}`);
    return data;
  },

  patchStatus: async (id: string, payload: PatchStatusPayload): Promise<Interview> => {
    const { data } = await apiClient.patch<Interview>(`/api/interviews/${id}/status`, payload);
    return data;
  },

  /** Generate (and persist) model answers for an interview on demand. */
  generateModelAnswers: async (id: string): Promise<string[]> => {
    const { data } = await apiClient.post<string[]>(`/api/interviews/${id}/model-answers`);
    return data;
  },
};
