import { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  RefreshCw,
  Bell,
  ChevronRight,
  FileText,
  Download,
  CheckCheck,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useMessageStore } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { Message, MessageType } from '@/types';
import {
  generateBookingVoucher,
  generateRefundVoucher,
  generateAttendanceVoucher,
  downloadVoucher,
} from '@/utils/voucher';
import {
  initialBookings,
  initialCourses,
  mockUsers,
  initialRefundRequests,
  initialStores,
} from '@/utils/mockData';

type MessageCategory = 'all' | 'booking' | 'waiting' | 'refund' | 'reminder';

const CATEGORY_CONFIG: Record<
  Exclude<MessageCategory, 'all'>,
  { label: string; icon: typeof CalendarCheck; types: MessageType[]; color: string }
> = {
  booking: {
    label: '预约',
    icon: CalendarCheck,
    types: ['booking_success', 'attendance_record'],
    color: 'text-green-600 bg-green-50',
  },
  waiting: {
    label: '候补',
    icon: Clock,
    types: ['waiting_promoted'],
    color: 'text-blue-600 bg-blue-50',
  },
  refund: {
    label: '退款',
    icon: RefreshCw,
    types: ['refund_request', 'refund_result'],
    color: 'text-orange-600 bg-orange-50',
  },
  reminder: {
    label: '提醒',
    icon: Bell,
    types: ['course_reminder'],
    color: 'text-purple-600 bg-purple-50',
  },
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatFullDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCategoryIcon(type: MessageType) {
  if (CATEGORY_CONFIG.booking.types.includes(type)) {
    return { Icon: CATEGORY_CONFIG.booking.icon, color: CATEGORY_CONFIG.booking.color };
  }
  if (CATEGORY_CONFIG.waiting.types.includes(type)) {
    return { Icon: CATEGORY_CONFIG.waiting.icon, color: CATEGORY_CONFIG.waiting.color };
  }
  if (CATEGORY_CONFIG.refund.types.includes(type)) {
    return { Icon: CATEGORY_CONFIG.refund.icon, color: CATEGORY_CONFIG.refund.color };
  }
  return { Icon: CATEGORY_CONFIG.reminder.icon, color: CATEGORY_CONFIG.reminder.color };
}

export default function Messages() {
  const { messages, markRead, markAllRead, fetchMessages } = useMessageStore();
  const { currentUser } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState<MessageCategory>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const userMessages = useMemo(() => {
    if (!currentUser) return [];
    return messages.filter(
      (m) => m.userId === currentUser.id && m.role === currentUser.role,
    );
  }, [messages, currentUser]);

  const filteredMessages = useMemo(() => {
    if (activeCategory === 'all') return userMessages;
    const config = CATEGORY_CONFIG[activeCategory];
    return userMessages.filter((m) => config.types.includes(m.type));
  }, [userMessages, activeCategory]);

  const categoryUnreadCounts = useMemo(() => {
    const counts: Record<MessageCategory, number> = {
      all: 0,
      booking: 0,
      waiting: 0,
      refund: 0,
      reminder: 0,
    };
    userMessages.forEach((m) => {
      if (!m.read) {
        counts.all++;
        if (CATEGORY_CONFIG.booking.types.includes(m.type)) counts.booking++;
        if (CATEGORY_CONFIG.waiting.types.includes(m.type)) counts.waiting++;
        if (CATEGORY_CONFIG.refund.types.includes(m.type)) counts.refund++;
        if (CATEGORY_CONFIG.reminder.types.includes(m.type)) counts.reminder++;
      }
    });
    return counts;
  }, [userMessages]);

  const handleSelectMessage = async (msg: Message) => {
    if (!msg.read) {
      await markRead(msg.id);
    }
    setSelectedMessage(msg);
  };

  const handleDownloadVoucher = (msg: Message) => {
    if (!msg.hasVoucher || !msg.voucher) return;

    if (msg.voucher.type === 'booking' && msg.voucher.bookingId) {
      const booking = initialBookings.find((b) => b.id === msg.voucher!.bookingId);
      if (booking) {
        const course = initialCourses.find((c) => c.id === booking.courseId);
        const member = mockUsers.find((u) => u.id === booking.memberId);
        const store = course ? initialStores.find((s) => s.id === course.storeId) : undefined;
        if (booking && course && member) {
          const content = generateBookingVoucher({ booking, course, member, store });
          downloadVoucher(content, `预约凭证_${msg.voucher.bookingId}`);
        }
      }
    } else if (msg.voucher.type === 'refund') {
      const refundId = msg.voucher.refundId || msg.relatedId;
      const refund = initialRefundRequests.find((r) => r.id === refundId);
      if (refund) {
        const booking = initialBookings.find((b) => b.id === refund.bookingId);
        const course = booking ? initialCourses.find((c) => c.id === booking.courseId) : undefined;
        const member = mockUsers.find((u) => u.id === refund.memberId);
        if (refund && booking && course && member) {
          const content = generateRefundVoucher({ refundRequest: refund, member, booking, course });
          downloadVoucher(content, `退款凭证_${refundId}`);
        }
      }
    } else if (msg.voucher.type === 'attendance' && msg.voucher.bookingId) {
      const booking = initialBookings.find((b) => b.id === msg.voucher!.bookingId);
      if (booking) {
        const course = initialCourses.find((c) => c.id === booking.courseId);
        const member = mockUsers.find((u) => u.id === booking.memberId);
        const coach = course ? mockUsers.find((u) => u.id === course.coachId) : undefined;
        const store = course ? initialStores.find((s) => s.id === course.storeId) : undefined;
        if (booking && course && member) {
          const content = generateAttendanceVoucher({
            booking,
            course,
            member,
            coach,
            store,
            trainingReport: booking.trainingReport,
          });
          downloadVoucher(content, `出勤凭证_${msg.voucher.bookingId}`);
        }
      }
    }
  };

  const getMessageDetailData = (msg: Message) => {
    const rows: { label: string; value: string }[] = [];
    rows.push({ label: '消息类型', value: msg.type });
    rows.push({ label: '发送时间', value: formatFullDateTime(msg.createdAt) });

    if (msg.relatedId) {
      rows.push({ label: '关联ID', value: msg.relatedId });
    }

    if (msg.voucher) {
      rows.push({ label: '凭证编号', value: msg.voucher.code });
      if (msg.voucher.amount) {
        rows.push({ label: '关联金额', value: `¥${msg.voucher.amount}` });
      }
    }

    if (msg.voucher?.bookingId) {
      const booking = initialBookings.find((b) => b.id === msg.voucher!.bookingId);
      if (booking) {
        const course = initialCourses.find((c) => c.id === booking.courseId);
        if (course) {
          rows.push({ label: '课程名称', value: course.title });
          rows.push({
            label: '课程时间',
            value: `${course.date} ${course.startTime}-${course.endTime}`,
          });
        }
        rows.push({ label: '实付金额', value: `¥${booking.actualPrice}` });
        if (booking.attendance !== undefined) {
          rows.push({
            label: '出勤状态',
            value: booking.attendance ? '已出勤' : '未出勤',
          });
        }
      }
    }

    return rows;
  };

  const categoryTabs: { key: MessageCategory; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'booking', label: '预约' },
    { key: 'waiting', label: '候补' },
    { key: 'refund', label: '退款' },
    { key: 'reminder', label: '提醒' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">消息通知</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {categoryUnreadCounts.all > 0
                ? `${categoryUnreadCounts.all} 条未读`
                : '暂无未读消息'}
            </p>
          </div>
          {categoryUnreadCounts.all > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              全部已读
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {categoryTabs.map(({ key, label }) => {
            const isActive = activeCategory === key;
            const unread = categoryUnreadCounts[key];
            const config = key !== 'all' ? CATEGORY_CONFIG[key] : null;
            const Icon = config?.icon || FileText;

            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-orange-600' : 'text-gray-400',
                    )}
                  />
                  {label}
                </div>
                {unread > 0 && (
                  <span
                    className={cn(
                      'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                      isActive ? 'bg-orange-500 text-white' : 'bg-orange-500 text-white',
                    )}
                  >
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedMessage && (
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回列表
                </button>
              )}
              <h2 className="text-base font-semibold text-gray-800">
                {selectedMessage ? selectedMessage.title : '消息列表'}
              </h2>
            </div>
            <span className="text-sm text-gray-500">
              共 {filteredMessages.length} 条消息
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div
            className={cn(
              'flex-1 overflow-y-auto p-6',
              selectedMessage ? 'hidden lg:block' : 'block',
            )}
          >
            {filteredMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <FileText className="mb-4 h-16 w-16 text-gray-300" />
                <p className="text-lg font-medium text-gray-600">暂无消息</p>
                <p className="mt-1 text-sm text-gray-400">此分类下还没有任何消息</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />
                <div className="space-y-4">
                  {filteredMessages.map((msg) => {
                    const { Icon, color } = getCategoryIcon(msg.type);
                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg)}
                        className={cn(
                          'relative ml-8 cursor-pointer rounded-xl border p-4 transition-all',
                          selectedMessage?.id === msg.id
                            ? 'border-orange-300 bg-orange-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                        )}
                      >
                        <div
                          className={cn(
                            'absolute -left-8 top-5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white',
                            color,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        {!msg.read && (
                          <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-orange-500" />
                        )}

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className={cn(
                                  'truncate text-sm font-semibold',
                                  msg.read ? 'text-gray-700' : 'text-gray-900',
                                )}
                              >
                                {msg.title}
                              </h3>
                              {msg.hasVoucher && (
                                <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                                  <FileText className="h-3 w-3" />
                                  凭证
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                              {msg.content}
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                              <span>{formatTime(msg.createdAt)}</span>
                            </div>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-5 w-5 flex-shrink-0 transition-colors',
                              selectedMessage?.id === msg.id
                                ? 'text-orange-500'
                                : 'text-gray-300',
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {selectedMessage && (
            <div
              className={cn(
                'flex w-full flex-col border-l border-gray-200 bg-white lg:w-[420px]',
                selectedMessage ? 'flex' : 'hidden lg:flex',
              )}
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h3 className="font-semibold text-gray-800">消息详情</h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedMessage.title}
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatFullDateTime(selectedMessage.createdAt)}
                  </p>
                </div>

                <div className="mb-6 rounded-xl bg-gray-50 p-4">
                  <p className="text-sm leading-relaxed text-gray-700">
                    {selectedMessage.content}
                  </p>
                </div>

                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-semibold text-gray-800">操作数据</h4>
                  <div className="space-y-2">
                    {getMessageDetailData(selectedMessage).map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b border-gray-100 py-2"
                      >
                        <span className="text-sm text-gray-500">{row.label}</span>
                        <span className="text-sm font-medium text-gray-800">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMessage.hasVoucher && (
                  <button
                    onClick={() => handleDownloadVoucher(selectedMessage)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                  >
                    <Download className="h-4 w-4" />
                    下载相关凭证
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
