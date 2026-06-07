import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { CourseRow, CourseStatus, UserRow, CategoryRow, StoreRow, BookingRow } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  return s1 < e2 && s2 < e1;
}

function checkCoachConflict(coachId: string, date: string, startTime: string, endTime: string, excludeCourseId?: string): boolean {
  const courses = db.prepare(
    "SELECT * FROM courses WHERE coach_id = ? AND date = ? AND status != 'cancelled'"
  ).all(coachId, date) as CourseRow[];

  return courses.some(
    (c) => c.id !== excludeCourseId && checkTimeOverlap(startTime, endTime, c.start_time, c.end_time)
  );
}

function enrichCourse(row: CourseRow) {
  const coach = db.prepare('SELECT id, name, phone FROM users WHERE id = ?').get(row.coach_id) as UserRow | undefined;
  const category = db.prepare('SELECT id, name, icon, color FROM categories WHERE id = ?').get(row.category_id) as CategoryRow | undefined;
  const store = db.prepare('SELECT id, name, address, city FROM stores WHERE id = ?').get(row.store_id) as StoreRow | undefined;

  return {
    id: row.id,
    categoryId: row.category_id,
    coachId: row.coach_id,
    storeId: row.store_id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    capacity: row.capacity,
    bookedCount: row.booked_count,
    price: row.price,
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
    coach: coach ? { id: coach.id, name: coach.name, phone: coach.phone } : undefined,
    category: category ? { id: category.id, name: category.name, icon: category.icon, color: category.color } : undefined,
    store: store ? { id: store.id, name: store.name, address: store.address, city: store.city } : undefined,
  };
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { date, category, coach, store } = req.query as {
      date?: string;
      category?: string;
      coach?: string;
      store?: string;
    };

    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params: any[] = [];

    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }
    if (category) {
      sql += ' AND category_id = ?';
      params.push(category);
    }
    if (coach) {
      sql += ' AND coach_id = ?';
      params.push(coach);
    }
    if (store) {
      sql += ' AND store_id = ?';
      params.push(store);
    }

    const rows = db.prepare(sql).all(...params) as CourseRow[];
    res.json(rows.map(enrichCourse));
  } catch (err) {
    res.status(500).json({ error: '获取课程列表失败', details: (err as Error).message });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow | undefined;

    if (!row) {
      res.status(404).json({ error: '课程不存在' });
      return;
    }

    res.json(enrichCourse(row));
  } catch (err) {
    res.status(500).json({ error: '获取课程详情失败', details: (err as Error).message });
  }
});

