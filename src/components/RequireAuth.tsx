import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { isAuthenticated, currentUser } = useAuthStore();
  const location = useLocation();

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
