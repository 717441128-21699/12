import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';
import { TOKEN_KEY } from '@/api/client';

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { isAuthenticated, currentUser, loading } = useAuthStore();
  const location = useLocation();

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_KEY);

  if (loading || (hasToken && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    const redirectMap: Record<UserRole, string> = {
      member: '/member',
      coach: '/coach',
      manager: '/manager',
      owner: '/owner',
    };
    return <Navigate to={redirectMap[currentUser.role]} replace />;
  }

  return <>{children}</>;
}
