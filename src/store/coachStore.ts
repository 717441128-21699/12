import { create } from 'zustand';
import type {
  Course,
  CoachStats,
  Booking,
  CourseStatus,
} from '../types';
import { courses as coursesApi, stats as statsApi } from '../api/endpoints';
import { useAuthStore } from './authStore';

interface CreateCourseInput {
  categoryId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  storeId?: string;
  description?: string;
}

interface CourseWithDetails extends Course {
  coach?: { id: string; name: string; phone: string };
  category?: { id: string; name: string; icon: string; color: string };
  store?: { id: string; name: string; address: string; city: string };
}

interface CoachState {
  courses: Course[];
  stats: CoachStats | null;
  loading: boolean;
  error: string | null;

  fetchCourses: (params?: { date?: string; category?: string; coach?: string; store?: string }) => Promise<void>;
  fetchStats: (coachId: string, month?: string) => Promise<void>;

  calculateConsumptionRate: (coachId: string, month?: string) => CoachStats;

  createCourse: (data: CreateCourseInput) => Promise<Course | null>;

  checkConflict: (
    coachId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeCourseId?: string
  ) => boolean;

  checkIn: (
    courseId: string,
    attendances: { bookingId: string; present: boolean }[]
  ) => Promise<boolean>;

  uploadReport: (courseId: string, bookingId: string, report: string) => Promise<Booking | null>;

  clearError: () => void;
}

function getCoachId(): string | null {
  const user = useAuthStore.getState().currentUser;
  if (!user || user.role !== 'coach') return null;
  return user.id;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  courses: [],
  stats: null,
  loading: false,
  error: null,

  fetchCourses: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await coursesApi.list(params);
      const courses = data.map((d: CourseWithDetails) => {
        const { coach, category, store, ...rest } = d;
        return rest as Course;
      });
      set({ courses, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取课程列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchStats: async (coachId, month) => {
    set({ loading: true, error: null });
    try {
      const data = await statsApi.coach(coachId, month ? { month } : undefined);
      set({ stats: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取统计数据失败';
      set({ error: message, loading: false });
    }
  },

  calculateConsumptionRate: (coachId, month) => {
    const state = get();
    if (state.stats) return state.stats;
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const coachCourses = state.courses.filter(
      (c) => c.coachId === coachId && c.date.startsWith(targetMonth)
    );
    const totalCourses = coachCourses.length;
    const consumedCourses = coachCourses.filter((c) => c.status === 'completed').length;
    const consumptionRate = totalCourses > 0 ? Math.round((consumedCourses / totalCourses) * 100) : 0;
    return {
      coachId,
      month: targetMonth,
      totalCourses,
      consumedCourses,
      consumptionRate,
      avgSatisfaction: 4.5,
    };
  },

  createCourse: async (data) => {
    const coachId = getCoachId();
    if (!coachId) return null;

    set({ loading: true, error: null });
    try {
      const storeId = data.storeId ?? useAuthStore.getState().currentUser?.storeId ?? 's1';
      const created = await coursesApi.create({
        ...data,
        storeId,
      });
      const { coach, category, store, ...rest } = created as CourseWithDetails;
      const newCourse = rest as Course;
      set((state) => ({ courses: [...state.courses, newCourse], loading: false }));
      return newCourse;
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建课程失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  checkConflict: (coachId, date, startTime, endTime, excludeCourseId) => {
    const state = get();
    const coachCourses = state.courses.filter(
      (c) =>
        c.coachId === coachId &&
        c.date === date &&
        c.status !== 'cancelled' &&
        c.id !== excludeCourseId
    );

    return coachCourses.some((course) =>
      isTimesOverlap(startTime, endTime, course.startTime, course.endTime)
    );
  },

  checkIn: async (courseId, attendances) => {
    const coachId = getCoachId();
    if (!coachId) return false;

    set({ loading: true, error: null });
    try {
      const attendance = attendances.map(({ bookingId, present }) => ({
        bookingId,
        attended: present,
      }));
      await coursesApi.checkIn(courseId, attendance);
      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, status: 'completed' as CourseStatus } : c
        ),
        loading: false,
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '签到失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  uploadReport: async (courseId, bookingId, report) => {
    const coachId = getCoachId();
    if (!coachId) return null;

    set({ loading: true, error: null });
    try {
      const result = await coursesApi.uploadReport(courseId, { bookingId, report });
      set({ loading: false });
      return result.booking;
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传报告失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
