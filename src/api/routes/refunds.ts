import type { RefundRequest, MessageVoucher, UserRole, MessageType } from '../../types';
import { getDb, saveDb, generateId, ApiContext, ApiResponse, ok, fail } from '../db';

export interface CreateRefundBody {
  bookingId: string;
  totalSessions: number;
  completedSessions: number;
  reason: string;
}

export interface RejectRefundBody {
  reason: string;
}

function sendMessage(
  userId: string,
  role: UserRole,
  type: MessageType,
  title: string,
  content: string,
  relatedId?: string,
  relatedType?: 'booking' | 'course' | 'refund',
  voucher?: MessageVoucher
): void {
  const db = getDb();
  const newMsg = {
    id: generateId('msg_'),
    userId,
    role: role as UserRole,
    type,
    title,
    content,
    relatedId,
    relatedType,
    read: false,
    createdAt: new Date().toISOString(),
    hasVoucher: !!voucher,
    voucher,
  };
  db.messages.unshift(newMsg);
  saveDb(db);
}

export function getRefunds(ctx: ApiContext, query?: { status?: string }): ApiResponse<RefundRequest[]> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId) {
    return fail<RefundRequest[]>('未登录');
  }

  let result: RefundRequest[] = [];

  if (currentUserRole === 'member') {
    result = db.refundRequests.filter((r) => r.memberId === currentUserId);
  } else if (currentUserRole === 'manager' || currentUserRole === 'owner') {
    result = [...db.refundRequests];
    if (query?.status) {
      result = result.filter((r) => r.status === query.status);
    }
  } else {
    return fail<RefundRequest[]>('无权访问');
  }

  return ok(result);
}

export function createRefund(ctx: ApiContext, body: CreateRefundBody): ApiResponse<RefundRequest> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId || currentUserRole !== 'member') {
    return fail('只有会员可以申请退款');
  }

  const booking = db.bookings.find(
    (b) => b.id === body.bookingId && b.memberId === currentUserId
  );
  if (!booking) {
    return fail('预约不存在或不属于您');
  }

  const existingRefund = db.refundRequests.find((r) => r.bookingId === body.bookingId);
  if (existingRefund) {
    return fail('该预约已存在退款申请');
  }

  const { totalSessions, completedSessions, reason } = body;
  if (totalSessions <= 0 || completedSessions < 0 || completedSessions > totalSessions) {
    return fail('课时数参数不合法');
  }

  const completedRatio = completedSessions / totalSessions;
  const refundRatio = Number(Math.max(0, 1 - completedRatio).toFixed(2));
  const refundAmount = Math.round(booking.actualPrice * refundRatio);

  const refundRequest: RefundRequest = {
    id: generateId('r_'),
    bookingId: body.bookingId,
    memberId: currentUserId,
    totalSessions,
    completedSessions,
    refundRatio,
    paidAmount: booking.actualPrice,
    refundAmount,
    status: 'pending',
    reason,
    createdAt: new Date().toISOString(),
  };

  db.refundRequests.push(refundRequest);
  saveDb(db);

  sendMessage(
    currentUserId,
    'member',
    'refund_request',
    '退款申请已提交',
    `您已提交退款申请，应退金额 ¥${refundAmount.toFixed(2)}，请等待运营审核。`,
    refundRequest.id,
    'refund'
  );

  const managers = db.users.filter((u) => u.role === 'manager');
  for (const mgr of managers) {
    sendMessage(
      mgr.id,
      'manager',
      'refund_request',
      '新退款申请待审批',
      `会员提交了退款申请，金额 ¥${refundAmount.toFixed(2)}，请及时处理。`,
      refundRequest.id,
      'refund'
    );
  }

  return ok(refundRequest);
}

export function approveRefund(ctx: ApiContext, refundId: string): ApiResponse<RefundRequest> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId || currentUserRole !== 'manager') {
    return fail('只有运营经理可以审批退款');
  }

  const idx = db.refundRequests.findIndex((r) => r.id === refundId);
  if (idx === -1) {
    return fail('退款申请不存在');
  }

  if (db.refundRequests[idx].status !== 'pending') {
    return fail('该申请已被处理');
  }

  db.refundRequests[idx] = {
    ...db.refundRequests[idx],
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewerId: currentUserId,
  };

  const bookingIdx = db.bookings.findIndex((b) => b.id === db.refundRequests[idx].bookingId);
  if (bookingIdx !== -1) {
    db.bookings[bookingIdx] = { ...db.bookings[bookingIdx], status: 'refunded' };
  }

  saveDb(db);

  const approved = db.refundRequests[idx];
  sendMessage(
    approved.memberId,
    'member',
    'refund_result',
    '退款申请已通过',
    `您的退款申请已通过，退款金额 ¥${approved.refundAmount.toFixed(2)} 将在3个工作日内原路返回。`,
    approved.id,
    'refund'
  );

  return ok(approved);
}

export function rejectRefund(ctx: ApiContext, refundId: string, body: RejectRefundBody): ApiResponse<RefundRequest> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId || currentUserRole !== 'manager') {
    return fail('只有运营经理可以审批退款');
  }

  const idx = db.refundRequests.findIndex((r) => r.id === refundId);
  if (idx === -1) {
    return fail('退款申请不存在');
  }

  if (db.refundRequests[idx].status !== 'pending') {
    return fail('该申请已被处理');
  }

  db.refundRequests[idx] = {
    ...db.refundRequests[idx],
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewerId: currentUserId,
    reason: `${db.refundRequests[idx].reason}（驳回原因：${body.reason}）`,
  };

  saveDb(db);

  const rejected = db.refundRequests[idx];
  sendMessage(
    rejected.memberId,
    'member',
    'refund_result',
    '退款申请被驳回',
    `您的退款申请未通过，驳回原因：${body.reason}。如有疑问请联系客服。`,
    rejected.id,
    'refund'
  );

  return ok(rejected);
}
