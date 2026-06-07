import * as React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  CalendarCheck,
  Dumbbell,
  Users,
  BarChart3,
  MessageSquare,
  Wallet,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMessageStore } from '@/store/messageStore';
import type { UserRole } from '@/types';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: number;
}

const roleLabels: Record<UserRole, string> = {
  member: '会员中心',
  coach: '教练端',
  manager: '门店管理',
  owner: '老板总览',
};

export function Sidebar() {
  const { role } = useAuth();
  const unreadCount = useMessageStore((s) => s.unreadCount);

  const baseMenuItems: MenuItem[] = [
    { path: '/member/home', label: '首页', icon: <Home className="h-5 w-5" />, roles: ['member'] },
    { path: '/member/booking', label: '课程预约', icon: <CalendarCheck className="h-5 w-5" />, roles: ['member'] },
    { path: '/member/my-bookings', label: '我的预约', icon: <Dumbbell className="h-5 w-5" />, roles: ['member'] },
    { path: '/coach/dashboard', label: '工作台', icon: <Home className="h-5 w-5" />, roles: ['coach'] },
    { path: '/coach/reports', label: '教学报告', icon: <BarChart3 className="h-5 w-5" />, roles: ['coach'] },
    { path: '/manager/courses', label: '课程管理', icon: <Layers className="h-5 w-5" />, roles: ['manager'] },
    { path: '/manager/refunds', label: '退款审批', icon: <Wallet className="h-5 w-5" />, roles: ['manager'] },
    { path: '/owner/dashboard', label: '数据看板', icon: <Home className="h-5 w-5" />, roles: ['owner'] },
    {
      path: '/messages',
      label: '消息中心',
      icon: <MessageSquare className="h-5 w-5" />,
      roles: ['member', 'coach', 'manager', 'owner'],
      badge: unreadCount,
    },
  ];

  const visibleItems = role ? baseMenuItems.filter((item) => item.roles.includes(role)) : [];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-border flex flex-col z-40">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-glow">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-gradient leading-none">FitPro</h1>
            <p className="text-[11px] text-muted mt-0.5">{role ? roleLabels[role] : '健身房管理'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {visibleItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium',
                  'transition-all duration-200 ease-out',
                  'animate-fade-in-up',
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted hover:text-foreground hover:bg-surfaceAlt',
                )
              }
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'transition-transform duration-200',
                      isActive ? 'scale-110' : 'group-hover:scale-105',
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[11px] font-bold animate-pulse-soft">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="rounded-xl bg-gradient-to-br from-accent/10 to-purple/10 border border-border p-4">
          <p className="text-xs text-muted mb-1">升级会员</p>
          <p className="font-semibold text-sm text-foreground mb-3">专享更多权益</p>
          <div className="h-7 text-xs font-medium rounded-lg bg-accent text-white flex items-center justify-center cursor-pointer hover:bg-accent-hover transition-colors">
            立即升级
          </div>
        </div>
      </div>
    </aside>
  );
}
