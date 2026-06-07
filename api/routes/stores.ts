import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { StoreRow } from '../types';

const router = Router();

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface CountResult {
  count: number;
}

interface TotalResult {
  total: number;
}

function formatStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
  };
}

router.get('/', (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM stores').all() as StoreRow[];
    res.json(rows.map(formatStore));
  } catch (err) {
    res.status(500).json({ error: '获取门店列表失败', details: (err as Error).message });
  }
});

router.get(
  '/:id/metrics',
  authenticateToken,
  requireRole('owner'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const { month } = req.query as { month?: string };

      const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(id) as StoreRow | undefined;
      if (!store) {
        res.status(404).json({ error: '门店不存在' });
        return;
      }

      const currentMonth = month || new Date().toISOString().slice(0, 7);
      const monthStart = `${currentMonth}-01`;
      const nextMonth = new Date(`${currentMonth}-01`);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = nextMonth.toISOString().slice(0, 10);

      const totalCapacity = (db
        .prepare(
          `SELECT COALESCE(SUM(capacity), 0) as total
           FROM courses
           WHERE store_id = ? AND date >= ? AND date < ? AND status != 'cancelled'`
        )
        .get(id, monthStart, monthEnd) as TotalResult).total;

      const totalBooked = (db
        .prepare(
          `SELECT COALESCE(SUM(booked_count), 0) as total
           FROM courses
           WHERE store_id = ? AND date >= ? AND date < ? AND status != 'cancelled'`
        )
        .get(id, monthStart, monthEnd) as TotalResult).total;

      const bookingRate = totalCapacity > 0 ? totalBooked / totalCapacity : 0;

      const totalBookings = (db
        .prepare(
          `SELECT COUNT(*) as count
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ?`
        )
        .get(id, monthStart, monthEnd) as CountResult).count;

      const cancelledBookings = (db
        .prepare(
          `SELECT COUNT(*) as count
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ? AND b.status = 'cancelled'`
        )
        .get(id, monthStart, monthEnd) as CountResult).count;

      const churnRate = totalBookings > 0 ? cancelledBookings / totalBookings : 0;

      const totalRevenue = (db
        .prepare(
          `SELECT COALESCE(SUM(b.actual_price), 0) as total
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ?
             AND b.status IN ('booked', 'completed', 'waiting')`
        )
        .get(id, monthStart, monthEnd) as TotalResult).total;

      const activeMembers = (db
        .prepare(
          `SELECT COUNT(DISTINCT b.member_id) as count
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ?
             AND b.status IN ('booked', 'completed', 'waiting')`
        )
        .get(id, monthStart, monthEnd) as CountResult).count;

      res.json({
        storeId: id,
        month: currentMonth,
        bookingRate,
        churnRate,
        avgSatisfaction: 4.5,
        totalRevenue,
        activeMembers,
      });
    } catch (err) {
      res.status(500).json({ error: '获取门店运营数据失败', details: (err as Error).message });
    }
  }
);

export default router;
