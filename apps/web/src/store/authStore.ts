import { create } from 'zustand';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? (Cookies.get('token') || localStorage.getItem('token')) : null,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      if (data) {
        localStorage.setItem('token', data.token);
        Cookies.set('token', data.token, { expires: 7 });
        set({ user: data.user, token: data.token, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error instanceof Error ? error : new Error('Login failed');
    }
  },

  signup: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/signup', { name, email, password });
      if (data) {
        localStorage.setItem('token', data.token);
        Cookies.set('token', data.token, { expires: 7 });
        set({ user: data.user, token: data.token, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error instanceof Error ? error : new Error('Signup failed');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    Cookies.remove('token');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = Cookies.get('token') || localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data } = await apiClient.get<User>('/auth/me');
      if (data) {
        set({ user: data, token, isLoading: false });
      }
    } catch {
      localStorage.removeItem('token');
      Cookies.remove('token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));

// Initialize store
if (typeof window !== 'undefined') {
  useAuthStore.getState().loadUser();
}
