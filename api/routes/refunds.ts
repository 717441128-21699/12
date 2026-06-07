import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { RefundRow, BookingRow, UserRow, UserRole, MessageType } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function formatRefund(row: RefundRow) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    memberId: row.member_id,
    totalSessions: row.total_sessions,
    completedSessions: row.completed_sessions,
    refundRatio: row.refund_ratio,
    paidAmount: row.paid_amount,
    refundAmount: row.refund_amount,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerId: row.reviewer_id,
  };
}

function sendMessage(
  userId: string,
  role: UserRole,
  type: MessageType,
  title: string,
  content: string,
  relatedId?: string,
  relatedType?: string
): void {
  const id = generateId();
  db.prepare(
    'INSERT INTO messages (id, user_id, role, type, title, content, related_id, related_type, has_voucher, voucher_data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, ?)'
  ).run(
    id,
    userId,
    role,
    type,
    title,
    content,
    relatedId || null,
    relatedType || null,
    new Date().toISOString()
  );
}

router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { currentUserId, currentUserRole } = {
      currentUserId: req.user!.id,
      currentUserRole: req.user!.role,
    };
    const { status } = req.query as { status?: string };

    let rows: RefundRow[] = [];

    if (currentUserRole === 'member') {
      rows = db.prepare('SELECT * FROM refunds WHERE member_id = ? ORDER BY created_at DESC').all(currentUserId) as RefundRow[];
    } else if (currentUserRole === 'manager' || currentUserRole === 'owner') {
      let sql = 'SELECT * FROM refunds';
      const params: any[] = [];
      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }
      sql += ' ORDER BY created_at DESC';
      rows = db.prepare(sql).all(...params) as RefundRow[];
    } else {
      res.status(403).json({ error: '无权访问' });
      return;
    }

    res.json(rows.map(formatRefund));
  } catch (err) {
    res.status(500).json({ error: '获取退款列表失败', details: (err as Error).message });
  }
});

router.post('/', authenticateToken, requireRole('member'), (req: AuthRequest, res: Response): void => {
  try {
    const memberId = req.user!.id;
    const { bookingId, totalSessions, completedSessions, reason } = req.body as {
      bookingId: string;
      totalSessions: number;
      completedSessions: number;
      reason: string;
    };

    if (!bookingId || totalSessions === undefined || completedSessions === undefined || !reason) {
      res.status(400).json({ error: '缺少必填字段: bookingId, totalSessions, completedSessions, reason' });
      return;
    }

    const booking = db.prepare(
      'SELECT * FROM bookings WHERE id = ? AND member_id = ?'
    ).get(bookingId, memberId) as BookingRow | undefined;
    if (!booking) {
      res.status(404).json({ error: '预约不存在或不属于您' });
      return;
    }

    const existingRefund = (db.prepare(
      'SELECT COUNT(*) as count FROM refunds WHERE booking_id = ?'
    ).get(bookingId) as { count: number }).count > 0;
    if (existingRefund) {
      res.status(400).json({ error: '该预约已存在退款申请' });
      return;
    }

    if (totalSessions <= 0 || completedSessions < 0 || completedSessions > totalSessions) {
      res.status(400).json({ error: '课时数参数不合法' });
      return;
    }

    const completedRatio = completedSessions / totalSessions;
    const refundRatio = Number(Math.max(0, 1 - completedRatio).toFixed(2));
    const refundAmount = Math.round(booking.actual_price * refundRatio);

    const id = generateId();
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO refunds (id, booking_id, member_id, total_sessions, completed_sessions, refund_ratio, paid_amount, refund_amount, status, reason, created_at, reviewed_at, reviewer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)'
    ).run(
      id,
      bookingId,
      memberId,
      totalSessions,
      completedSessions,
      refundRatio,
      booking.actual_price,
      refundAmount,
      'pending',
      reason,
      createdAt
    );

    sendMessage(
      memberId,
      'member',
      'refund_request',
      '退款申请已提交',
      `您已提交退款申请，应退金额 ¥${refundAmount.toFixed(2)}，请等待运营审核。`,
      id,
      'refund'
    );

    const managers = db.prepare("SELECT id FROM users WHERE role = 'manager'").all() as UserRow[];
    for (const mgr of managers) {
      sendMessage(
        mgr.id,
        'manager',
        'refund_request',
        '新退款申请待审批',
        `会员提交了退款申请，金额 ¥${refundAmount.toFixed(2)}，请及时处理。`,
        id,
        'refund'
      );
    }

    const row = db.prepare('SELECT * FROM refunds WHERE id = ?').get(id) as RefundRow;
    res.status(201).json(formatRefund(row));
  } catch (err) {
    res.status(500).json({ error: '创建退款申请失败', details: (err as Error).message });
  }
});

router.post('/:id/approve', authenticateToken, requireRole('manager'), (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const reviewerId = req.user!.id;

    const existing = db.prepare('SELECT * FROM refunds WHERE id = ?').get(id) as RefundRow | undefined;
    if (!existing) {
      res.status(404).json({ error: '退款申请不存在' });
      return;
    }

    if (existing.status !== 'pending') {
      res.status(400).json({ error: '该申请已被处理' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare(
        "UPDATE refunds SET status = 'approved', reviewed_at = ?, reviewer_id = ? WHERE id = ?"
      ).run(new Date().toISOString(), reviewerId, id);

      db.prepare("UPDATE bookings SET status = 'refunded' WHERE id = ?").run(existing.booking_id);
    });

    tx();

    const row = db.prepare('SELECT * FROM refunds WHERE id = ?').get(id) as RefundRow;

    sendMessage(
      existing.member_id,
      'member',
      'refund_result',
      '退款申请已通过',
      `您的退款申请已通过，退款金额 ¥${row.refund_amount.toFixed(2)} 将在3个工作日内原路返回。`,
      id,
      'refund'
    );

    res.json(formatRefund(row));
  } catch (err) {
    res.status(500).json({ error: '审批退款失败', details: (err as Error).message });
  }
});

router.post('/:id/reject', authenticateToken, requireRole('manager'), (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const reviewerId = req.user!.id;
    const { reason } = req.body as { reason: string };

    if (!reason) {
      res.status(400).json({ error: '缺少驳回原因' });
      return;
    }

    const existing = db.prepare('SELECT * FROM refunds WHERE id = ?').get(id) as RefundRow | undefined;
    if (!existing) {
      res.status(404).json({ error: '退款申请不存在' });
      return;
    }

    if (existing.status !== 'pending') {
      res.status(400).json({ error: '该申请已被处理' });
      return;
    }

    const combinedReason = `${existing.reason}（驳回原因：${reason}）`;

    db.prepare(
      "UPDATE refunds SET status = 'rejected', reviewed_at = ?, reviewer_id = ?, reason = ? WHERE id = ?"
    ).run(new Date().toISOString(), reviewerId, combinedReason, id);

    const row = db.prepare('SELECT * FROM refunds WHERE id = ?').get(id) as RefundRow;

    sendMessage(
      existing.member_id,
      'member',
      'refund_result',
      '退款申请被驳回',
      `您的退款申请未通过，驳回原因：${reason}。如有疑问请联系客服。`,
      id,
      'refund'
    );

    res.json(formatRefund(row));
  } catch (err) {
    res.status(500).json({ error: '驳回退款失败', details: (err as Error).message });
  }
});

export default router;
