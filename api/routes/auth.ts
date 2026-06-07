import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { UserRole, MemberLevel, UserRow } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeUser(row: UserRow) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    phone: row.phone,
    storeId: row.store_id,
    memberLevel: row.member_level,
    createdAt: row.created_at,
  };
}

function generateToken(user: ReturnType<typeof sanitizeUser>): string {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, password, storeId, memberLevel } = req.body as {
      name: string;
      phone: string;
      password: string;
      storeId?: string;
      memberLevel?: MemberLevel;
    };

    if (!name || !phone || !password) {
      res.status(400).json({ error: '缺少必填字段: name, phone, password' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE role = ? AND phone = ?').get('member', phone);
    if (existing) {
      res.status(409).json({ error: '该手机号已注册' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateId();
    const createdAt = new Date().toISOString();
    const level = memberLevel || 'normal';

    db.prepare(
      'INSERT INTO users (id, role, name, phone, password_hash, store_id, member_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, 'member', name, phone, hashedPassword, storeId || null, level, createdAt);

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
    const user = sanitizeUser(userRow);
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: '注册失败', details: (err as Error).message });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, phone, password } = req.body as {
      role: UserRole;
      phone: string;
      password: string;
    };

    if (!role || !phone || !password) {
      res.status(400).json({ error: '缺少必填字段: role, phone, password' });
      return;
    }

    const userRow = db.prepare('SELECT * FROM users WHERE role = ? AND phone = ?').get(role, phone) as UserRow | undefined;
    if (!userRow) {
      res.status(401).json({ error: '用户不存在' });
      return;
    }

    const valid = await bcrypt.compare(password, userRow.password_hash);
    if (!valid) {
      res.status(401).json({ error: '密码错误' });
      return;
    }

    const user = sanitizeUser(userRow);
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: '登录失败', details: (err as Error).message });
  }
});

router.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as UserRow | undefined;
    if (!userRow) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json(sanitizeUser(userRow));
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败', details: (err as Error).message });
  }
});

export default router;
