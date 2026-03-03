import { create } from 'zustand';
import type { User } from '@qualirec/shared';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login({ email, password });
      if (response.success && response.data) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        api.setToken(token);
        set({ user, token, isLoading: false });
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    api.setToken(null);
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    api.setToken(token);
    set({ isLoading: true });
    try {
      const response = await api.getMe();
      if (response.success && response.data) {
        set({ user: response.data, token, isLoading: false });
      }
    } catch {
      localStorage.removeItem('token');
      api.setToken(null);
      set({ user: null, token: null, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
