import { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  Check,
  X,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Filter,
  ChevronDown,
  DollarSign,
  Calendar,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useManagerStore } from '@/store/managerStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { RefundRequest, RefundStatus } from '@/types';

const statusConfig: Record<RefundStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string; size?: number | string }> }> = {
  pending: {
    label: '待审批',
    className: 'bg-accent/15 text-accent',
    icon: Clock,
  },
  approved: {
    label: '已通过',
    className: 'bg-success/15 text-success',
    icon: Check,
  },
  rejected: {
    label: '已驳回',
    className: 'bg-danger/15 text-danger',
    icon: X,
  },
};

export default function ManagerRefunds() {
  const { refundRequests, reviewRefund, fetchRefundRequests } = useManagerStore();
  const currentUser = useAuthStore((s) => s.currentUser);

  useEffect(() => {
    fetchRefundRequests();
  }, []);

  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [reviewModal, setReviewModal] = useState<{
    request: RefundRequest;
    action: 'approve' | 'reject';
  } | null>(null);

  const filteredRequests = useMemo(() => {
    let list = [...refundRequests];
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [refundRequests, statusFilter]);

  const stats = useMemo(() => {
    const pending = refundRequests.filter((r) => r.status === 'pending').length;
    const approved = refundRequests.filter((r) => r.status === 'approved').length;
    const rejected = refundRequests.filter((r) => r.status === 'rejected').length;
    const totalRefundAmount = refundRequests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + r.refundAmount, 0);
    return { pending, approved, rejected, totalRefundAmount };
  }, [refundRequests]);

  const getMemberName = (memberId: string): string => {
    const users = useAuthStore.getState().users;
    const user = users.find((u) => u.id === memberId);
    return user?.name ?? memberId;
  };

  const getMemberPhone = (memberId: string): string => {
    const users = useAuthStore.getState().users;
    const user = users.find((u) => u.id === memberId);
    return user?.phone ?? '-';
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleReview = () => {
    if (!reviewModal) return;
    reviewRefund(
      reviewModal.request.id,
      reviewModal.action === 'approve',
      currentUser?.id
    );
    setReviewModal(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gradient">退款审批</h1>
            <p className="text-muted mt-1">审核会员退款申请</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5 gradient-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-sm">待审批</p>
              <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center">
                <Clock className="text-accent" size={18} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-gradient">{stats.pending}</p>
            <p className="text-xs text-muted mt-1">需要处理的申请</p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-sm">已通过</p>
              <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                <Check className="text-success" size={18} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold">{stats.approved}</p>
            <p className="text-xs text-muted mt-1">本月已通过申请</p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-sm">已驳回</p>
              <div className="w-10 h-10 rounded-lg bg-danger/15 flex items-center justify-center">
                <X className="text-danger" size={18} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold">{stats.rejected}</p>
            <p className="text-xs text-muted mt-1">本月已驳回申请</p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-sm">已退金额</p>
              <div className="w-10 h-10 rounded-lg bg-purple/15 flex items-center justify-center">
                <DollarSign className="text-purple" size={18} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold">¥{stats.totalRefundAmount.toFixed(0)}</p>
            <p className="text-xs text-muted mt-1">累计退款金额</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <FileText className="text-accent" size={18} />
            退款申请列表
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-surfaceAlt transition-colors"
            >
              <Filter size={16} />
              <span>
                {statusFilter === 'all'
                  ? '全部状态'
                  : statusConfig[statusFilter].label}
              </span>
              <ChevronDown size={16} />
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-2 w-36 glass rounded-lg py-2 z-10 animate-fade-in-up">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setShowFilterDropdown(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 hover:bg-surfaceAlt transition-colors text-sm',
                      statusFilter === s && 'text-accent'
                    )}
                  >
                    {s === 'all' ? '全部状态' : statusConfig[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="glass rounded-xl p-16 flex flex-col items-center justify-center text-muted">
              <RefreshCw size={48} className="mb-4 opacity-30" />
              <p>暂无退款申请</p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const cfg = statusConfig[request.status];
              const StatusIcon = cfg.icon;
              const completedRatio = (request.completedSessions / request.totalSessions) * 100;
              return (
                <div
                  key={request.id}
                  className="glass rounded-xl p-6 animate-fade-in-up"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-surfaceAlt flex items-center justify-center">
                          <User size={18} className="text-muted" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getMemberName(request.memberId)}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.className)}>
                              <StatusIcon size={10} />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted">{getMemberPhone(request.memberId)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-surfaceAlt/50 rounded-lg p-3">
                          <p className="text-xs text-muted mb-1">已上课次</p>
                          <p className="font-semibold">
                            {request.completedSessions}/{request.totalSessions} 次
                          </p>
                          <div className="w-full h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-info rounded-full transition-all"
                              style={{ width: `${completedRatio}%` }}
                            />
                          </div>
                        </div>
                        <div className="bg-surfaceAlt/50 rounded-lg p-3">
                          <p className="text-xs text-muted mb-1">剩余比例</p>
                          <p className="font-semibold text-info">
                            {(request.refundRatio * 100).toFixed(0)}%
                          </p>
                          <p className="text-[10px] text-muted mt-2">
                            已使用 {(100 - request.refundRatio * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="bg-surfaceAlt/50 rounded-lg p-3">
                          <p className="text-xs text-muted mb-1">实付金额</p>
                          <p className="font-semibold text-muted">
                            ¥{request.paidAmount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted mt-2">累计支付</p>
                        </div>
                        <div className="bg-surfaceAlt/50 rounded-lg p-3 border border-accent/30">
                          <p className="text-xs text-muted mb-1">应退金额</p>
                          <p className="font-semibold text-accent text-lg">
                            ¥{request.refundAmount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted mt-2">
                            实付 × {request.refundRatio.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-surfaceAlt/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-muted mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted mb-1">退款原因</p>
                            <p className="text-sm">{request.reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-48 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Calendar size={12} />
                        申请时间：{formatDate(request.createdAt)}
                      </div>
                      {request.reviewedAt && (
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <Clock size={12} />
                          处理时间：{formatDate(request.reviewedAt)}
                        </div>
                      )}
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              setReviewModal({ request, action: 'approve' })
                            }
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-success hover:bg-success/80 text-white rounded-lg font-medium transition-colors"
                          >
                            <ThumbsUp size={16} />
                            通过
                          </button>
                          <button
                            onClick={() =>
                              setReviewModal({ request, action: 'reject' })
                            }
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-danger hover:bg-danger/80 text-white rounded-lg font-medium transition-colors"
                          >
                            <ThumbsDown size={16} />
                            驳回
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {reviewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                  reviewModal.action === 'approve'
                    ? 'bg-success/15'
                    : 'bg-danger/15'
                )}
              >
                {reviewModal.action === 'approve' ? (
                  <ThumbsUp className="text-success" size={22} />
                ) : (
                  <ThumbsDown className="text-danger" size={22} />
                )}
              </div>
              <div>
                <h3 className="text-lg font-display font-bold">
                  {reviewModal.action === 'approve' ? '确认通过退款' : '确认驳回退款'}
                </h3>
                <p className="text-sm text-muted">
                  会员：{getMemberName(reviewModal.request.memberId)}
                </p>
              </div>
            </div>

            <div className="bg-surfaceAlt/50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted text-sm">已上课次</span>
                <span className="text-sm font-medium">
                  {reviewModal.request.completedSessions}/
                  {reviewModal.request.totalSessions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">实付金额</span>
                <span className="text-sm font-medium">
                  ¥{reviewModal.request.paidAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-muted text-sm">应退金额</span>
                <span className="text-lg font-bold text-accent">
                  ¥{reviewModal.request.refundAmount.toFixed(2)}
                </span>
              </div>
              {reviewModal.action === 'approve' && (
                <p className="text-xs text-success bg-success/10 rounded-lg p-2 mt-2">
                  退款将在3个工作日内原路返回会员账户
                </p>
              )}
              {reviewModal.action === 'reject' && (
                <p className="text-xs text-danger bg-danger/10 rounded-lg p-2 mt-2">
                  驳回后会员将收到系统通知，退款流程终止
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 py-2.5 bg-surfaceAlt hover:bg-surface rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReview}
                className={cn(
                  'flex-1 py-2.5 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                  reviewModal.action === 'approve'
                    ? 'bg-success hover:bg-success/80'
                    : 'bg-danger hover:bg-danger/80'
                )}
              >
                {reviewModal.action === 'approve' ? (
                  <>
                    <Check size={16} />
                    确认通过
                  </>
                ) : (
                  <>
                    <X size={16} />
                    确认驳回
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
