import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { CategoryRow } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function formatCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    basePrice: row.base_price,
    color: row.color,
  };
}

router.get('/', (_req, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM categories').all() as CategoryRow[];
    res.json(rows.map(formatCategory));
  } catch (err) {
    res.status(500).json({ error: '获取分类列表失败', details: (err as Error).message });
  }
});

router.post(
  '/',
  authenticateToken,
  requireRole('manager'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { name, icon, description, basePrice, color } = req.body as {
        name: string;
        icon: string;
        description: string;
        basePrice: number;
        color: string;
      };

      if (!name || !icon || !description || basePrice === undefined || !color) {
        res.status(400).json({ error: '缺少必填字段: name, icon, description, basePrice, color' });
        return;
      }

      const id = generateId();
      db.prepare(
        'INSERT INTO categories (id, name, icon, description, base_price, color) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, name, icon, description, basePrice, color);

      const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow;
      res.status(201).json(formatCategory(row));
    } catch (err) {
      res.status(500).json({ error: '创建分类失败', details: (err as Error).message });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('manager'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined;

      if (!existing) {
        res.status(404).json({ error: '分类不存在' });
        return;
      }

      const { name, icon, description, basePrice, color } = req.body as {
        name?: string;
        icon?: string;
        description?: string;
        basePrice?: number;
        color?: string;
      };

      db.prepare(
        'UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), description = COALESCE(?, description), base_price = COALESCE(?, base_price), color = COALESCE(?, color) WHERE id = ?'
      ).run(name ?? null, icon ?? null, description ?? null, basePrice ?? null, color ?? null, id);

      const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow;
      res.json(formatCategory(row));
    } catch (err) {
      res.status(500).json({ error: '更新分类失败', details: (err as Error).message });
    }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('manager'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined;

      if (!existing) {
        res.status(404).json({ error: '分类不存在' });
        return;
      }

      const hasCourses = (db.prepare('SELECT COUNT(*) as count FROM courses WHERE category_id = ?').get(id) as { count: number }).count > 0;
      if (hasCourses) {
        res.status(400).json({ error: '该分类下存在课程，无法删除' });
        return;
      }

      db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      res.json(formatCategory(existing));
    } catch (err) {
      res.status(500).json({ error: '删除分类失败', details: (err as Error).message });
    }
  }
);

export default router;
