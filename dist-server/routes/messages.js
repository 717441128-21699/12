"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
function formatMessage(row) {
    return {
        id: row.id,
        userId: row.user_id,
        role: row.role,
        type: row.type,
        title: row.title,
        content: row.content,
        relatedId: row.related_id,
        relatedType: row.related_type,
        hasVoucher: row.has_voucher === 1,
        voucher: row.voucher_data ? JSON.parse(row.voucher_data) : undefined,
        read: row.read === 1,
        createdAt: row.created_at,
    };
}
router.get('/', auth_1.authenticateToken, (req, res) => {
    try {
        const { currentUserId, currentUserRole } = {
            currentUserId: req.user.id,
            currentUserRole: req.user.role,
        };
        const { type } = req.query;
        let sql = 'SELECT * FROM messages WHERE user_id = ? AND role = ?';
        const params = [currentUserId, currentUserRole];
        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = db_1.default.prepare(sql).all(...params);
        res.json(rows.map(formatMessage));
    }
    catch (err) {
        res.status(500).json({ error: '获取消息列表失败', details: err.message });
    }
});
router.get('/unread-count', auth_1.authenticateToken, (req, res) => {
    try {
        const { currentUserId, currentUserRole } = {
            currentUserId: req.user.id,
            currentUserRole: req.user.role,
        };
        const result = db_1.default.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = ? AND read = 0').get(currentUserId, currentUserRole);
        res.json({ count: result.count });
    }
    catch (err) {
        res.status(500).json({ error: '获取未读消息数失败', details: err.message });
    }
});
router.post('/:id/read', auth_1.authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.id;
        const existing = db_1.default.prepare('SELECT * FROM messages WHERE id = ?').get(id);
        if (!existing) {
            res.status(404).json({ error: '消息不存在' });
            return;
        }
        if (existing.user_id !== currentUserId) {
            res.status(403).json({ error: '无权操作他人的消息' });
            return;
        }
        db_1.default.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(id);
        const row = db_1.default.prepare('SELECT * FROM messages WHERE id = ?').get(id);
        res.json(formatMessage(row));
    }
    catch (err) {
        res.status(500).json({ error: '标记已读失败', details: err.message });
    }
});
router.post('/read-all', auth_1.authenticateToken, (req, res) => {
    try {
        const { currentUserId, currentUserRole } = {
            currentUserId: req.user.id,
            currentUserRole: req.user.role,
        };
        const result = db_1.default.prepare('UPDATE messages SET read = 1 WHERE user_id = ? AND role = ? AND read = 0').run(currentUserId, currentUserRole);
        res.json({ updated: result.changes || 0 });
    }
    catch (err) {
        res.status(500).json({ error: '批量标记已读失败', details: err.message });
    }
});
exports.default = router;
