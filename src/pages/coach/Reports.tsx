import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Star,
  MessageSquare,
  Upload,
  FileText,
  Check,
  X,
  Calendar,
  Users,
  Award,
  ChevronDown,
  Send,
  User,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { useCoachStore } from '@/store/coachStore';
import { useMemberStore } from '@/store/memberStore';
import { useAuthStore } from '@/store/authStore';
import type { Booking } from '@/types';

interface Review {
  id: string;
  memberName: string;
  rating: number;
  comment: string;
  date: string;
  courseTitle: string;
}

const mockReviews: Review[] = [
  {
    id: 'r1',
    memberName: '张小明',
    rating: 5,
    comment: '陈教练非常专业，课程安排合理，训练效果显著！',
    date: '2026-06-05',
    courseTitle: '下肢力量强化',
  },
  {
    id: 'r2',
    memberName: '李思思',
    rating: 4,
    comment: '教练很耐心，动作讲解细致，整体体验不错。',
    date: '2026-06-03',
    courseTitle: '晨间燃脂动感单车',
  },
  {
    id: 'r3',
    memberName: '王大力',
    rating: 5,
    comment: '强度够大，练完很有成就感，下次还约！',
    date: '2026-06-01',
    courseTitle: 'HIIT燃脂挑战',
  },
];

const mockTrendData = [
  { month: '1月', rate: 78.5, courses: 32 },
  { month: '2月', rate: 82.1, courses: 38 },
  { month: '3月', rate: 85.3, courses: 42 },
  { month: '4月', rate: 88.7, courses: 45 },
  { month: '5月', rate: 91.2, courses: 48 },
  { month: '6月', rate: 93.8, courses: 52 },
];

