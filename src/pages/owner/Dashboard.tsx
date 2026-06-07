import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Smile,
  MapPin,
  Award,
  User,
} from 'lucide-react';
import { useOwnerStore } from '@/store/ownerStore';
import { useAuthStore } from '@/store/authStore';
import { mockUsers } from '@/utils/mockData';
import { cn } from '@/lib/utils';

const MONTH_OPTIONS = [
  { value: '2026-06', label: '2026年6月' },
  { value: '2026-05', label: '2026年5月' },
  { value: '2026-04', label: '2026年4月' },
  { value: '2026-03', label: '2026年3月' },
  { value: '2026-02', label: '2026年2月' },
  { value: '2026-01', label: '2026年1月' },
];

function getTrendColor(current: number, benchmark: number) {
  if (current >= benchmark) return 'text-green-600';
  if (current >= benchmark * 0.9) return 'text-yellow-600';
  return 'text-red-600';
}

export default function OwnerDashboard() {
  const { stores, fetchMetrics, coachRankings, exportReport, fetchStores, fetchRankings } = useOwnerStore();
  const { currentUser } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchRankings();
    fetchMetrics(selectedMonth);
  }, [selectedMonth, fetchStores, fetchRankings, fetchMetrics]);

  const metrics = useMemo(
    () => useOwnerStore.getState().metrics.filter((m) => m.month === selectedMonth),
    [selectedMonth, useOwnerStore.getState().metrics],
  );

  const rankings = useMemo(
    () =>
      useOwnerStore
        .getState()
        .coachRankings.filter((r) => r.month === selectedMonth)
        .slice(0, 3),
    [selectedMonth, useOwnerStore.getState().coachRankings],
  );

  const lineChartData = useMemo(() => {
    return metrics.map((m) => {
      const store = stores.find((s) => s.id === m.storeId);
      return {
        name: store?.name.replace('FitPro ', '') || m.storeId,
        预约率: m.bookingRate,
        基准线: 80,
      };
    });
  }, [metrics, stores]);

  const barChartData = useMemo(() => {
    return metrics.map((m) => {
      const store = stores.find((s) => s.id === m.storeId);
      return {
        name: store?.name.replace('FitPro ', '') || m.storeId,
        流失率: m.churnRate,
      };
    });
  }, [metrics, stores]);

  const radarChartData = useMemo(() => {
    return metrics.map((m) => {
      const store = stores.find((s) => s.id === m.storeId);
      return {
        subject: store?.name.replace('FitPro ', '') || m.storeId,
        满意度: m.avgSatisfaction * 20,
        预约率: m.bookingRate,
        留存率: 100 - m.churnRate,
        活跃度: Math.min(100, (m.activeMembers / 1000) * 100),
      };
    });
  }, [metrics, stores]);

  const getCoachName = (coachId: string) => {
    const coach = mockUsers.find((u) => u.id === coachId);
    return coach?.name || coachId;
  };

  const getRankBadge = (index: number) => {
    const colors = [
      'bg-yellow-500 text-white',
      'bg-gray-400 text-white',
      'bg-amber-700 text-white',
    ];
    return colors[index] || 'bg-gray-200 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">店长数据看板</h1>
            <p className="mt-1 text-sm text-gray-500">
              欢迎回来，{currentUser?.name || '店长'} · 实时掌握门店运营数据
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="cursor-pointer border-none bg-transparent text-sm font-medium text-gray-700 outline-none"
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => exportReport(selectedMonth)}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
            >
              <Download className="h-4 w-4" />
              导出CSV报表
            </button>
          </div>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">门店概览</h2>
            <span className="text-xs text-gray-500">共 {stores.length} 家门店</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {metrics.map((m) => {
              const store = stores.find((s) => s.id === m.storeId);
              return (
                <div
                  key={m.storeId}
                  className="min-w-[260px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                        <MapPin className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{store?.name}</h3>
                        <p className="text-xs text-gray-500">
                          {store?.city} · {store?.address}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        预约率
                      </div>
                      <span
                        className={cn(
                          'font-semibold',
                          getTrendColor(m.bookingRate, 85),
                        )}
                      >
                        {m.bookingRate}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                        style={{ width: `${Math.min(m.bookingRate, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        流失率
                      </div>
                      <span
                        className={cn(
                          'font-semibold',
                          m.churnRate <= 3 ? 'text-green-600' : m.churnRate <= 5 ? 'text-yellow-600' : 'text-red-600',
                        )}
                      >
                        {m.churnRate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Smile className="h-4 w-4 text-blue-500" />
                        满意度
                      </div>
                      <span className="font-semibold text-blue-600">
                        {m.avgSatisfaction}/5.0
                      </span>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>活跃会员</span>
                        <span className="font-medium text-gray-700">
                          {m.activeMembers} 人
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>总收入</span>
                        <span className="font-medium text-gray-700">
                          ¥{m.totalRevenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">月度预约率趋势</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="预约率"
                    stroke="#F97316"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#F97316' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="基准线"
                    stroke="#9CA3AF"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">各门店流失率对比</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="流失率" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">门店综合满意度雷达</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="满意度"
                    dataKey="满意度"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="预约率"
                    dataKey="预约率"
                    stroke="#F97316"
                    fill="#F97316"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="留存率"
                    dataKey="留存率"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.2}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">教练满意度 Top 3</h3>
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="space-y-3">
              {rankings.map((r, index) => (
                <div
                  key={r.coachId}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                    index === 0
                      ? 'border-yellow-200 bg-yellow-50'
                      : index === 1
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-amber-100 bg-amber-50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                      getRankBadge(index),
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {getCoachName(r.coachId)}
                      </h4>
                      <span className="flex items-center gap-1 text-orange-600">
                        <Smile className="h-4 w-4" />
                        <span className="font-bold">{r.avgSatisfaction}</span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        耗课 {r.consumedCourses}/{r.totalCourses} 节
                      </span>
                      <span>耗课率 {r.consumptionRate}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                        style={{ width: `${r.consumptionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {rankings.length === 0 && (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                  暂无教练排名数据
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
