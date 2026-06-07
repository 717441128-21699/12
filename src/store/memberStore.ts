import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  MemberBodyData,
  TrainingPlan,
  DietPlan,
  Booking,
  WaitingQueue,
  RefundRequest,
  Course,
  MemberLevel,
  MessageVoucher,
} from '../types';
import { generateTrainingPlan, generateDietPlan } from '../utils/plan';
import { calculateActualPrice, calculateRefundAmount } from '../utils/price';
import { generateId, initialBookings, initialWaitingQueues } from '../utils/mockData';
import { useAuthStore } from './authStore';
import { useMessageStore } from './messageStore';

interface MemberState {
  bodyData: MemberBodyData | null;
  trainingPlan: TrainingPlan | null;
  dietPlan: DietPlan | null;
  bookings: Booking[];
  waitingQueues: WaitingQueue[];
  refundRequests: RefundRequest[];

  generatePlan: (bodyData: MemberBodyData) => {
    trainingPlan: TrainingPlan;
    dietPlan: DietPlan;
  };

  bookCourse: (courseId: string, courses: Course[]) => Booking | null;

  cancelBooking: (bookingId: string, courses: Course[]) => {
    updatedCourses: Course[];
    promotedMemberId?: string;
  } | null;

  joinWaiting: (courseId: string) => WaitingQueue | null;

  applyRefund: (
    bookingId: string,
    reason: string,
    totalSessions?: number,
    completedSessions?: number
  ) => RefundRequest | null;
}

function getMemberLevel(): MemberLevel {
  const user = useAuthStore.getState().currentUser;
  return user?.memberLevel || user?.level || 'normal';
}

function getMemberId(): string | null {
  const user = useAuthStore.getState().currentUser;
  return user?.id ?? null;
}

function generateVoucher(
  type: 'booking' | 'refund' | 'attendance',
  id: string,
  amount?: number
): MessageVoucher {
  return {
    type,
    bookingId: type === 'booking' || type === 'attendance' ? id : undefined,
    refundId: type === 'refund' ? id : undefined,
    amount,
    issuedAt: new Date().toISOString(),
    code: `${type.toUpperCase().slice(0, 2)}${Date.now()}`,
  };
}

function notifyBookingSuccess(booking: Booking, course: Course) {
  const user = useAuthStore.getState().currentUser;
  if (!user) return;
  useMessageStore.getState().sendMessage({
    userId: user.id,
    role: user.role,
    type: 'booking_success',
    title: '预约成功',
    content: `您已成功预约「${course.title}」课程，时间：${course.date} ${course.startTime}-${course.endTime}`,
    relatedId: booking.id,
    relatedType: 'booking',
    voucher: generateVoucher('booking', booking.id, booking.actualPrice),
  });
}

function notifyCancelSuccess(course: Course) {
  const user = useAuthStore.getState().currentUser;
  if (!user) return;
  useMessageStore.getState().sendMessage({
    userId: user.id,
    role: user.role,
    type: 'refund_result',
    title: '取消预约成功',
    content: `您已成功取消「${course.title}」课程预约`,
    relatedId: course.id,
    relatedType: 'course',
  });
}

function notifyWaitingPromoted(memberId: string, course: Course, booking: Booking) {
  useMessageStore.getState().sendMessage({
    userId: memberId,
    role: 'member',
    type: 'waiting_promoted',
    title: '候补补位成功',
    content: `恭喜您从候补队列中补位成功，已为您预约「${course.title}」课程，时间：${course.date} ${course.startTime}-${course.endTime}`,
    relatedId: booking.id,
    relatedType: 'booking',
    voucher: generateVoucher('booking', booking.id, booking.actualPrice),
  });
}

