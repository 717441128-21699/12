import { create } from 'zustand';
import type { User, UserRole, MemberLevel } from '../types';
import { auth } from '../api/endpoints';
import { TOKEN_KEY } from '../api/client';

interface SafeUser extends Omit<User, 'password'> {}

interface RegisterParams {
  name: string;
  phone: string;
  password: string;
  storeId?: string;
  memberLevel?: MemberLevel;
}

interface AuthState {
  currentUser: SafeUser | null;
  users: SafeUser[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (role: UserRole, phone: string, password: string) => Promise<boolean>;
  register: (params: RegisterParams) => Promise<SafeUser | null>;
  logout: () => void;
  fetchMe: () => Promise<SafeUser | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  users: [],
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (role, phone, password) => {
    set({ loading: true, error: null });
    try {
      const response = await auth.login({ role, phone, password });
      localStorage.setItem(TOKEN_KEY, response.token);
      set({ currentUser: response.user, isAuthenticated: true, loading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  register: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await auth.register(params);
      localStorage.setItem(TOKEN_KEY, response.token);
      set({ currentUser: response.user, isAuthenticated: true, loading: false });
      return response.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ currentUser: null, isAuthenticated: false, error: null });
  },

  fetchMe: async () => {
    set({ loading: true, error: null });
    try {
      const user = await auth.me();
      set({ currentUser: user, isAuthenticated: true, loading: false });
      return user;
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      set({ currentUser: null, isAuthenticated: false, loading: false });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
