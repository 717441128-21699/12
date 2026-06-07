import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { MessageRow, MessageType, UserRole } from '../types';

const router = Router();

function formatMessage(row: MessageRow) {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    type: row.type,
    title: row.title,
    content: row.content,
    relatedId: row.related_id,
    relatedType: row.related_type,
    hasVoucher: row.has_voucher === 1,
    voucher: row.voucher_data ? JSON.parse(row.voucher_data) : undefined,
    read: row.read === 1,
    createdAt: row.created_at,
  };
}

router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { currentUserId, currentUserRole } = {
      currentUserId: req.user!.id,
      currentUserRole: req.user!.role as UserRole,
    };
    const { type } = req.query as { type?: MessageType };

    let sql = 'SELECT * FROM messages WHERE user_id = ? AND role = ?';
    const params: any[] = [currentUserId, currentUserRole];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params) as MessageRow[];
    res.json(rows.map(formatMessage));
  } catch (err) {
    res.status(500).json({ error: '获取消息列表失败', details: (err as Error).message });
  }
});

router.get('/unread-count', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { currentUserId, currentUserRole } = {
      currentUserId: req.user!.id,
      currentUserRole: req.user!.role,
    };

    const result = db.prepare(
      'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = ? AND read = 0'
    ).get(currentUserId, currentUserRole) as { count: number };

    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: '获取未读消息数失败', details: (err as Error).message });
  }
});

router.post('/:id/read', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const existing = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow | undefined;
    if (!existing) {
      res.status(404).json({ error: '消息不存在' });
      return;
    }

    if (existing.user_id !== currentUserId) {
      res.status(403).json({ error: '无权操作他人的消息' });
      return;
    }

    db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(id);
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow;
    res.json(formatMessage(row));
  } catch (err) {
    res.status(500).json({ error: '标记已读失败', details: (err as Error).message });
  }
});

router.post('/read-all', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { currentUserId, currentUserRole } = {
      currentUserId: req.user!.id,
      currentUserRole: req.user!.role,
    };

    const result = db.prepare(
      'UPDATE messages SET read = 1 WHERE user_id = ? AND role = ? AND read = 0'
    ).run(currentUserId, currentUserRole);

    res.json({ updated: result.changes || 0 });
  } catch (err) {
    res.status(500).json({ error: '批量标记已读失败', details: (err as Error).message });
  }
});

export default router;