export const useMemberStore = create<MemberState>()(
  persist(
    (set, get) => ({
      bodyData: null,
      trainingPlan: null,
      dietPlan: null,
      bookings: initialBookings,
      waitingQueues: initialWaitingQueues,
      refundRequests: [],

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

      bookCourse: (courseId, courses) => {
        const memberId = getMemberId();
        if (!memberId) return null;

        const course = courses.find((c) => c.id === courseId);
        if (!course) return null;

        const state = get();
        const alreadyBooked = state.bookings.some(
          (b) => b.courseId === courseId && b.memberId === memberId && b.status === 'booked'
        );
        if (alreadyBooked) return null;

        const existingWaiting = state.waitingQueues.find((wq) => wq.courseId === courseId);
        const alreadyWaiting = existingWaiting?.members.some(
          (m) => m.memberId === memberId
        );
        if (alreadyWaiting) return null;

        if (course.bookedCount >= course.capacity) {
          get().joinWaiting(courseId);
          return null;
        }

        const level = getMemberLevel();
        const { actualPrice, discountRate } = calculateActualPrice(course.price, level);

        const booking: Booking = {
          id: generateId(),
          memberId,
          courseId,
          status: 'booked',
          price: course.price,
          discountRate,
          actualPrice,
          bookedAt: new Date().toISOString(),
        };

        set((prevState) => ({
          bookings: [...prevState.bookings, booking],
        }));

        notifyBookingSuccess(booking, course);

        return booking;
      },

      cancelBooking: (bookingId, courses) => {
        const memberId = getMemberId();
        if (!memberId) return null;

        const state = get();
        const booking = state.bookings.find(
          (b) => b.id === bookingId && b.memberId === memberId
        );
        if (!booking || booking.status !== 'booked') return null;

        const course = courses.find((c) => c.id === booking.courseId);
        if (!course) return null;

        set((prevState) => ({
          bookings: prevState.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
          ),
        }));

        notifyCancelSuccess(course);

        let updatedCourses = courses.map((c) =>
          c.id === booking.courseId ? { ...c, bookedCount: Math.max(0, c.bookedCount - 1) } : c
        );

        const waitingQueue = get().waitingQueues.find(
          (wq) => wq.courseId === booking.courseId
        );

        if (waitingQueue && waitingQueue.members.length > 0) {
          const firstWaiting = waitingQueue.members[0];
          const promotedMemberId = firstWaiting.memberId;

          set((prevState) => ({
            waitingQueues: prevState.waitingQueues.map((wq) =>
              wq.courseId === booking.courseId
                ? { ...wq, members: wq.members.slice(1) }
                : wq
            ),
          }));

          const level: MemberLevel = 'normal';
          const { actualPrice, discountRate } = calculateActualPrice(course.price, level);

          const promotedBooking: Booking = {
            id: generateId(),
            memberId: promotedMemberId,
            courseId: booking.courseId,
            status: 'booked',
            price: course.price,
            discountRate,
            actualPrice,
            bookedAt: new Date().toISOString(),
          };

          set((prevState) => ({
            bookings: [...prevState.bookings, promotedBooking],
          }));

          updatedCourses = updatedCourses.map((c) =>
            c.id === booking.courseId ? { ...c, bookedCount: c.bookedCount + 1 } : c
          );

          notifyWaitingPromoted(promotedMemberId, course, promotedBooking);

          return { updatedCourses, promotedMemberId };
        }

        return { updatedCourses };
      },

      joinWaiting: (courseId) => {
        const memberId = getMemberId();
        if (!memberId) return null;

        const state = get();
        const existing = state.waitingQueues.find((wq) => wq.courseId === courseId);

        if (existing) {
          const alreadyIn = existing.members.some((m) => m.memberId === memberId);
          if (alreadyIn) return existing;

          const updatedQueue: WaitingQueue = {
            ...existing,
            members: [
              ...existing.members,
              { memberId, joinedAt: new Date().toISOString() },
            ],
          };

          set((prevState) => ({
            waitingQueues: prevState.waitingQueues.map((wq) =>
              wq.courseId === courseId ? updatedQueue : wq
            ),
          }));

          return updatedQueue;
        }

        const newQueue: WaitingQueue = {
          courseId,
          members: [{ memberId, joinedAt: new Date().toISOString() }],
        };

        set((prevState) => ({
          waitingQueues: [...prevState.waitingQueues, newQueue],
        }));

        return newQueue;
      },

      applyRefund: (
        bookingId,
        reason,
        totalSessions = 1,
        completedSessions = 0
      ) => {
        const memberId = getMemberId();
        if (!memberId) return null;

        const booking = get().bookings.find(
          (b) => b.id === bookingId && b.memberId === memberId
        );
        if (!booking) return null;

        const { refundAmount, refundRatio } = calculateRefundAmount(
          booking.actualPrice,
          totalSessions,
          completedSessions
        );

        const refundRequest: RefundRequest = {
          id: generateId(),
          bookingId,
          memberId,
          totalSessions,
          completedSessions,
          refundRatio,
          paidAmount: booking.actualPrice,
          refundAmount,
          status: 'pending',
          reason,
          createdAt: new Date().toISOString(),
        };

        set((prevState) => ({
          refundRequests: [...prevState.refundRequests, refundRequest],
        }));

        const user = useAuthStore.getState().currentUser;
        if (user) {
          useMessageStore.getState().sendMessage({
            userId: user.id,
            role: user.role,
            type: 'refund_request',
            title: '退款申请已提交',
            content: `您已提交退款申请，应退金额 ¥${refundAmount.toFixed(2)}，请等待运营审核`,
            relatedId: refundRequest.id,
            relatedType: 'refund',
          });
        }

        return refundRequest;
      },
    }),
    {
      name: 'fitpro-member-store',
    }
  )
);
