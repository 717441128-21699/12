"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function sanitizeUser(row) {
    return {
        id: row.id,
        role: row.role,
        name: row.name,
        phone: row.phone,
        storeId: row.store_id,
        memberLevel: row.member_level,
        createdAt: row.created_at,
    };
}
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ user }, config_1.JWT_SECRET, { expiresIn: config_1.JWT_EXPIRES_IN });
}
router.post('/register', async (req, res) => {
    try {
        const { name, phone, password, storeId, memberLevel } = req.body;
        if (!name || !phone || !password) {
            res.status(400).json({ error: '缺少必填字段: name, phone, password' });
            return;
        }
        const existing = db_1.default.prepare('SELECT id FROM users WHERE role = ? AND phone = ?').get('member', phone);
        if (existing) {
            res.status(409).json({ error: '该手机号已注册' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const id = generateId();
        const createdAt = new Date().toISOString();
        const level = memberLevel || 'normal';
        db_1.default.prepare('INSERT INTO users (id, role, name, phone, password_hash, store_id, member_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, 'member', name, phone, hashedPassword, storeId || null, level, createdAt);
        const userRow = db_1.default.prepare('SELECT * FROM users WHERE id = ?').get(id);
        const user = sanitizeUser(userRow);
        const token = generateToken(user);
        res.status(201).json({ token, user });
    }
    catch (err) {
        res.status(500).json({ error: '注册失败', details: err.message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { role, phone, password } = req.body;
        if (!role || !phone || !password) {
            res.status(400).json({ error: '缺少必填字段: role, phone, password' });
            return;
        }
        const userRow = db_1.default.prepare('SELECT * FROM users WHERE role = ? AND phone = ?').get(role, phone);
        if (!userRow) {
            res.status(401).json({ error: '用户不存在' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, userRow.password_hash);
        if (!valid) {
            res.status(401).json({ error: '密码错误' });
            return;
        }
        const user = sanitizeUser(userRow);
        const token = generateToken(user);
        res.json({ token, user });
    }
    catch (err) {
        res.status(500).json({ error: '登录失败', details: err.message });
    }
});
router.get('/me', auth_1.authenticateToken, (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: '未登录' });
            return;
        }
        const userRow = db_1.default.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!userRow) {
            res.status(404).json({ error: '用户不存在' });
            return;
        }
        res.json(sanitizeUser(userRow));
    }
    catch (err) {
        res.status(500).json({ error: '获取用户信息失败', details: err.message });
    }
});
exports.default = router;
