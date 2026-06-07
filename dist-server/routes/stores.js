"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
function formatStore(row) {
    return {
        id: row.id,
        name: row.name,
        address: row.address,
        city: row.city,
    };
}
router.get('/', (_req, res) => {
    try {
        const rows = db_1.default.prepare('SELECT * FROM stores').all();
        res.json(rows.map(formatStore));
    }
    catch (err) {
        res.status(500).json({ error: '获取门店列表失败', details: err.message });
    }
});
router.get('/:id/metrics', auth_1.authenticateToken, (0, auth_1.requireRole)('owner'), (req, res) => {
    try {
        const { id } = req.params;
        const { month } = req.query;
        const store = db_1.default.prepare('SELECT * FROM stores WHERE id = ?').get(id);
        if (!store) {
            res.status(404).json({ error: '门店不存在' });
            return;
        }
        const currentMonth = month || new Date().toISOString().slice(0, 7);
        const monthStart = `${currentMonth}-01`;
        const nextMonth = new Date(`${currentMonth}-01`);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().slice(0, 10);
        const totalCapacity = db_1.default
            .prepare(`SELECT COALESCE(SUM(capacity), 0) as total
           FROM courses
           WHERE store_id = ? AND date >= ? AND date < ? AND status != 'cancelled'`)
            .get(id, monthStart, monthEnd).total;
        const totalBooked = db_1.default
            .prepare(`SELECT COALESCE(SUM(booked_count), 0) as total
           FROM courses
           WHERE store_id = ? AND date >= ? AND date < ? AND status != 'cancelled'`)
            .get(id, monthStart, monthEnd).total;
        const bookingRate = totalCapacity > 0 ? totalBooked / totalCapacity : 0;
        const totalBookings = db_1.default
            .prepare(`SELECT COUNT(*) as count
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ?`)
            .get(id, monthStart, monthEnd).count;
        const cancelledBookings = db_1.default
            .prepare(`SELECT COUNT(*) as count
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ? AND b.status = 'cancelled'`)
            .get(id, monthStart, monthEnd).count;
        const churnRate = totalBookings > 0 ? cancelledBookings / totalBookings : 0;
        const totalRevenue = db_1.default
            .prepare(`SELECT COALESCE(SUM(b.actual_price), 0) as total
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ?
             AND b.status IN ('booked', 'completed', 'waiting')`)
            .get(id, monthStart, monthEnd).total;
        const activeMembers = db_1.default
            .prepare(`SELECT COUNT(DISTINCT b.member_id) as count
           FROM bookings b
           JOIN courses c ON b.course_id = c.id
           WHERE c.store_id = ? AND b.booked_at >= ? AND b.booked_at < ?
             AND b.status IN ('booked', 'completed', 'waiting')`)
            .get(id, monthStart, monthEnd).count;
        res.json({
            storeId: id,
            month: currentMonth,
            bookingRate,
            churnRate,
            avgSatisfaction: 4.5,
            totalRevenue,
            activeMembers,
        });
    }
    catch (err) {
        res.status(500).json({ error: '获取门店运营数据失败', details: err.message });
    }
});
exports.default = router;
