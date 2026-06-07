import { isDbEmpty, getDb, saveDb, resetDb } from './db';
import { runSeed, buildSeedDatabase } from './seed';
import * as bookings from './routes/bookings';
import * as waiting from './routes/waiting';
import * as refunds from './routes/refunds';
import * as messages from './routes/messages';
import * as stats from './routes/stats';

export { bookings, waiting, refunds, messages, stats };
export { getDb, saveDb, resetDb, isDbEmpty, generateId, ok, fail } from './db';
export type { ApiContext, ApiResponse, Database } from './db';
export { runSeed, buildSeedDatabase } from './seed';

let initialized = false;

export function initializeApi(force: boolean = false): void {
  if (initialized && !force) return;

  const shouldSeed = force || isDbEmpty();
  if (shouldSeed) {
    runSeed(force);
  }

  initialized = true;
}

if (typeof window !== 'undefined') {
  try {
    initializeApi();
  } catch (e) {
    console.warn('[FitPro API] 初始化失败:', e);
  }
}

export const api = {
  bookings,
  waiting,
  refunds,
  messages,
  stats,
  db: { getDb, saveDb, resetDb, isDbEmpty },
  seed: { runSeed, buildSeedDatabase },
  init: initializeApi,
};

export default api;
