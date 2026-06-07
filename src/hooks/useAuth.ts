import { useAuthStore } from '@/store/authStore';
import type { User, UserRole } from '@/types';

interface SafeUser extends Omit<User, 'password'> {}

interface UseAuthReturn {
  user: SafeUser | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (role: UserRole, phone: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  return {
    user: currentUser,
    isAuthenticated,
    role: currentUser?.role ?? null,
    login,
    logout,
  };
}
