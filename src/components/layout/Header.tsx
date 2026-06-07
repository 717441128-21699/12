import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  MapPin,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMessageStore } from '@/store/messageStore';
import { Button } from '@/components/ui/Button';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const unreadCount = useMessageStore((s) => s.unreadCount);
  const showToast = useMessageStore((s) => s.showToast);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    showToast({ type: 'success', title: '已退出登录' });
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border z-30">
      <div className="h-full px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">FitPro 旗舰店（中关村店）</span>
            <ChevronDown className="h-4 w-4 text-muted" />
          </div>

          <div className="flex-1 max-w-md ml-6 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="搜索课程、会员、教练..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/messages')}
            className={cn(
              'relative h-10 w-10 rounded-xl flex items-center justify-center',
              'text-muted hover:text-foreground hover:bg-surfaceAlt transition-colors',
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                'flex items-center gap-3 h-10 pl-1.5 pr-3 rounded-xl',
                'hover:bg-surfaceAlt transition-colors',
                dropdownOpen && 'bg-surfaceAlt',
              )}
            >
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground leading-none">
                  {user?.name || '用户'}
                </p>
                <p className="text-[11px] text-muted mt-0.5 capitalize">
                  {user?.role === 'member' && '会员'}
                  {user?.role === 'coach' && '教练'}
                  {user?.role === 'manager' && '店长'}
                  {user?.role === 'owner' && '老板'}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted transition-transform duration-200',
                  dropdownOpen && 'rotate-180',
                )}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl glass border border-border shadow-card overflow-hidden animate-fade-in-up">
                <div className="px-4 py-3 border-b border-border/60">
                  <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted mt-0.5">{user?.phone}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-surfaceAlt transition-colors"
                  >
                    <User className="h-4 w-4 text-muted" />
                    个人中心
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-surfaceAlt transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted" />
                    账户设置
                  </button>
                </div>
                <div className="p-1.5 border-t border-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full !justify-start !text-danger"
                    leftIcon={<LogOut className="h-4 w-4" />}
                    onClick={handleLogout}
                  >
                    退出登录
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
