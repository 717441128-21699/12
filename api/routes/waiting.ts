import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';
import type { WaitingQueueRow, CourseRow } from '../types';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { currentUserId, currentUserRole } = {
      currentUserId: req.user!.id,
      currentUserRole: req.user!.role,
    };

    if (currentUserRole === 'member') {
      const rows = db.prepare(
        'SELECT * FROM waiting_queue WHERE member_id = ? ORDER BY position ASC'
      ).all(currentUserId) as WaitingQueueRow[];

      const result = rows.map((row) => {
        const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(row.course_id) as CourseRow | undefined;
        return {
          courseId: row.course_id,
          course: course
            ? {
                id: course.id,
                title: course.title,
                date: course.date,
                startTime: course.start_time,
                endTime: course.end_time,
              }
            : undefined,
          myPosition: row.position,
          joinedAt: row.joined_at,
        };
      });

      res.json(result);
      return;
    }

    if (currentUserRole === 'coach') {
      const coachCourses = db.prepare('SELECT id FROM courses WHERE coach_id = ?').all(currentUserId) as { id: string }[];
      if (coachCourses.length === 0) {
        res.json([]);
        return;
      }
      const placeholders = coachCourses.map(() => '?').join(',');
      const courseIds = coachCourses.map((c) => c.id);
      const rows = db.prepare(
        `SELECT * FROM waiting_queue WHERE course_id IN (${placeholders}) ORDER BY course_id, position ASC`
      ).all(...courseIds) as WaitingQueueRow[];

      const grouped: Record<string, any[]> = {};
      for (const row of rows) {
        if (!grouped[row.course_id]) {
          const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(row.course_id) as CourseRow | undefined;
          grouped[row.course_id] = [];
          (grouped[row.course_id] as any).courseId = row.course_id;
          (grouped[row.course_id] as any).course = course
            ? {
                id: course.id,
                title: course.title,
                date: course.date,
                startTime: course.start_time,
                endTime: course.end_time,
              }
            : undefined;
          (grouped[row.course_id] as any).members = [];
        }
        (grouped[row.course_id] as any).members.push({
          memberId: row.member_id,
          position: row.position,
          joinedAt: row.joined_at,
        });
      }

      res.json(Object.values(grouped));
      return;
    }

    if (currentUserRole === 'manager' || currentUserRole === 'owner') {
      const rows = db.prepare(
        'SELECT * FROM waiting_queue ORDER BY course_id, position ASC'
      ).all() as WaitingQueueRow[];

      const grouped: Record<string, any[]> = {};
      for (const row of rows) {
        if (!grouped[row.course_id]) {
          const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(row.course_id) as CourseRow | undefined;
          grouped[row.course_id] = [];
          (grouped[row.course_id] as any).courseId = row.course_id;
          (grouped[row.course_id] as any).course = course
            ? {
                id: course.id,
                title: course.title,
                date: course.date,
                startTime: course.start_time,
                endTime: course.end_time,
              }
            : undefined;
          (grouped[row.course_id] as any).members = [];
        }
        (grouped[row.course_id] as any).members.push({
          memberId: row.member_id,
          position: row.position,
          joinedAt: row.joined_at,
        });
      }

      res.json(Object.values(grouped));
      return;
    }

    res.status(403).json({ error: '无权访问' });
  } catch (err) {
    res.status(500).json({ error: '获取候补队列失败', details: (err as Error).message });
  }
});

router.delete('/:courseId', authenticateToken, requireRole('member'), (req: AuthRequest, res: Response): void => {
  try {
    const { courseId } = req.params;
    const memberId = req.user!.id;

    const entry = db.prepare(
      'SELECT * FROM waiting_queue WHERE course_id = ? AND member_id = ?'
    ).get(courseId, memberId) as WaitingQueueRow | undefined;

    if (!entry) {
      res.status(404).json({ error: '您不在该课程的候补队列中' });
      return;
    }

    const removedPosition = entry.position;

    db.prepare('DELETE FROM waiting_queue WHERE course_id = ? AND member_id = ?').run(courseId, memberId);
    db.prepare(
      'UPDATE waiting_queue SET position = position - 1 WHERE course_id = ? AND position > ?'
    ).run(courseId, removedPosition);

    res.json({ removed: true, position: removedPosition });
  } catch (err) {
    res.status(500).json({ error: '退出候补失败', details: (err as Error).message });
  }
});

export default router;
