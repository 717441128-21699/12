"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_EXPIRES_IN = exports.PORT = exports.DB_PATH = exports.JWT_SECRET = void 0;
const node_path_1 = __importDefault(require("node:path"));
exports.JWT_SECRET = process.env.JWT_SECRET || 'fitness-center-dev-secret-key-2024';
exports.DB_PATH = process.env.DB_PATH || node_path_1.default.join(process.cwd(), 'data.db');
exports.PORT = Number(process.env.PORT) || 4000;
exports.JWT_EXPIRES_IN = '7d';
