import { create } from 'zustand';
import Cookies from 'js-cookie';
import type { User } from '../types';

// Cookie name for the JWT
const TOKEN_COOKIE = 'pg_access_token';

// Cookie options – expire matches backend JWT_EXPIRE_DAYS (7)
const COOKIE_OPTIONS = {
  expires: 7,
  sameSite: 'strict' as const,
  secure: window.location.protocol === 'https:',
};

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  isHydrated: false,

  /** Hydrate token from cookie on app startup */
  hydrate: () => {
    const token = Cookies.get(TOKEN_COOKIE) ?? null;
    // token only — we'll fetch the user separately if needed
    set({ token, isHydrated: true });
  },

  setAuth: (token, user) => {
    Cookies.set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
    set({ token, user });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    Cookies.remove(TOKEN_COOKIE);
    set({ token: null, user: null });
  },
}));
