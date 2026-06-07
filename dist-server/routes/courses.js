"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function checkTimeOverlap(start1, end1, start2, end2) {
    const toMinutes = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
}
function checkCoachConflict(coachId, date, startTime, endTime, excludeCourseId) {
    const courses = db_1.default.prepare("SELECT * FROM courses WHERE coach_id = ? AND date = ? AND status != 'cancelled'").all(coachId, date);
    return courses.some((c) => c.id !== excludeCourseId && checkTimeOverlap(startTime, endTime, c.start_time, c.end_time));
}
function enrichCourse(row) {
    const coach = db_1.default.prepare('SELECT id, name, phone FROM users WHERE id = ?').get(row.coach_id);
    const category = db_1.default.prepare('SELECT id, name, icon, color FROM categories WHERE id = ?').get(row.category_id);
    const store = db_1.default.prepare('SELECT id, name, address, city FROM stores WHERE id = ?').get(row.store_id);
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
router.get('/', (req, res) => {
    try {
        const { date, category, coach, store } = req.query;
        let sql = 'SELECT * FROM courses WHERE 1=1';
        const params = [];
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
        const rows = db_1.default.prepare(sql).all(...params);
        res.json(rows.map(enrichCourse));
    }
    catch (err) {
        res.status(500).json({ error: '获取课程列表失败', details: err.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const row = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
        if (!row) {
            res.status(404).json({ error: '课程不存在' });
            return;
        }
        res.json(enrichCourse(row));
    }
    catch (err) {
        res.status(500).json({ error: '获取课程详情失败', details: err.message });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)('coach'), (req, res) => {
    try {
        const { categoryId, storeId, title, date, startTime, endTime, capacity, price, description, } = req.body;
        if (!categoryId || !storeId || !title || !date || !startTime || !endTime || !capacity || !price) {
            res.status(400).json({
                error: '缺少必填字段: categoryId, storeId, title, date, startTime, endTime, capacity, price',
            });
            return;
        }
        const coachId = req.user.id;
        if (checkCoachConflict(coachId, date, startTime, endTime)) {
            res.status(400).json({ error: '该时段与已有课程冲突' });
            return;
        }
        const id = generateId();
        const createdAt = new Date().toISOString();
        db_1.default.prepare('INSERT INTO courses (id, category_id, coach_id, store_id, title, date, start_time, end_time, capacity, booked_count, price, status, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)').run(id, categoryId, coachId, storeId, title, date, startTime, endTime, capacity, price, 'scheduled', description || null, createdAt);
        const row = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
        res.status(201).json(enrichCourse(row));
    }
    catch (err) {
        res.status(500).json({ error: '创建课程失败', details: err.message });
    }
});
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('coach', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const existing = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
        if (!existing) {
            res.status(404).json({ error: '课程不存在' });
            return;
        }
        if (req.user.role === 'coach' && existing.coach_id !== req.user.id) {
            res.status(403).json({ error: '只能修改自己创建的课程' });
            return;
        }
        const { categoryId, storeId, title, date, startTime, endTime, capacity, price, status, description, } = req.body;
        const newDate = date ?? existing.date;
        const newStartTime = startTime ?? existing.start_time;
        const newEndTime = endTime ?? existing.end_time;
        if ((date !== undefined || startTime !== undefined || endTime !== undefined) &&
            checkCoachConflict(existing.coach_id, newDate, newStartTime, newEndTime, existing.id)) {
            res.status(400).json({ error: '修改后的时段与已有课程冲突' });
            return;
        }
        db_1.default.prepare(`UPDATE courses SET 
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
        WHERE id = ?`).run(categoryId ?? null, storeId ?? null, title ?? null, date ?? null, startTime ?? null, endTime ?? null, capacity ?? null, price ?? null, status ?? null, description ?? null, id);
        const row = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
        res.json(enrichCourse(row));
    }
    catch (err) {
        res.status(500).json({ error: '更新课程失败', details: err.message });
    }
});
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('coach', 'manager'), (req, res) => {
    try {
        const { id } = req.params;
        const existing = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
        if (!existing) {
            res.status(404).json({ error: '课程不存在' });
            return;
        }
        if (req.user.role === 'coach' && existing.coach_id !== req.user.id) {
            res.status(403).json({ error: '只能删除自己创建的课程' });
            return;
        }
        const hasBookings = db_1.default.prepare("SELECT COUNT(*) as count FROM bookings WHERE course_id = ? AND status IN ('booked', 'waiting', 'completed')").get(id).count > 0;
        if (hasBookings) {
            db_1.default.prepare("UPDATE courses SET status = 'cancelled' WHERE id = ?").run(id);
            const row = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
            res.json({ message: '课程已标记为取消（存在预约，无法删除）', course: enrichCourse(row) });
            return;
        }
        db_1.default.prepare('DELETE FROM courses WHERE id = ?').run(id);
        res.json(enrichCourse(existing));
    }
    catch (err) {
        res.status(500).json({ error: '删除课程失败', details: err.message });
    }
});
router.post('/:id/check-in', auth_1.authenticateToken, (0, auth_1.requireRole)('coach'), (req, res) => {
    try {
        const { id } = req.params;
        const course = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
        if (!course) {
            res.status(404).json({ error: '课程不存在' });
            return;
        }
        if (course.coach_id !== req.user.id) {
            res.status(403).json({ error: '只能为自己的课程进行签到' });
            return;
        }
        const { attendance } = req.body;
        if (!attendance || !Array.isArray(attendance)) {
            res.status(400).json({ error: '缺少 attendance 数组' });
            return;
        }
        const results = [];
        const updateStmt = db_1.default.prepare('UPDATE bookings SET attendance = ?, status = ? WHERE id = ? AND course_id = ?');
        const tx = db_1.default.transaction(() => {
            for (const item of attendance) {
                const booking = db_1.default.prepare('SELECT * FROM bookings WHERE id = ? AND course_id = ?').get(item.bookingId, id);
                if (!booking) {
                    results.push({ bookingId: item.bookingId, success: false, error: '预约不存在' });
                    continue;
                }
                updateStmt.run(item.attended ? 1 : 0, item.attended ? 'completed' : booking.status, item.bookingId, id);
                results.push({ bookingId: item.bookingId, success: true });
            }
        });
        tx();
        res.json({ message: '签到完成', results });
    }
    catch (err) {
        res.status(500).json({ error: '签到失败', details: err.message });
    }
});
router.post('/:id/report', auth_1.authenticateToken, (0, auth_1.requireRole)('coach'), (req, res) => {
    try {
        const { id } = req.params;
        const course = db_1.default.prepare('SELECT * FROM courses WHERE id = ?').get(id);
        if (!course) {
            res.status(404).json({ error: '课程不存在' });
            return;
        }
        if (course.coach_id !== req.user.id) {
            res.status(403).json({ error: '只能为自己的课程上传报告' });
            return;
        }
        const { bookingId, report } = req.body;
        if (!bookingId || !report) {
            res.status(400).json({ error: '缺少必填字段: bookingId, report' });
            return;
        }
        const booking = db_1.default.prepare('SELECT * FROM bookings WHERE id = ? AND course_id = ?').get(bookingId, id);
        if (!booking) {
            res.status(404).json({ error: '该预约不存在或不属于此课程' });
            return;
        }
        db_1.default.prepare('UPDATE bookings SET training_report = ? WHERE id = ?').run(report, bookingId);
        const updated = db_1.default.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
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
    }
    catch (err) {
        res.status(500).json({ error: '上传报告失败', details: err.message });
    }
});
exports.default = router;
