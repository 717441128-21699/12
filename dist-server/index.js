"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const seed_1 = require("./seed");
require("./types");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api', routes_1.default);
async function startServer() {
    try {
        await (0, seed_1.initSeedData)();
        app.listen(config_1.PORT, () => {
            console.log(`[server] API server running on http://localhost:${config_1.PORT}`);
        });
    }
    catch (error) {
        console.error('[server] Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
