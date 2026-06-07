import { create } from 'zustand';
import type {
  MemberBodyData,
  TrainingPlan,
  DietPlan,
  Booking,
  WaitingQueue,
  RefundRequest,
  Course,
  MemberLevel,
} from '../types';
import { generateTrainingPlan, generateDietPlan } from '../utils/plan';
import { bookings as bookingApi, waiting as waitingApi, refunds as refundApi } from '../api/endpoints';
import { useAuthStore } from './authStore';

interface BookingWaitResponse {
  waiting: boolean;
  position: number;
}

interface WaitingQueueWithPosition extends WaitingQueue {
  myPosition?: number;
}

interface MemberState {
  bodyData: MemberBodyData | null;
  trainingPlan: TrainingPlan | null;
  dietPlan: DietPlan | null;
  bookings: Booking[];
  waitingQueues: WaitingQueueWithPosition[];
  refundRequests: RefundRequest[];
  loading: boolean;
  error: string | null;

  fetchBookings: () => Promise<void>;
  fetchWaitingQueues: () => Promise<void>;
  fetchRefundRequests: () => Promise<void>;
  fetchAll: () => Promise<void>;

  generatePlan: (bodyData: MemberBodyData) => {
    trainingPlan: TrainingPlan;
    dietPlan: DietPlan;
  };

  bookCourse: (courseId: string, _courses: Course[]) => Promise<Booking | BookingWaitResponse | null>;

  cancelBooking: (bookingId: string, _courses: Course[]) => Promise<{
    updatedCourses: Course[];
    promotedMemberId?: string;
  } | null>;

  joinWaiting: (courseId: string) => Promise<WaitingQueueWithPosition | null>;
  leaveWaiting: (courseId: string) => Promise<boolean>;

  applyRefund: (
    bookingId: string,
    reason: string,
    totalSessions?: number,
    completedSessions?: number
  ) => Promise<RefundRequest | null>;

  clearError: () => void;
}

function getMemberLevel(): MemberLevel {
  const user = useAuthStore.getState().currentUser;
  return user?.memberLevel || user?.level || 'normal';
}

function getMemberId(): string | null {
  const user = useAuthStore.getState().currentUser;
  return user?.id ?? null;
}

export const useMemberStore = create<MemberState>((set, get) => ({
  bodyData: null,
  trainingPlan: null,
  dietPlan: null,
  bookings: [],
  waitingQueues: [],
  refundRequests: [],
  loading: false,
  error: null,

  fetchBookings: async () => {
    set({ loading: true, error: null });
    try {
      const data = await bookingApi.list();
      set({ bookings: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取预约列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchWaitingQueues: async () => {
    set({ loading: true, error: null });
    try {
      const data = await waitingApi.list();
      set({ waitingQueues: data as WaitingQueueWithPosition[], loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取候补列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchRefundRequests: async () => {
    set({ loading: true, error: null });
    try {
      const data = await refundApi.list();
      set({ refundRequests: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取退款列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [bookingsData, waitingData, refundsData] = await Promise.all([
        bookingApi.list(),
        waitingApi.list(),
        refundApi.list(),
      ]);
      set({
        bookings: bookingsData,
        waitingQueues: waitingData as WaitingQueueWithPosition[],
        refundRequests: refundsData,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载数据失败';
      set({ error: message, loading: false });
    }
  },

  generatePlan: (bodyData) => {
    const trainingPlan = generateTrainingPlan(bodyData);
    const dietPlan = generateDietPlan(bodyData);
    set({
      bodyData,
      trainingPlan,
      dietPlan,
    });
    return { trainingPlan, dietPlan };
  },

  bookCourse: async (courseId) => {
    const memberId = getMemberId();
    if (!memberId) return null;

    set({ loading: true, error: null });
    try {
      const result = await bookingApi.create({ courseId });
      await get().fetchBookings();
      await get().fetchWaitingQueues();
      set({ loading: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '预约失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  cancelBooking: async (bookingId, _courses) => {
    const memberId = getMemberId();
    if (!memberId) return null;

    set({ loading: true, error: null });
    try {
      const result = await bookingApi.cancel(bookingId);
      await get().fetchBookings();
      await get().fetchWaitingQueues();
      set({ loading: false });
      return { updatedCourses: _courses, promotedMemberId: result.promotedMemberId };
    } catch (err) {
      const message = err instanceof Error ? err.message : '取消预约失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  joinWaiting: async (courseId) => {
    set({ loading: true, error: null });
    try {
      const result = await bookingApi.create({ courseId });
      await get().fetchWaitingQueues();
      set({ loading: false });

      if (result && 'waiting' in result && result.waiting) {
        const queues = get().waitingQueues;
        const wq = queues.find((q) => q.courseId === courseId);
        return wq || null;
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : '加入候补失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  leaveWaiting: async (courseId) => {
    set({ loading: true, error: null });
    try {
      await waitingApi.leave(courseId);
      await get().fetchWaitingQueues();
      set({ loading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '退出候补失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  applyRefund: async (
    bookingId,
    reason,
    totalSessions = 1,
    completedSessions = 0
  ) => {
    const memberId = getMemberId();
    if (!memberId) return null;

    set({ loading: true, error: null });
    try {
      const result = await refundApi.create({
        bookingId,
        totalSessions,
        completedSessions,
        reason,
      });
      await get().fetchRefundRequests();
      set({ loading: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '申请退款失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
