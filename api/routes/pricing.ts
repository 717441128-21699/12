import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { PricingRuleRow, MemberLevel } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function formatPricingRule(row: PricingRuleRow) {
  return {
    id: row.id,
    level: row.level,
    levelName: row.level_name,
    discountRate: row.discount_rate,
    singlePrice: row.single_price,
    monthlyPrice: row.monthly_price,
    quarterlyPrice: row.quarterly_price,
    yearlyPrice: row.yearly_price,
  };
}

router.get('/', (_req, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM pricing_rules ORDER BY discount_rate DESC').all() as PricingRuleRow[];
    res.json(rows.map(formatPricingRule));
  } catch (err) {
    res.status(500).json({ error: '获取价格规则失败', details: (err as Error).message });
  }
});

router.get('/:level', (req, res: Response): void => {
  try {
    const { level } = req.params;
    const row = db.prepare('SELECT * FROM pricing_rules WHERE level = ?').get(level) as PricingRuleRow | undefined;

    if (!row) {
      res.status(404).json({ error: '价格规则不存在' });
      return;
    }

    res.json(formatPricingRule(row));
  } catch (err) {
    res.status(500).json({ error: '获取价格规则失败', details: (err as Error).message });
  }
});

router.put(
  '/:level',
  authenticateToken,
  requireRole('manager', 'owner'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { level } = req.params;
      const existing = db.prepare('SELECT * FROM pricing_rules WHERE level = ?').get(level) as PricingRuleRow | undefined;

      if (!existing) {
        res.status(404).json({ error: '价格规则不存在' });
        return;
      }

      const { levelName, discountRate, singlePrice, monthlyPrice, quarterlyPrice, yearlyPrice } = req.body as {
        levelName?: string;
        discountRate?: number;
        singlePrice?: number;
        monthlyPrice?: number;
        quarterlyPrice?: number;
        yearlyPrice?: number;
      };

      db.prepare(
        `UPDATE pricing_rules SET 
          level_name = COALESCE(?, level_name),
          discount_rate = COALESCE(?, discount_rate),
          single_price = COALESCE(?, single_price),
          monthly_price = COALESCE(?, monthly_price),
          quarterly_price = COALESCE(?, quarterly_price),
          yearly_price = COALESCE(?, yearly_price)
        WHERE level = ?`
      ).run(
        levelName ?? null,
        discountRate ?? null,
        singlePrice ?? null,
        monthlyPrice ?? null,
        quarterlyPrice ?? null,
        yearlyPrice ?? null,
        level
      );

      const row = db.prepare('SELECT * FROM pricing_rules WHERE level = ?').get(level) as PricingRuleRow;
      res.json(formatPricingRule(row));
    } catch (err) {
      res.status(500).json({ error: '更新价格规则失败', details: (err as Error).message });
    }
  }
);

export default router;
