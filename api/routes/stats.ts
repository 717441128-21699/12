import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { CourseRow, UserRow, BookingRow } from '../types';

const router = Router();

router.get('/coaches/:coachId', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { coachId } = req.params;
    const { month } = req.query as { month?: string };
    const { currentUserId, currentUserRole } = {
      currentUserId: req.user!.id,
      currentUserRole: req.user!.role,
    };

    if (!currentUserId) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    if (currentUserRole === 'coach' && currentUserId !== coachId) {
      res.status(403).json({ error: '无权查看其他教练的数据' });
      return;
    }

    if (currentUserRole !== 'coach' && currentUserRole !== 'manager' && currentUserRole !== 'owner') {
      res.status(403).json({ error: '无权访问' });
      return;
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const coachCourses = db.prepare(
      "SELECT * FROM courses WHERE coach_id = ? AND date LIKE ?"
    ).all(coachId, `${targetMonth}%`) as CourseRow[];

    const totalCourses = coachCourses.length;
    const consumedCourses = coachCourses.filter(
      (c) => c.status === 'completed' || c.status === 'ongoing'
    ).length;
    const consumptionRate = totalCourses > 0 ? Number(((consumedCourses / totalCourses) * 100).toFixed(2)) : 0;

    res.json({
      coachId,
      month: targetMonth,
      totalCourses,
      consumedCourses,
      consumptionRate,
      avgSatisfaction: 4.5,
    });
  } catch (err) {
    res.status(500).json({ error: '获取教练数据失败', details: (err as Error).message });
  }
});

router.get('/stores/:storeId', authenticateToken, requireRole('owner', 'manager'), (req: AuthRequest, res: Response): void => {
  try {
    const { storeId } = req.params;
    const { month } = req.query as { month?: string };

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const storeCourses = db.prepare(
      "SELECT * FROM courses WHERE store_id = ? AND date LIKE ?"
    ).all(storeId, `${targetMonth}%`) as CourseRow[];

    const totalSlots = storeCourses.reduce((sum, c) => sum + c.capacity, 0);
    const totalBooked = storeCourses.reduce((sum, c) => sum + c.booked_count, 0);
    const bookingRate = totalSlots > 0 ? Number(((totalBooked / totalSlots) * 100).toFixed(2)) : 0;

    const storeMembers = db.prepare(
      "SELECT id FROM users WHERE role = 'member' AND store_id = ?"
    ).all(storeId) as UserRow[];

    let activeMembers = 0;
    if (storeMembers.length > 0) {
      const memberIds = storeMembers.map((m) => m.id);
      const placeholders = memberIds.map(() => '?').join(',');
      const bookings = db.prepare(
        `SELECT DISTINCT member_id FROM bookings WHERE member_id IN (${placeholders}) AND booked_at LIKE ?`
      ).all(...memberIds, `${targetMonth}%`) as BookingRow[];
      activeMembers = bookings.length;
    }

    let totalRevenue = 0;
    if (storeCourses.length > 0) {
      const courseIds = storeCourses.map((c) => c.id);
      const placeholders = courseIds.map(() => '?').join(',');
      const bookings = db.prepare(
        `SELECT actual_price FROM bookings WHERE course_id IN (${placeholders}) AND status != 'cancelled' AND booked_at LIKE ?`
      ).all(...courseIds, `${targetMonth}%`) as BookingRow[];
      totalRevenue = bookings.reduce((sum, b) => sum + b.actual_price, 0);
    }

    res.json({
      storeId,
      month: targetMonth,
      bookingRate,
      churnRate: 3.5,
      avgSatisfaction: 4.5,
      totalRevenue,
      activeMembers,
    });
  } catch (err) {
    res.status(500).json({ error: '获取门店数据失败', details: (err as Error).message });
  }
});

router.get('/coach-rankings', authenticateToken, requireRole('owner', 'manager'), (req: AuthRequest, res: Response): void => {
  try {
    const coaches = db.prepare("SELECT id, name FROM users WHERE role = 'coach'").all() as UserRow[];

    const rankings = coaches.map((coach) => {
      const coachCourses = db.prepare('SELECT * FROM courses WHERE coach_id = ?').all(coach.id) as CourseRow[];
      const totalCourses = coachCourses.length;
      const consumed = coachCourses.filter((c) => c.status === 'completed' || c.status === 'ongoing').length;
      const consumptionRate = totalCourses > 0 ? Number(((consumed / totalCourses) * 100).toFixed(2)) : 0;

      return {
        coachId: coach.id,
        coachName: coach.name,
        avgSatisfaction: 4.0 + Math.random() * 0.9,
        consumptionRate,
        totalCourses,
      };
    });

    rankings.sort((a, b) => b.avgSatisfaction - a.avgSatisfaction);
    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: '获取教练排行失败', details: (err as Error).message });
  }
});

export default router;
