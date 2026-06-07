import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Dumbbell,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'member', label: '会员', description: '预约课程、查看训练计划' },
  { value: 'coach', label: '教练', description: '管理课程、查看学员' },
  { value: 'manager', label: '运营经理', description: '审批退款、运营管理' },
  { value: 'owner', label: '店长/老板', description: '查看数据、经营报表' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [role, setRole] = useState<UserRole>('member');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const success = login(role, phone.trim(), password);
      setLoading(false);

      if (success) {
        const routes: Record<UserRole, string> = {
          member: '/member',
          coach: '/coach',
          manager: '/manager',
          owner: '/owner',
        };
        navigate(routes[role], { replace: true });
      } else {
        setError('账号或密码错误，请重试');
      }
    }, 500);
  };

  const fillDemoAccount = (targetRole: UserRole) => {
    setRole(targetRole);
    const demoPhones: Record<UserRole, string> = {
      member: '13800000001',
      coach: '13900000001',
      manager: '13700000001',
      owner: '13600000001',
    };
    setPhone(demoPhones[targetRole]);
    setPassword('123456');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-200">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FitPro 健身连锁</h1>
          <p className="mt-1 text-sm text-gray-500">专业的健身场馆管理系统</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-200/50">
          <h2 className="mb-6 text-lg font-semibold text-gray-800">账号登录</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                选择身份
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => fillDemoAccount(opt.value)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      role === opt.value
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <div
                      className={cn(
                        'text-sm font-medium',
                        role === opt.value ? 'text-orange-600' : 'text-gray-700',
                      )}
                    >
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {opt.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                手机号
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-11 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-medium text-white shadow-lg shadow-orange-200 transition-all hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
            >
              <User className="h-4 w-4" />
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            还没有账号？
            <Link
              to="/register"
              className="ml-1 font-medium text-orange-600 hover:text-orange-700"
            >
              立即注册
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          点击上方身份按钮可快速填入演示账号
        </p>
      </div>
    </div>
  );
}
