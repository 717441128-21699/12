"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (req, res) => {
    try {
        const { currentUserId, currentUserRole } = {
            currentUserId: req.user.id,
            currentUserRole: req.user.role,
        };
        if (currentUserRole === 'member') {
            const rows = db_1.default.prepare('SELECT * FROM waiting_queue WHERE member_id = ? ORDER BY position ASC').all(currentUserId);
            const result = rows.map((row) => {
                const course = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(row.course_id);
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
            const coachCourses = db_1.default.prepare('SELECT id FROM courses WHERE coach_id = ?').all(currentUserId);
            if (coachCourses.length === 0) {
                res.json([]);
                return;
            }
            const placeholders = coachCourses.map(() => '?').join(',');
            const courseIds = coachCourses.map((c) => c.id);
            const rows = db_1.default.prepare(`SELECT * FROM waiting_queue WHERE course_id IN (${placeholders}) ORDER BY course_id, position ASC`).all(...courseIds);
            const grouped = {};
            for (const row of rows) {
                if (!grouped[row.course_id]) {
                    const course = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(row.course_id);
                    grouped[row.course_id] = [];
                    grouped[row.course_id].courseId = row.course_id;
                    grouped[row.course_id].course = course
                        ? {
                            id: course.id,
                            title: course.title,
                            date: course.date,
                            startTime: course.start_time,
                            endTime: course.end_time,
                        }
                        : undefined;
                    grouped[row.course_id].members = [];
                }
                grouped[row.course_id].members.push({
                    memberId: row.member_id,
                    position: row.position,
                    joinedAt: row.joined_at,
                });
            }
            res.json(Object.values(grouped));
            return;
        }
        if (currentUserRole === 'manager' || currentUserRole === 'owner') {
            const rows = db_1.default.prepare('SELECT * FROM waiting_queue ORDER BY course_id, position ASC').all();
            const grouped = {};
            for (const row of rows) {
                if (!grouped[row.course_id]) {
                    const course = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(row.course_id);
                    grouped[row.course_id] = [];
                    grouped[row.course_id].courseId = row.course_id;
                    grouped[row.course_id].course = course
                        ? {
                            id: course.id,
                            title: course.title,
                            date: course.date,
                            startTime: course.start_time,
                            endTime: course.end_time,
                        }
                        : undefined;
                    grouped[row.course_id].members = [];
                }
                grouped[row.course_id].members.push({
                    memberId: row.member_id,
                    position: row.position,
                    joinedAt: row.joined_at,
                });
            }
            res.json(Object.values(grouped));
            return;
        }
        res.status(403).json({ error: '无权访问' });
    }
    catch (err) {
        res.status(500).json({ error: '获取候补队列失败', details: err.message });
    }
});
router.delete('/:courseId', auth_1.authenticateToken, (0, auth_1.requireRole)('member'), (req, res) => {
    try {
        const { courseId } = req.params;
        const memberId = req.user.id;
        const entry = db_1.default.prepare('SELECT * FROM waiting_queue WHERE course_id = ? AND member_id = ?').get(courseId, memberId);
        if (!entry) {
            res.status(404).json({ error: '您不在该课程的候补队列中' });
            return;
        }
        const removedPosition = entry.position;
        db_1.default.prepare('DELETE FROM waiting_queue WHERE course_id = ? AND member_id = ?').run(courseId, memberId);
        db_1.default.prepare('UPDATE waiting_queue SET position = position - 1 WHERE course_id = ? AND position > ?').run(courseId, removedPosition);
        res.json({ removed: true, position: removedPosition });
    }
    catch (err) {
        res.status(500).json({ error: '退出候补失败', details: err.message });
    }
});
exports.default = router;
