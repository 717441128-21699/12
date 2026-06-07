import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UserPlus,
  Phone,
  Lock,
  User,
  Eye,
  EyeOff,
  Dumbbell,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { MemberLevel } from '@/types';

const LEVEL_OPTIONS: { value: MemberLevel; label: string; benefits: string }[] = [
  { value: 'normal', label: '普通会员', benefits: '标准课程价格' },
  { value: 'silver', label: '银卡会员', benefits: '9折优惠 + 专属客服' },
  { value: 'gold', label: '金卡会员', benefits: '8折优惠 + 优先预约' },
  { value: 'diamond', label: '钻石会员', benefits: '6.5折优惠 + 全部特权' },
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [confirmPassword, setConfirmPassword] = useState('123456');
  const [level, setLevel] = useState<MemberLevel>('normal');
  const [showPassword, setShowPassword] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedLevel = LEVEL_OPTIONS.find((l) => l.value === level)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入姓名');
      return;
    }
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    if (phone.trim().length < 11) {
      setError('手机号格式不正确');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: name.trim(),
        phone: phone.trim(),
        password,
        memberLevel: level,
      });
      setLoading(false);
      if (user) {
        navigate('/member', { replace: true });
      } else {
        setError('注册失败，请重试');
      }
    } catch {
      setLoading(false);
      setError('注册失败，请重试');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-200">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FitPro 健身连锁</h1>
          <p className="mt-1 text-sm text-gray-500">加入我们，开启健康生活</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-200/50">
          <h2 className="mb-6 text-lg font-semibold text-gray-800">会员注册</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                姓名
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入您的姓名"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
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
                会员等级
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-4 text-left text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                >
                  <div>
                    <div className="font-medium">{selectedLevel.label}</div>
                    <div className="text-xs text-gray-500">{selectedLevel.benefits}</div>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-gray-400 transition-transform',
                      showLevelDropdown && 'rotate-180',
                    )}
                  />
                </button>
                {showLevelDropdown && (
                  <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    {LEVEL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setLevel(opt.value);
                          setShowLevelDropdown(false);
                        }}
                        className={cn(
                          'flex w-full flex-col px-4 py-3 text-left transition-colors',
                          level === opt.value
                            ? 'bg-orange-50'
                            : 'hover:bg-gray-50',
                        )}
                      >
                        <span
                          className={cn(
                            'text-sm font-medium',
                            level === opt.value ? 'text-orange-600' : 'text-gray-800',
                          )}
                        >
                          {opt.label}
                        </span>
                        <span className="text-xs text-gray-500">{opt.benefits}</span>
                      </button>
                    ))}
                  </div>
                )}
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
                  placeholder="请设置密码（至少6位）"
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

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
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
              <UserPlus className="h-4 w-4" />
              {loading ? '注册中...' : '立即注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            已有账号？
            <Link
              to="/"
              className="ml-1 font-medium text-orange-600 hover:text-orange-700"
            >
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
