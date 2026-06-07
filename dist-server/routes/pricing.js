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
function formatPricingRule(row) {
    return {
        id: row.id,
        level: row.level,
        levelName: row.level_name,
        discountRate: row.discount_rate,
        singlePrice: row.single_price,
        monthlyPrice: row.monthly_price,
        quarterlyPrice: row.quarterly_price,
        yearlyPrice: row.yearly_price,
    };
}
router.get('/', (_req, res) => {
    try {
        const rows = db_1.default.prepare('SELECT * FROM pricing_rules ORDER BY discount_rate DESC').all();
        res.json(rows.map(formatPricingRule));
    }
    catch (err) {
        res.status(500).json({ error: '获取价格规则失败', details: err.message });
    }
});
router.get('/:level', (req, res) => {
    try {
        const { level } = req.params;
        const row = db_1.default.prepare('SELECT * FROM pricing_rules WHERE level = ?').get(level);
        if (!row) {
            res.status(404).json({ error: '价格规则不存在' });
            return;
        }
        res.json(formatPricingRule(row));
    }
    catch (err) {
        res.status(500).json({ error: '获取价格规则失败', details: err.message });
    }
});
router.put('/:level', auth_1.authenticateToken, (0, auth_1.requireRole)('manager', 'owner'), (req, res) => {
    try {
        const { level } = req.params;
        const existing = db_1.default.prepare('SELECT * FROM pricing_rules WHERE level = ?').get(level);
        if (!existing) {
            res.status(404).json({ error: '价格规则不存在' });
            return;
        }
        const { levelName, discountRate, singlePrice, monthlyPrice, quarterlyPrice, yearlyPrice } = req.body;
        db_1.default.prepare(`UPDATE pricing_rules SET 
          level_name = COALESCE(?, level_name),
          discount_rate = COALESCE(?, discount_rate),
          single_price = COALESCE(?, single_price),
          monthly_price = COALESCE(?, monthly_price),
          quarterly_price = COALESCE(?, quarterly_price),
          yearly_price = COALESCE(?, yearly_price)
        WHERE level = ?`).run(levelName ?? null, discountRate ?? null, singlePrice ?? null, monthlyPrice ?? null, quarterlyPrice ?? null, yearlyPrice ?? null, level);
        const row = db_1.default.prepare('SELECT * FROM pricing_rules WHERE level = ?').get(level);
        res.json(formatPricingRule(row));
    }
    catch (err) {
        res.status(500).json({ error: '更新价格规则失败', details: err.message });
    }
});
exports.default = router;