export default function CoachReports() {
  const { courses, uploadReport, calculateConsumptionRate, fetchStats, fetchCourses } = useCoachStore();
  const { bookings, fetchBookings } = useMemberStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const coachId = currentUser?.id ?? 'coach1';

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reportText, setReportText] = useState('');

  const stats = useMemo(() => {
    return calculateConsumptionRate(coachId, selectedMonth);
  }, [calculateConsumptionRate, coachId, selectedMonth]);

  const coachCourses = useMemo(
    () => courses.filter((c) => c.coachId === coachId),
    [courses, coachId]
  );

  const completedBookings = useMemo(() => {
    const completedCourseIds = coachCourses
      .filter((c) => c.status === 'completed')
      .map((c) => c.id);
    return bookings.filter(
      (b) => completedCourseIds.includes(b.courseId) && b.attendance === true && !b.trainingReport
    );
  }, [bookings, coachCourses]);

  const satisfactionData = useMemo(() => {
    const avgRating = stats.avgSatisfaction ?? 4.5;
    const percentage = (avgRating / 5) * 100;
    return [
      { name: '满意度', value: percentage },
      { name: '剩余', value: 100 - percentage },
    ];
  }, [stats]);

  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(format(d, 'yyyy-MM'));
    }
    return options;
  }, []);

  const getMemberName = (memberId: string): string => {
    const users = useAuthStore.getState().users;
    const user = users.find((u) => u.id === memberId);
    return user?.name ?? memberId;
  };

  const getCourseTitle = (courseId: string): string => {
    const course = courses.find((c) => c.id === courseId);
    return course?.title ?? courseId;
  };

  const handleUploadReport = async () => {
    if (!selectedBooking || !reportText.trim()) return;
    const result = await uploadReport(selectedBooking.courseId, selectedBooking.id, reportText.trim());
    if (result) {
      setShowUploadModal(false);
      setSelectedBooking(null);
      setReportText('');
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchStats(coachId, selectedMonth);
    fetchBookings();
  }, [fetchCourses, fetchStats, fetchBookings, coachId, selectedMonth]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gradient">教练报告</h1>
            <p className="text-muted mt-1">查看教学数据与学员反馈</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 glass rounded-lg hover:bg-surfaceAlt transition-colors"
            >
              <Calendar size={16} />
              <span>
                {selectedMonth.slice(0, 4)}年{selectedMonth.slice(5)}月
              </span>
              <ChevronDown size={16} />
            </button>
            {showMonthDropdown && (
              <div className="absolute right-0 top-full mt-2 w-40 glass rounded-lg py-2 z-10 animate-fade-in-up">
                {monthOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(m);
                      setShowMonthDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-surfaceAlt transition-colors ${
                      selectedMonth === m ? 'text-accent' : ''
                    }`}
                  >
                    {m.slice(0, 4)}年{m.slice(5)}月
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-accent" size={20} />
              <h2 className="text-lg font-display font-semibold">耗课率趋势</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} domain={[60, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#F5F5F5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#FF5E1A"
                    strokeWidth={3}
                    dot={{ fill: '#FF5E1A', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#FF5E1A' }}
                    name="耗课率(%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-accent" size={20} />
              <h2 className="text-lg font-display font-semibold">学员满意度</h2>
            </div>
            <div className="relative h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={satisfactionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill="#FF5E1A" />
                    <Cell fill="#333" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold text-gradient">
                  {stats.avgSatisfaction?.toFixed(1) ?? '4.5'}
                </span>
                <span className="text-xs text-muted">满分 5.0</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={16}
                  className={
                    n <= Math.round(stats.avgSatisfaction ?? 4.5)
                      ? 'text-accent fill-accent'
                      : 'text-border'
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5 gradient-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted text-sm">月度耗课率</p>
              <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center">
                <TrendingUp className="text-accent" size={18} />
              </div>
            </div>
            <p className="text-4xl font-display font-bold text-gradient">
              {stats.consumptionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted mt-1">
              目标 85% {stats.consumptionRate >= 85 && '已达标 ✓'}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted text-sm">总课程数</p>
              <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center">
                <Calendar className="text-info" size={18} />
              </div>
            </div>
            <p className="text-4xl font-display font-bold">{stats.totalCourses}</p>
            <p className="text-xs text-muted mt-1">本月已排课</p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted text-sm">消耗课时</p>
              <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                <Check className="text-success" size={18} />
              </div>
            </div>
            <p className="text-4xl font-display font-bold">{stats.consumedCourses}</p>
            <p className="text-xs text-muted mt-1">实际出勤人次</p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted text-sm">累计学员</p>
              <div className="w-10 h-10 rounded-lg bg-purple/15 flex items-center justify-center">
                <Users className="text-purple" size={18} />
              </div>
            </div>
            <p className="text-4xl font-display font-bold">
              {
                new Set(
                  bookings
                    .filter((b) => {
                      const course = courses.find((c) => c.id === b.courseId);
                      return course?.coachId === coachId && b.attendance;
                    })
                    .map((b) => b.memberId)
                ).size
              }
            </p>
            <p className="text-xs text-muted mt-1">服务学员总数</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-accent" size={20} />
                <h2 className="text-lg font-display font-semibold">学员评价</h2>
              </div>
              <Award className="text-muted" size={18} />
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {mockReviews.map((review) => (
                <div key={review.id} className="p-4 bg-surfaceAlt/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center">
                        <User size={14} className="text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{review.memberName}</p>
                        <p className="text-xs text-muted flex items-center gap-1">
                          <Clock size={10} />
                          {review.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={12}
                          className={
                            n <= review.rating
                              ? 'text-accent fill-accent'
                              : 'text-border'
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-2 bg-surface px-2 py-1 rounded inline-block">
                    {review.courseTitle}
                  </p>
                  <p className="text-sm text-foreground/80">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="text-accent" size={20} />
                <h2 className="text-lg font-display font-semibold">待上传训练报告</h2>
              </div>
              <span className="text-xs bg-accent-soft text-accent px-2 py-1 rounded">
                {completedBookings.length} 份待提交
              </span>
            </div>
            {completedBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <FileText size={48} className="mb-3 opacity-30" />
                <p>暂无待上传的训练报告</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {completedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-surfaceAlt/50 rounded-xl hover:bg-surfaceAlt transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getCourseTitle(booking.courseId)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        学员：{getMemberName(booking.memberId)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setReportText('');
                        setShowUploadModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Upload size={14} />
                      上传
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold">上传训练报告</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedBooking(null);
                  setReportText('');
                }}
                className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-surfaceAlt/50 rounded-lg">
              <p className="text-sm font-medium">{getCourseTitle(selectedBooking.courseId)}</p>
              <p className="text-xs text-muted mt-1">
                学员：{getMemberName(selectedBooking.memberId)}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted block mb-2">训练报告内容</label>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="请输入本节课的训练总结、学员表现、下次建议等内容..."
                rows={8}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedBooking(null);
                  setReportText('');
                }}
                className="flex-1 py-2.5 bg-surfaceAlt hover:bg-surface rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUploadReport}
                disabled={!reportText.trim()}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send size={16} />
                提交报告
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
