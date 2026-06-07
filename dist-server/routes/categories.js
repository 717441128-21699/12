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
function formatCategory(row) {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        description: row.description,
        basePrice: row.base_price,
        color: row.color,
    };
}
router.get('/', (_req, res) => {
    try {
        const rows = db_1.default.prepare('SELECT * FROM categories').all();
        res.json(rows.map(formatCategory));
    }
    catch (err) {
        res.status(500).json({ error: '获取分类列表失败', details: err.message });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)('manager'), (req, res) => {
    try {
        const { name, icon, description, basePrice, color } = req.body;
        if (!name || !icon || !description || basePrice === undefined || !color) {
            res.status(400).json({ error: '缺少必填字段: name, icon, description, basePrice, color' });
            return;
        }
        const id = generateId();
        db_1.default.prepare('INSERT INTO categories (id, name, icon, description, base_price, color) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, icon, description, basePrice, color);
        const row = db_1.default.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        res.status(201).json(formatCategory(row));
    }
    catch (err) {
        res.status(500).json({ error: '创建分类失败', details: err.message });
    }
});
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('manager'), (req, res) => {
    try {
        const { id } = req.params;
        const existing = db_1.default.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!existing) {
            res.status(404).json({ error: '分类不存在' });
            return;
        }
        const { name, icon, description, basePrice, color } = req.body;
        db_1.default.prepare('UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), description = COALESCE(?, description), base_price = COALESCE(?, base_price), color = COALESCE(?, color) WHERE id = ?').run(name ?? null, icon ?? null, description ?? null, basePrice ?? null, color ?? null, id);
        const row = db_1.default.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        res.json(formatCategory(row));
    }
    catch (err) {
        res.status(500).json({ error: '更新分类失败', details: err.message });
    }
});
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('manager'), (req, res) => {
    try {
        const { id } = req.params;
        const existing = db_1.default.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!existing) {
            res.status(404).json({ error: '分类不存在' });
            return;
        }
        const hasCourses = db_1.default.prepare('SELECT COUNT(*) as count FROM courses WHERE category_id = ?').get(id).count > 0;
        if (hasCourses) {
            res.status(400).json({ error: '该分类下存在课程，无法删除' });
            return;
        }
        db_1.default.prepare('DELETE FROM categories WHERE id = ?').run(id);
        res.json(formatCategory(existing));
    }
    catch (err) {
        res.status(500).json({ error: '删除分类失败', details: err.message });
    }
});
exports.default = router;
