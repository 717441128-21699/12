import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, MemberLevel, MemberBodyData } from '../types';
import { mockUsers } from '../utils/mockData';

interface SafeUser extends Omit<User, 'password'> {}

interface RegisterParams {
  name: string;
  phone: string;
  password?: string;
  level?: MemberLevel;
  bodyData?: MemberBodyData;
}

interface AuthState {
  currentUser: SafeUser | null;
  isAuthenticated: boolean;
  users: User[];
  login: (role: UserRole, phone: string, password?: string) => boolean;
  register: (params: RegisterParams) => SafeUser;
  logout: () => void;
}

function stripPassword(user: User): SafeUser {
  const { password: _pw, ...rest } = user;
  return rest;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      users: mockUsers,

      login: (role, phone, password) => {
        const { users } = get();
        const user = users.find((u) => u.role === role && u.phone === phone);
        if (user) {
          if (password && user.password !== password) {
            return false;
          }
          set({ currentUser: stripPassword(user), isAuthenticated: true });
          return true;
        }
        return false;
      },

      register: ({ name, phone, password = '123456', level = 'normal' }) => {
        const { users } = get();
        const newUser: User = {
          id: `u_${Date.now()}`,
          role: 'member',
          name,
          phone,
          password,
          memberLevel: level,
          level,
        };
        const safeUser = stripPassword(newUser);
        set({
          users: [...users, newUser],
          currentUser: safeUser,
          isAuthenticated: true,
        });
        return safeUser;
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    {
      name: 'fitpro-auth-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        users: state.users,
      }),
    },
  ),
);
