import { apiClient } from './api';
import type { ResumeAnalysis } from '../types';

export const resumeService = {
  /** Upload a resume for analysis. Returns the pending analysis record. */
  analyze: async (file: File, jobDescription?: string): Promise<ResumeAnalysis> => {
    const formData = new FormData();
    formData.append('file', file);
    if (jobDescription?.trim()) formData.append('job_description', jobDescription.trim());
    const { data } = await apiClient.post<ResumeAnalysis>('/api/resume/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Fetch an analysis by id (poll until status becomes 'completed'). */
  getById: async (id: string): Promise<ResumeAnalysis> => {
    const { data } = await apiClient.get<ResumeAnalysis>(`/api/resume/${id}`);
    return data;
  },

  // ── Default resume (stored per user, reused across interview flows) ──

  /** Set (or replace) the default resume. */
  setDefault: async (file: File): Promise<{ filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.put<{ filename: string }>('/api/resume/default', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Get metadata for the default resume, if one exists. */
  getDefault: async (): Promise<{ filename: string | null; size?: number }> => {
    const { data } = await apiClient.get<{ filename: string | null; size?: number }>('/api/resume/default');
    return data;
  },

  /** Remove the default resume. */
  removeDefault: async (): Promise<void> => {
    await apiClient.delete('/api/resume/default');
  },
};
