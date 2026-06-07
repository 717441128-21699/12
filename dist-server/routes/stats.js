"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.get('/coaches/:coachId', auth_1.authenticateToken, (req, res) => {
    try {
        const { coachId } = req.params;
        const { month } = req.query;
        const { currentUserId, currentUserRole } = {
            currentUserId: req.user.id,
            currentUserRole: req.user.role,
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
        const coachCourses = db_1.default.prepare("SELECT * FROM courses WHERE coach_id = ? AND date LIKE ?").all(coachId, `${targetMonth}%`);
        const totalCourses = coachCourses.length;
        const consumedCourses = coachCourses.filter((c) => c.status === 'completed' || c.status === 'ongoing').length;
        const consumptionRate = totalCourses > 0 ? Number(((consumedCourses / totalCourses) * 100).toFixed(2)) : 0;
        res.json({
            coachId,
            month: targetMonth,
            totalCourses,
            consumedCourses,
            consumptionRate,
            avgSatisfaction: 4.5,
        });
    }
    catch (err) {
        res.status(500).json({ error: '获取教练数据失败', details: err.message });
    }
});
router.get('/stores/:storeId', auth_1.authenticateToken, (0, auth_1.requireRole)('owner', 'manager'), (req, res) => {
    try {
        const { storeId } = req.params;
        const { month } = req.query;
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const storeCourses = db_1.default.prepare("SELECT * FROM courses WHERE store_id = ? AND date LIKE ?").all(storeId, `${targetMonth}%`);
        const totalSlots = storeCourses.reduce((sum, c) => sum + c.capacity, 0);
        const totalBooked = storeCourses.reduce((sum, c) => sum + c.booked_count, 0);
        const bookingRate = totalSlots > 0 ? Number(((totalBooked / totalSlots) * 100).toFixed(2)) : 0;
        const storeMembers = db_1.default.prepare("SELECT id FROM users WHERE role = 'member' AND store_id = ?").all(storeId);
        let activeMembers = 0;
        if (storeMembers.length > 0) {
            const memberIds = storeMembers.map((m) => m.id);
            const placeholders = memberIds.map(() => '?').join(',');
            const bookings = db_1.default.prepare(`SELECT DISTINCT member_id FROM bookings WHERE member_id IN (${placeholders}) AND booked_at LIKE ?`).all(...memberIds, `${targetMonth}%`);
            activeMembers = bookings.length;
        }
        let totalRevenue = 0;
        if (storeCourses.length > 0) {
            const courseIds = storeCourses.map((c) => c.id);
            const placeholders = courseIds.map(() => '?').join(',');
            const bookings = db_1.default.prepare(`SELECT actual_price FROM bookings WHERE course_id IN (${placeholders}) AND status != 'cancelled' AND booked_at LIKE ?`).all(...courseIds, `${targetMonth}%`);
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
    }
    catch (err) {
        res.status(500).json({ error: '获取门店数据失败', details: err.message });
    }
});
router.get('/coach-rankings', auth_1.authenticateToken, (0, auth_1.requireRole)('owner', 'manager'), (req, res) => {
    try {
        const coaches = db_1.default.prepare("SELECT id, name FROM users WHERE role = 'coach'").all();
        const rankings = coaches.map((coach) => {
            const coachCourses = db_1.default.prepare('SELECT * FROM courses WHERE coach_id = ?').all(coach.id);
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
    }
    catch (err) {
        res.status(500).json({ error: '获取教练排行失败', details: err.message });
    }
});
exports.default = router;
