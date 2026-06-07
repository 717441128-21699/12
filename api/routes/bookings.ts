import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { BookingRow, CourseRow, UserRow, MessageType, UserRole } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function getDiscountRate(level: string): number {
  const rates: Record<string, number> = {
    normal: 1,
    silver: 0.9,
    gold: 0.8,
    diamond: 0.65,
  };
  return rates[level] || 1;
}

function formatBooking(row: BookingRow) {
  return {
    id: row.id,
    memberId: row.member_id,
    courseId: row.course_id,
    status: row.status,
    price: row.price,
    discountRate: row.discount_rate,
    actualPrice: row.actual_price,
    attendance: row.attendance,
    trainingReport: row.training_report,
    bookedAt: row.booked_at,
  };
}

function sendMessage(
  userId: string,
  role: UserRole,
  type: MessageType,
  title: string,
  content: string,
  relatedId?: string,
  relatedType?: string,
  voucherData?: string
): void {
  const id = generateId();
  db.prepare(
    'INSERT INTO messages (id, user_id, role, type, title, content, related_id, related_type, has_voucher, voucher_data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
  ).run(
    id,
    userId,
    role,
    type,
    title,
    content,
    relatedId || null,
    relatedType || null,
    voucherData ? 1 : 0,
    voucherData || null,
    new Date().toISOString()
  );
}

function makeVoucherData(type: string, id: string, amount?: number): string {
  const prefix = type === 'booking' ? 'BK' : type === 'refund' ? 'RF' : 'AT';
  return JSON.stringify({
    type,
    bookingId: type === 'booking' || type === 'attendance' ? id : undefined,
    refundId: type === 'refund' ? id : undefined,
    amount,
    issuedAt: new Date().toISOString(),
    code: `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`,
  });
}

router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    let rows: BookingRow[] = [];

    if (currentUserRole === 'member') {
      rows = db.prepare('SELECT * FROM bookings WHERE member_id = ?').all(currentUserId) as BookingRow[];
    } else if (currentUserRole === 'coach') {
      const coachCourses = db.prepare('SELECT id FROM courses WHERE coach_id = ?').all(currentUserId) as { id: string }[];
      if (coachCourses.length > 0) {
        const placeholders = coachCourses.map(() => '?').join(',');
        const courseIds = coachCourses.map((c) => c.id);
        rows = db.prepare(`SELECT * FROM bookings WHERE course_id IN (${placeholders})`).all(...courseIds) as BookingRow[];
      }
    } else if (currentUserRole === 'manager' || currentUserRole === 'owner') {
      rows = db.prepare('SELECT * FROM bookings').all() as BookingRow[];
    } else {
      res.status(403).json({ error: '无权访问' });
      return;
    }

    res.json(rows.map(formatBooking));
  } catch (err) {
    res.status(500).json({ error: '获取预约列表失败', details: (err as Error).message });
  }
});

router.post('/', authenticateToken, requireRole('member'), (req: AuthRequest, res: Response): void => {
  try {
    const { courseId } = req.body as { courseId: string };
    const memberId = req.user!.id;

    if (!courseId) {
      res.status(400).json({ error: '缺少必填字段: courseId' });
      return;
    }

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as CourseRow | undefined;
    if (!course) {
      res.status(404).json({ error: '课程不存在' });
      return;
    }

    const alreadyBooked = (db.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE course_id = ? AND member_id = ? AND status = 'booked'"
    ).get(courseId, memberId) as { count: number }).count > 0;
    if (alreadyBooked) {
      res.status(400).json({ error: '您已预约该课程' });
      return;
    }

    const alreadyWaiting = (db.prepare(
      'SELECT COUNT(*) as count FROM waiting_queue WHERE course_id = ? AND member_id = ?'
    ).get(courseId, memberId) as { count: number }).count > 0;
    if (alreadyWaiting) {
      res.status(400).json({ error: '您已在该课程的候补队列中' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(memberId) as UserRow | undefined;
    const level = user?.member_level || 'normal';
    const discountRate = getDiscountRate(level);
    const actualPrice = Math.round(course.price * discountRate);

    const tx = db.transaction(() => {
      if (course.booked_count >= course.capacity) {
        const maxPosition = (db.prepare(
          'SELECT COALESCE(MAX(position), 0) as max_pos FROM waiting_queue WHERE course_id = ?'
        ).get(courseId) as { max_pos: number }).max_pos;
        const position = maxPosition + 1;
        const wId = generateId();
        db.prepare(
          'INSERT INTO waiting_queue (id, course_id, member_id, position, joined_at) VALUES (?, ?, ?, ?, ?)'
        ).run(wId, courseId, memberId, position, new Date().toISOString());

        sendMessage(
          memberId,
          'member',
          'booking_success',
          '候补排队中',
          `「${course.title}」课程已满员，您已进入候补队列，当前排位第${position}位，有空位将自动补位。`,
          undefined,
          'course'
        );

        return { waiting: true, position };
      }

      const id = generateId();
      db.prepare(
        'INSERT INTO bookings (id, member_id, course_id, status, price, discount_rate, actual_price, attendance, training_report, booked_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)'
      ).run(id, memberId, courseId, 'booked', course.price, discountRate, actualPrice, new Date().toISOString());

      db.prepare('UPDATE courses SET booked_count = booked_count + 1 WHERE id = ?').run(courseId);

      const savedCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as CourseRow;
      sendMessage(
        memberId,
        'member',
        'booking_success',
        '预约成功',
        `您已成功预约「${savedCourse.title}」课程，上课时间 ${savedCourse.date} ${savedCourse.start_time}-${savedCourse.end_time}，请准时到店。`,
        id,
        'booking',
        makeVoucherData('booking', id, actualPrice)
      );

      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow;
      return formatBooking(booking);
    });

    const result = tx();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: '创建预约失败', details: (err as Error).message });
  }
});

