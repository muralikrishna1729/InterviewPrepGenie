import { apiClient } from './api';
import type { User } from '../types';

interface TokenResponse {
  access_token: string;
  user: User;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  signup: async (payload: SignupPayload): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/api/auth/signup', payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/api/auth/login', payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/api/auth/profile');
    return data;
  },
};
