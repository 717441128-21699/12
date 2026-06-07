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
function formatRefund(row) {
    return {
        id: row.id,
        bookingId: row.booking_id,
        memberId: row.member_id,
        totalSessions: row.total_sessions,
        completedSessions: row.completed_sessions,
        refundRatio: row.refund_ratio,
        paidAmount: row.paid_amount,
        refundAmount: row.refund_amount,
        status: row.status,
        reason: row.reason,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewerId: row.reviewer_id,
    };
}
function sendMessage(userId, role, type, title, content, relatedId, relatedType) {
    const id = generateId();
    db_1.default.prepare('INSERT INTO messages (id, user_id, role, type, title, content, related_id, related_type, has_voucher, voucher_data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, ?)').run(id, userId, role, type, title, content, relatedId || null, relatedType || null, new Date().toISOString());
}
router.get('/', auth_1.authenticateToken, (req, res) => {
    try {
        const { currentUserId, currentUserRole } = {
            currentUserId: req.user.id,
            currentUserRole: req.user.role,
        };
        const { status } = req.query;
        let rows = [];
        if (currentUserRole === 'member') {
            rows = db_1.default.prepare('SELECT * FROM refunds WHERE member_id = ? ORDER BY created_at DESC').all(currentUserId);
        }
        else if (currentUserRole === 'manager' || currentUserRole === 'owner') {
            let sql = 'SELECT * FROM refunds';
            const params = [];
            if (status) {
                sql += ' WHERE status = ?';
                params.push(status);
            }
            sql += ' ORDER BY created_at DESC';
            rows = db_1.default.prepare(sql).all(...params);
        }
        else {
            res.status(403).json({ error: '无权访问' });
            return;
        }
        res.json(rows.map(formatRefund));
    }
    catch (err) {
        res.status(500).json({ error: '获取退款列表失败', details: err.message });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)('member'), (req, res) => {
    try {
        const memberId = req.user.id;
        const { bookingId, totalSessions, completedSessions, reason } = req.body;
        if (!bookingId || totalSessions === undefined || completedSessions === undefined || !reason) {
            res.status(400).json({ error: '缺少必填字段: bookingId, totalSessions, completedSessions, reason' });
            return;
        }
        const booking = db_1.default.prepare('SELECT * FROM bookings WHERE id = ? AND member_id = ?').get(bookingId, memberId);
        if (!booking) {
            res.status(404).json({ error: '预约不存在或不属于您' });
            return;
        }
        const existingRefund = db_1.default.prepare('SELECT COUNT(*) as count FROM refunds WHERE booking_id = ?').get(bookingId).count > 0;
        if (existingRefund) {
            res.status(400).json({ error: '该预约已存在退款申请' });
            return;
        }
        if (totalSessions <= 0 || completedSessions < 0 || completedSessions > totalSessions) {
            res.status(400).json({ error: '课时数参数不合法' });
            return;
        }
        const completedRatio = completedSessions / totalSessions;
        const refundRatio = Number(Math.max(0, 1 - completedRatio).toFixed(2));
        const refundAmount = Math.round(booking.actual_price * refundRatio);
        const id = generateId();
        const createdAt = new Date().toISOString();
        db_1.default.prepare('INSERT INTO refunds (id, booking_id, member_id, total_sessions, completed_sessions, refund_ratio, paid_amount, refund_amount, status, reason, created_at, reviewed_at, reviewer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)').run(id, bookingId, memberId, totalSessions, completedSessions, refundRatio, booking.actual_price, refundAmount, 'pending', reason, createdAt);
        sendMessage(memberId, 'member', 'refund_request', '退款申请已提交', `您已提交退款申请，应退金额 ¥${refundAmount.toFixed(2)}，请等待运营审核。`, id, 'refund');
        const managers = db_1.default.prepare("SELECT id FROM users WHERE role = 'manager'").all();
        for (const mgr of managers) {
            sendMessage(mgr.id, 'manager', 'refund_request', '新退款申请待审批', `会员提交了退款申请，金额 ¥${refundAmount.toFixed(2)}，请及时处理。`, id, 'refund');
        }
        const row = db_1.default.prepare('SELECT * FROM refunds WHERE id = ?').get(id);
        res.status(201).json(formatRefund(row));
    }
    catch (err) {
        res.status(500).json({ error: '创建退款申请失败', details: err.message });
    }
});
router.post('/:id/approve', auth_1.authenticateToken, (0, auth_1.requireRole)('manager'), (req, res) => {
    try {
        const { id } = req.params;
        const reviewerId = req.user.id;
        const existing = db_1.default.prepare('SELECT * FROM refunds WHERE id = ?').get(id);
        if (!existing) {
            res.status(404).json({ error: '退款申请不存在' });
            return;
        }
        if (existing.status !== 'pending') {
            res.status(400).json({ error: '该申请已被处理' });
            return;
        }
        const tx = db_1.default.transaction(() => {
            db_1.default.prepare("UPDATE refunds SET status = 'approved', reviewed_at = ?, reviewer_id = ? WHERE id = ?").run(new Date().toISOString(), reviewerId, id);
            db_1.default.prepare("UPDATE bookings SET status = 'refunded' WHERE id = ?").run(existing.booking_id);
        });
        tx();
        const row = db_1.default.prepare('SELECT * FROM refunds WHERE id = ?').get(id);
        sendMessage(existing.member_id, 'member', 'refund_result', '退款申请已通过', `您的退款申请已通过，退款金额 ¥${row.refund_amount.toFixed(2)} 将在3个工作日内原路返回。`, id, 'refund');
        res.json(formatRefund(row));
    }
    catch (err) {
        res.status(500).json({ error: '审批退款失败', details: err.message });
    }
});
router.post('/:id/reject', auth_1.authenticateToken, (0, auth_1.requireRole)('manager'), (req, res) => {
    try {
        const { id } = req.params;
        const reviewerId = req.user.id;
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({ error: '缺少驳回原因' });
            return;
        }
        const existing = db_1.default.prepare('SELECT * FROM refunds WHERE id = ?').get(id);
        if (!existing) {
            res.status(404).json({ error: '退款申请不存在' });
            return;
        }
        if (existing.status !== 'pending') {
            res.status(400).json({ error: '该申请已被处理' });
            return;
        }
        const combinedReason = `${existing.reason}（驳回原因：${reason}）`;
        db_1.default.prepare("UPDATE refunds SET status = 'rejected', reviewed_at = ?, reviewer_id = ?, reason = ? WHERE id = ?").run(new Date().toISOString(), reviewerId, combinedReason, id);
        const row = db_1.default.prepare('SELECT * FROM refunds WHERE id = ?').get(id);
        sendMessage(existing.member_id, 'member', 'refund_result', '退款申请被驳回', `您的退款申请未通过，驳回原因：${reason}。如有疑问请联系客服。`, id, 'refund');
        res.json(formatRefund(row));
    }
    catch (err) {
        res.status(500).json({ error: '驳回退款失败', details: err.message });
    }
});
exports.default = router;