router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow | undefined;
    if (!booking) {
      res.status(404).json({ error: '预约不存在' });
      return;
    }

    if (currentUserRole === 'member' && booking.member_id !== currentUserId) {
      res.status(403).json({ error: '无权取消他人的预约' });
      return;
    }

    if (booking.status !== 'booked') {
      res.status(400).json({ error: '只有已预约状态可以取消' });
      return;
    }

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(booking.course_id) as CourseRow | undefined;
    if (!course) {
      res.status(404).json({ error: '关联课程不存在' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
      db.prepare('UPDATE courses SET booked_count = MAX(0, booked_count - 1) WHERE id = ?').run(booking.course_id);

      sendMessage(
        booking.member_id,
        'member',
        'refund_result',
        '取消预约成功',
        `您已成功取消「${course.title}」课程预约。`,
        course.id,
        'course'
      );

      let promotedMemberId: string | undefined;

      const firstWaiting = db.prepare(
        'SELECT * FROM waiting_queue WHERE course_id = ? ORDER BY position ASC LIMIT 1'
      ).get(booking.course_id) as { id: string; member_id: string; course_id: string; position: number } | undefined;

      if (firstWaiting) {
        promotedMemberId = firstWaiting.member_id;

        db.prepare('DELETE FROM waiting_queue WHERE id = ?').run(firstWaiting.id);
        db.prepare('UPDATE waiting_queue SET position = position - 1 WHERE course_id = ? AND position > ?').run(booking.course_id, firstWaiting.position);

        const promotedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(promotedMemberId) as UserRow | undefined;
        const promotedLevel = promotedUser?.member_level || 'normal';
        const promotedDiscount = getDiscountRate(promotedLevel);
        const promotedActualPrice = Math.round(course.price * promotedDiscount);

        const promotedBookingId = generateId();
        db.prepare(
          'INSERT INTO bookings (id, member_id, course_id, status, price, discount_rate, actual_price, attendance, training_report, booked_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)'
        ).run(promotedBookingId, promotedMemberId, booking.course_id, 'booked', course.price, promotedDiscount, promotedActualPrice, new Date().toISOString());

        db.prepare('UPDATE courses SET booked_count = booked_count + 1 WHERE id = ?').run(booking.course_id);

        const promotedCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(booking.course_id) as CourseRow;
        sendMessage(
          promotedMemberId,
          'member',
          'waiting_promoted',
          '候补补位成功',
          `恭喜您从候补队列中补位成功，已为您预约「${promotedCourse.title}」课程，时间：${promotedCourse.date} ${promotedCourse.start_time}-${promotedCourse.end_time}。`,
          promotedBookingId,
          'booking',
          makeVoucherData('booking', promotedBookingId, promotedActualPrice)
        );
      }

      return { promotedMemberId };
    });

    const result = tx();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '取消预约失败', details: (err as Error).message });
  }
});

export default router;
