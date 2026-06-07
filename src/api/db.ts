import type {
  User,
  Store,
  CourseCategory,
  PricingRule,
  Course,
  Booking,
  WaitingQueue,
  RefundRequest,
  Message,
  CoachStats,
  StoreMetrics,
} from '../types';

const DB_KEY = 'fitpro-api-db';

export interface Database {
  users: User[];
  stores: Store[];
  categories: CourseCategory[];
  pricingRules: PricingRule[];
  courses: Course[];
  bookings: Booking[];
  waitingQueues: WaitingQueue[];
  refundRequests: RefundRequest[];
  messages: Message[];
  coachStats: CoachStats[];
  storeMetrics: StoreMetrics[];
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const emptyDb: Database = {
  users: [],
  stores: [],
  categories: [],
  pricingRules: [],
  courses: [],
  bookings: [],
  waitingQueues: [],
  refundRequests: [],
  messages: [],
  coachStats: [],
  storeMetrics: [],
};

let inMemoryDb: Database | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getDb(): Database {
  if (!isBrowser()) {
    if (!inMemoryDb) {
      inMemoryDb = JSON.parse(JSON.stringify(emptyDb));
    }
    return inMemoryDb;
  }

  const raw = window.localStorage.getItem(DB_KEY);
  if (!raw) {
    const fresh = JSON.parse(JSON.stringify(emptyDb));
    window.localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const fresh = JSON.parse(JSON.stringify(emptyDb));
    window.localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function saveDb(db: Database): void {
  if (!isBrowser()) {
    inMemoryDb = db;
    return;
  }
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDb(): void {
  if (!isBrowser()) {
    inMemoryDb = JSON.parse(JSON.stringify(emptyDb));
    return;
  }
  window.localStorage.setItem(DB_KEY, JSON.stringify(JSON.parse(JSON.stringify(emptyDb))));
}

export function isDbEmpty(): boolean {
  const db = getDb();
  return (
    db.users.length === 0 &&
    db.stores.length === 0 &&
    db.categories.length === 0 &&
    db.courses.length === 0
  );
}

export interface ApiContext {
  currentUserId?: string;
  currentUserRole?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function fail<T>(error: string): ApiResponse<T> {
  return { success: false, error };
}