router.post(
  '/',
  authenticateToken,
  requireRole('coach'),
  (req: AuthRequest, res: Response): void => {
    try {
      const {
        categoryId,
        storeId,
        title,
        date,
        startTime,
        endTime,
        capacity,
        price,
        description,
      } = req.body as {
        categoryId: string;
        storeId: string;
        title: string;
        date: string;
        startTime: string;
        endTime: string;
        capacity: number;
        price: number;
        description?: string;
      };

      if (!categoryId || !storeId || !title || !date || !startTime || !endTime || !capacity || !price) {
        res.status(400).json({
          error: '缺少必填字段: categoryId, storeId, title, date, startTime, endTime, capacity, price',
        });
        return;
      }

      const coachId = req.user!.id;

      if (checkCoachConflict(coachId, date, startTime, endTime)) {
        res.status(400).json({ error: '该时段与已有课程冲突' });
        return;
      }

      const id = generateId();
      const createdAt = new Date().toISOString();

      db.prepare(
        'INSERT INTO courses (id, category_id, coach_id, store_id, title, date, start_time, end_time, capacity, booked_count, price, status, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)'
      ).run(id, categoryId, coachId, storeId, title, date, startTime, endTime, capacity, price, 'scheduled', description || null, createdAt);

      const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow;
      res.status(201).json(enrichCourse(row));
    } catch (err) {
      res.status(500).json({ error: '创建课程失败', details: (err as Error).message });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('coach', 'manager'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow | undefined;

      if (!existing) {
        res.status(404).json({ error: '课程不存在' });
        return;
      }

      if (req.user!.role === 'coach' && existing.coach_id !== req.user!.id) {
        res.status(403).json({ error: '只能修改自己创建的课程' });
        return;
      }

      const {
        categoryId,
        storeId,
        title,
        date,
        startTime,
        endTime,
        capacity,
        price,
        status,
        description,
      } = req.body as {
        categoryId?: string;
        storeId?: string;
        title?: string;
        date?: string;
        startTime?: string;
        endTime?: string;
        capacity?: number;
        price?: number;
        status?: CourseStatus;
        description?: string;
      };

      const newDate = date ?? existing.date;
      const newStartTime = startTime ?? existing.start_time;
      const newEndTime = endTime ?? existing.end_time;

      if (
        (date !== undefined || startTime !== undefined || endTime !== undefined) &&
        checkCoachConflict(existing.coach_id, newDate, newStartTime, newEndTime, existing.id)
      ) {
        res.status(400).json({ error: '修改后的时段与已有课程冲突' });
        return;
      }

      db.prepare(
        `UPDATE courses SET 
          category_id = COALESCE(?, category_id),
          store_id = COALESCE(?, store_id),
          title = COALESCE(?, title),
          date = COALESCE(?, date),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          capacity = COALESCE(?, capacity),
          price = COALESCE(?, price),
          status = COALESCE(?, status),
          description = COALESCE(?, description)
        WHERE id = ?`
      ).run(
        categoryId ?? null,
        storeId ?? null,
        title ?? null,
        date ?? null,
        startTime ?? null,
        endTime ?? null,
        capacity ?? null,
        price ?? null,
        status ?? null,
        description ?? null,
        id
      );

      const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow;
      res.json(enrichCourse(row));
    } catch (err) {
      res.status(500).json({ error: '更新课程失败', details: (err as Error).message });
    }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('coach', 'manager'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow | undefined;

      if (!existing) {
        res.status(404).json({ error: '课程不存在' });
        return;
      }

      if (req.user!.role === 'coach' && existing.coach_id !== req.user!.id) {
        res.status(403).json({ error: '只能删除自己创建的课程' });
        return;
      }

      const hasBookings = (db.prepare(
        "SELECT COUNT(*) as count FROM bookings WHERE course_id = ? AND status IN ('booked', 'waiting', 'completed')"
      ).get(id) as { count: number }).count > 0;

      if (hasBookings) {
        db.prepare("UPDATE courses SET status = 'cancelled' WHERE id = ?").run(id);
        const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow;
        res.json({ message: '课程已标记为取消（存在预约，无法删除）', course: enrichCourse(row) });
        return;
      }

      db.prepare('DELETE FROM courses WHERE id = ?').run(id);
      res.json(enrichCourse(existing));
    } catch (err) {
      res.status(500).json({ error: '删除课程失败', details: (err as Error).message });
    }
  }
);

router.post(
  '/:id/check-in',
  authenticateToken,
  requireRole('coach'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow | undefined;

      if (!course) {
        res.status(404).json({ error: '课程不存在' });
        return;
      }

      if (course.coach_id !== req.user!.id) {
        res.status(403).json({ error: '只能为自己的课程进行签到' });
        return;
      }

      const { attendance } = req.body as {
        attendance: { bookingId: string; attended: boolean }[];
      };

      if (!attendance || !Array.isArray(attendance)) {
        res.status(400).json({ error: '缺少 attendance 数组' });
        return;
      }

      const results: { bookingId: string; success: boolean; error?: string }[] = [];
      const updateStmt = db.prepare('UPDATE bookings SET attendance = ?, status = ? WHERE id = ? AND course_id = ?');

      const tx = db.transaction(() => {
        for (const item of attendance) {
          const booking = db.prepare(
            'SELECT * FROM bookings WHERE id = ? AND course_id = ?'
          ).get(item.bookingId, id) as BookingRow | undefined;

          if (!booking) {
            results.push({ bookingId: item.bookingId, success: false, error: '预约不存在' });
            continue;
          }

          updateStmt.run(
            item.attended ? 1 : 0,
            item.attended ? 'completed' : booking.status,
            item.bookingId,
            id
          );
          results.push({ bookingId: item.bookingId, success: true });
        }
      });

      tx();
      res.json({ message: '签到完成', results });
    } catch (err) {
      res.status(500).json({ error: '签到失败', details: (err as Error).message });
    }
  }
);

router.post(
  '/:id/report',
  authenticateToken,
  requireRole('coach'),
  (req: AuthRequest, res: Response): void => {
    try {
      const { id } = req.params;
      const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow | undefined;

      if (!course) {
        res.status(404).json({ error: '课程不存在' });
        return;
      }

      if (course.coach_id !== req.user!.id) {
        res.status(403).json({ error: '只能为自己的课程上传报告' });
        return;
      }

      const { bookingId, report } = req.body as { bookingId: string; report: string };

      if (!bookingId || !report) {
        res.status(400).json({ error: '缺少必填字段: bookingId, report' });
        return;
      }

      const booking = db.prepare(
        'SELECT * FROM bookings WHERE id = ? AND course_id = ?'
      ).get(bookingId, id) as BookingRow | undefined;

      if (!booking) {
        res.status(404).json({ error: '该预约不存在或不属于此课程' });
        return;
      }

      db.prepare('UPDATE bookings SET training_report = ? WHERE id = ?').run(report, bookingId);
      const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as BookingRow;

      res.json({
        message: '训练报告已上传',
        booking: {
          id: updated.id,
          memberId: updated.member_id,
          courseId: updated.course_id,
          status: updated.status,
          price: updated.price,
          discountRate: updated.discount_rate,
          actualPrice: updated.actual_price,
          attendance: updated.attendance,
          trainingReport: updated.training_report,
          bookedAt: updated.booked_at,
        },
      });
    } catch (err) {
      res.status(500).json({ error: '上传报告失败', details: (err as Error).message });
    }
  }
);

export default router;
