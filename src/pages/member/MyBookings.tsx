import { useMemo, useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  X,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  User as UserIcon,
  Activity,
  Dumbbell,
  Bike,
  Flower2,
  Flame,
  FileText,
  MapPin,
  Tag,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMemberStore } from '@/store/memberStore';
import { useCoachStore } from '@/store/coachStore';
import { useManagerStore } from '@/store/managerStore';
import { calculateRefundAmount, formatPrice } from '@/utils/price';
import { cn } from '@/lib/utils';
import type { Booking, Course, CourseCategory } from '@/types';
import { mockUsers } from '@/utils/mockData';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  flower2: Flower2,
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
};

function getCategoryIcon(categoryId: string, categories: CourseCategory[]) {
  const cat = categories.find((c) => c.id === categoryId);
  if (cat && iconMap[cat.icon]) return iconMap[cat.icon];
  return Activity;
}

type TabKey = 'booked' | 'waiting' | 'completed' | 'cancelled';

const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'booked', label: '已预约', icon: Calendar },
  { key: 'waiting', label: '候补中', icon: Clock },
  { key: 'completed', label: '已完成', icon: CheckCircle },
  { key: 'cancelled', label: '已取消', icon: XCircle },
];

export default function MyBookings() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { bookings, waitingQueues, cancelBooking, applyRefund, refundRequests, fetchBookings, fetchWaitingQueues } = useMemberStore();
  const { courses } = useCoachStore();
  const { categories } = useManagerStore();

  useEffect(() => {
    fetchBookings();
    fetchWaitingQueues();
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>('booked');
  const [cancelModal, setCancelModal] = useState<{ booking: Booking; course: Course } | null>(null);
  const [refundModal, setRefundModal] = useState<{ booking: Booking; course: Course } | null>(null);
  const [attendanceModal, setAttendanceModal] = useState<{ booking: Booking; course: Course } | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [totalSessions, setTotalSessions] = useState(1);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const coaches = useMemo(() => mockUsers.filter((u) => u.role === 'coach'), []);

  const myBookings = useMemo(() => {
    if (!currentUser) return [];
    return bookings.filter((b) => b.memberId === currentUser.id);
  }, [bookings, currentUser]);

  const myWaitingQueues = useMemo(() => {
    if (!currentUser) return [];
    return waitingQueues
      .map((wq: any) => {
        let position = -1;
        let joinedAt: string | undefined;
        if (typeof wq.myPosition === 'number' && wq.myPosition >= 1) {
          position = wq.myPosition - 1;
          joinedAt = wq.joinedAt;
        } else if (wq.members && Array.isArray(wq.members)) {
          position = wq.members.findIndex((m: any) => m.memberId === currentUser.id);
          if (position >= 0) joinedAt = wq.members[position].joinedAt;
        }
        if (position < 0) return null;
        const course = courses.find((c) => c.id === wq.courseId);
        if (!course) return null;
        return {
          ...wq,
          position: position + 1,
          course,
          joinedAt: joinedAt || new Date().toISOString(),
        };
      })
      .filter(Boolean) as Array<{ courseId: string; members: unknown[]; position: number; course: Course; joinedAt: string }>;
  }, [waitingQueues, currentUser, courses]);

  const filteredBookings = useMemo(() => {
    return myBookings
      .filter((b) => {
        if (activeTab === 'booked') return b.status === 'booked';
        if (activeTab === 'completed') return b.status === 'completed';
        if (activeTab === 'cancelled') return b.status === 'cancelled' || b.status === 'refunded';
        return false;
      })
      .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
  }, [myBookings, activeTab]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getCoachName = (coachId: string) => {
    return coaches.find((c) => c.id === coachId)?.name || '未知教练';
  };

  const handleCancelBooking = async () => {
    if (!cancelModal) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    cancelBooking(cancelModal.booking.id, courses);
    setIsProcessing(false);
    setCancelModal(null);
    showToast('success', '预约已取消');
  };

  const handleApplyRefund = async () => {
    if (!refundModal || !refundReason.trim()) return;
    setIsProcessing(true);
    try {
      const result = await applyRefund(
        refundModal.booking.id,
        refundReason.trim(),
        totalSessions,
        completedSessions
      );
      setIsProcessing(false);
      if (result) {
        setRefundModal(null);
        setRefundReason('');
        setTotalSessions(1);
        setCompletedSessions(0);
        showToast('success', `退款申请已提交，应退 ¥${result.refundAmount.toFixed(2)}`);
      } else {
        showToast('error', '提交失败，请重试');
      }
    } catch {
      setIsProcessing(false);
      showToast('error', '提交失败，请重试');
    }
  };

  const openRefundModal = (booking: Booking, course: Course) => {
    setRefundModal({ booking, course });
    setRefundReason('');
    setTotalSessions(1);
    setCompletedSessions(0);
  };

  const refundCalc = useMemo(() => {
    if (!refundModal) return null;
    return calculateRefundAmount(refundModal.booking.actualPrice, totalSessions, completedSessions);
  }, [refundModal, totalSessions, completedSessions]);

  const getBookingCourse = (booking: Booking) => {
    return courses.find((c) => c.id === booking.courseId);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'booked':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-info/15 text-info border border-info/30">已预约</span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-success/15 text-success border border-success/30">已完成</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-muted/20 text-muted border border-border">已取消</span>;
      case 'refunded':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-purple/15 text-purple border border-purple/30">已退款</span>;
      case 'waiting':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent border border-accent/30">候补中</span>;
      default:
        return null;
    }
  };

  const tabCounts: Record<TabKey, number> = {
    booked: myBookings.filter((b) => b.status === 'booked').length,
    waiting: myWaitingQueues.length,
    completed: myBookings.filter((b) => b.status === 'completed').length,
    cancelled: myBookings.filter((b) => b.status === 'cancelled' || b.status === 'refunded').length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {toast && (
          <div
            className={cn(
              'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-card border text-sm flex items-center gap-2 animate-slide-in-right',
              toast.type === 'success' && 'bg-success/15 border-success/30 text-success',
              toast.type === 'error' && 'bg-danger/15 border-danger/30 text-danger',
              toast.type === 'info' && 'bg-info/15 border-info/30 text-info'
            )}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold font-display mb-1">我的预约</h1>
          <p className="text-muted text-sm">管理您的课程预约记录</p>
        </div>

        <div className="bg-surface rounded-2xl p-1.5 mb-6 shadow-card border border-border">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-accent text-white shadow-glow'
                      : 'text-muted hover:text-foreground hover:bg-surfaceAlt'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-white/20' : 'bg-surfaceAlt'
                    )}
                  >
                    {tabCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'waiting' ? (
          myWaitingQueues.length === 0 ? (
            <EmptyState icon={Clock} title="暂无候补记录" subtitle="满员课程可申请候补排队" />
          ) : (
            <div className="space-y-3">
              {myWaitingQueues.map((wq) => {
                const category = categories.find((c) => c.id === wq.course.categoryId);
                const CategoryIcon = getCategoryIcon(wq.course.categoryId, categories);
                return (
                  <div
                    key={wq.courseId}
                    className="bg-surface rounded-2xl p-5 shadow-card border border-border"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${category?.color || '#FF5E1A'}20` }}
                      >
                        <CategoryIcon
                          className="w-6 h-6"
                          style={{ color: category?.color || '#FF5E1A' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-base">{wq.course.title}</h3>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            第{wq.position}位
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-muted">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {wq.course.date.slice(5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {wq.course.startTime}-{wq.course.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5" />
                              {getCoachName(wq.course.coachId)}
                            </span>
                          </div>
                          <p className="text-accent text-xs mt-1">
                            候补加入时间：{new Date(wq.joinedAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={activeTab === 'booked' ? '暂无预约课程' : activeTab === 'completed' ? '暂无已完成课程' : '暂无已取消预约'}
            subtitle={activeTab === 'booked' ? '去预约页面挑选喜欢的课程吧' : '当您完成或取消课程后会显示在这里'}
          />
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => {
              const course = getBookingCourse(booking);
              if (!course) return null;
              const category = categories.find((c) => c.id === course.categoryId);
              const CategoryIcon = getCategoryIcon(course.categoryId, categories);
              const myRefund = refundRequests.find((r) => r.bookingId === booking.id);

              return (
                <div
                  key={booking.id}
                  className="bg-surface rounded-2xl p-5 shadow-card border border-border"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${category?.color || '#FF5E1A'}20` }}
                    >
                      <CategoryIcon
                        className="w-6 h-6"
                        style={{ color: category?.color || '#FF5E1A' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base truncate">{course.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {statusBadge(booking.status)}
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-muted mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {course.date.slice(5)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {course.startTime}-{course.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5" />
                            {getCoachName(course.coachId)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            FitPro 旗舰店
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" />
                            {category?.name || '未分类'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-accent">
                            {formatPrice(booking.actualPrice)}
                          </span>
                          {booking.discountRate < 1 && (
                            <span className="text-xs text-muted line-through">
                              {formatPrice(booking.price)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {booking.status === 'completed' && (
                            <>
                              {booking.attendance && (
                                <button
                                  onClick={() => setAttendanceModal({ booking, course })}
                                  className="px-3 py-1.5 text-xs rounded-lg bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-colors flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  出勤记录
                                </button>
                              )}
                            </>
                          )}
                          {booking.status === 'booked' && (
                            <>
                              <button
                                onClick={() => openRefundModal(booking, course)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-purple/15 text-purple border border-purple/30 hover:bg-purple/25 transition-colors flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                申请退款
                              </button>
                              <button
                                onClick={() => setCancelModal({ booking, course })}
                                className="px-3 py-1.5 text-xs rounded-lg bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 transition-colors flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                取消预约
                              </button>
                            </>
                          )}
                          {myRefund && booking.status !== 'refunded' && (
                            <span
                              className={cn(
                                'px-2.5 py-1 text-xs rounded-lg flex items-center gap-1',
                                myRefund.status === 'pending' && 'bg-info/15 text-info border border-info/30',
                                myRefund.status === 'approved' && 'bg-success/15 text-success border border-success/30',
                                myRefund.status === 'rejected' && 'bg-danger/15 text-danger border border-danger/30'
                              )}
                            >
                              {myRefund.status === 'pending' && <Clock className="w-3 h-3" />}
                              {myRefund.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                              {myRefund.status === 'rejected' && <XCircle className="w-3 h-3" />}
                              退款{myRefund.status === 'pending' ? '审核中' : myRefund.status === 'approved' ? '已通过' : '已驳回'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cancelModal && (
          <Modal onClose={() => !isProcessing && setCancelModal(null)} title="取消预约">
            <div className="space-y-4">
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" style={{ color: '#FF5E1A' }} />
                <div className="text-sm">
                  <p className="font-medium mb-1">确定要取消这个预约吗？</p>
                  <p className="text-muted text-xs">
                    课程：{cancelModal.course.title}
                    <br />
                    时间：{cancelModal.course.date.slice(5)} {cancelModal.course.startTime}-{cancelModal.course.endTime}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted">
                取消后，若有候补会员将自动补位。退款将按原支付路径返回。
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCancelModal(null)}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surfaceAlt text-foreground border border-border hover:bg-border/50 transition-colors disabled:opacity-50"
                >
                  再想想
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-danger text-white hover:bg-danger/85 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认取消
                </button>
              </div>
            </div>
          </Modal>
        )}

        {refundModal && refundCalc && (
          <Modal onClose={() => !isProcessing && setRefundModal(null)} title="申请退款">
            <div className="space-y-4">
              <div className="bg-surfaceAlt rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">课程</span>
                  <span className="font-medium">{refundModal.course.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">实付金额</span>
                  <span className="font-medium">{formatPrice(refundModal.booking.actualPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">退款比例</span>
                  <span className="font-medium text-accent">{(refundCalc.refundRatio * 100).toFixed(0)}%</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-muted">预计退款</span>
                  <span className="font-bold text-lg text-success">{formatPrice(refundCalc.refundAmount)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">课程总节数</label>
                <input
                  type="number"
                  min={1}
                  value={totalSessions}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value) || 1);
                    setTotalSessions(v);
                    setCompletedSessions((s) => Math.min(s, v));
                  }}
                  className="w-full bg-surfaceAlt border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">已完成节数</label>
                <input
                  type="number"
                  min={0}
                  max={totalSessions}
                  value={completedSessions}
                  onChange={(e) => {
                    const v = Math.min(totalSessions, Math.max(0, Number(e.target.value) || 0));
                    setCompletedSessions(v);
                  }}
                  className="w-full bg-surfaceAlt border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">退款原因</label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="请说明退款原因..."
                  className="w-full bg-surfaceAlt border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRefundModal(null)}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surfaceAlt text-foreground border border-border hover:bg-border/50 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleApplyRefund}
                  disabled={isProcessing || !refundReason.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  提交申请
                </button>
              </div>
            </div>
          </Modal>
        )}

        {attendanceModal && (
          <Modal onClose={() => setAttendanceModal(null)} title="出勤记录详情">
            <div className="space-y-4">
              <div className="bg-success/15 border border-success/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-success" />
                <div>
                  <p className="font-semibold">已出勤</p>
                  <p className="text-xs text-muted">
                    {attendanceModal.course.date.slice(5)} {attendanceModal.course.startTime}-{attendanceModal.course.endTime}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted">课程名称</span>
                  <span className="font-medium">{attendanceModal.course.title}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted">授课教练</span>
                  <span className="font-medium">{getCoachName(attendanceModal.course.coachId)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted">支付金额</span>
                  <span className="font-medium text-accent">{formatPrice(attendanceModal.booking.actualPrice)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted">预约时间</span>
                  <span className="font-medium">{new Date(attendanceModal.booking.bookedAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>

              {attendanceModal.booking.trainingReport && (
                <div className="bg-surfaceAlt rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">教练训练报告</span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">
                    {attendanceModal.booking.trainingReport}
                  </p>
                </div>
              )}

              <button
                onClick={() => setAttendanceModal(null)}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              >
                知道了 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-surface rounded-2xl p-12 text-center shadow-card border border-border">
      <Icon className="w-12 h-12 mx-auto text-muted opacity-40 mb-3" />
      <p className="text-foreground font-medium mb-1">{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-surface rounded-2xl p-6 shadow-card border border-border max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold font-display">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surfaceAlt flex items-center justify-center text-muted hover:text-foreground hover:bg-border/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
