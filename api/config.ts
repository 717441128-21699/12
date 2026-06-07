import path from 'node:path';

export const JWT_SECRET = process.env.JWT_SECRET || 'fitness-center-dev-secret-key-2024';
export const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data.db');
export const PORT = Number(process.env.PORT) || 4000;
export const JWT_EXPIRES_IN = '7d';
