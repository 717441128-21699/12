import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Course,
  CoachStats,
  Booking,
  CourseStatus,
  MessageVoucher,
} from '../types';
import { generateId, getInitialCourses } from '../utils/mockData';
import { useAuthStore } from './authStore';
import { useMessageStore } from './messageStore';
import { useMemberStore } from './memberStore';

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

interface CoachState {
  courses: Course[];
  stats: CoachStats | null;

  createCourse: (data: CreateCourseInput) => Course | null;

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
  ) => Booking[];

  uploadReport: (bookingId: string, report: string) => Booking | null;

  calculateConsumptionRate: (coachId: string, month?: string) => CoachStats;
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

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

const initialCoachId = 'coach1';

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      courses: getInitialCourses(initialCoachId),
      stats: null,

      createCourse: (data) => {
        const coachId = getCoachId();
        if (!coachId) return null;

        const storeId = data.storeId ?? useAuthStore.getState().currentUser?.storeId ?? 's1';

        const hasConflict = get().checkConflict(
          coachId,
          data.date,
          data.startTime,
          data.endTime
        );
        if (hasConflict) return null;

        const course: Course = {
          id: generateId(),
          categoryId: data.categoryId,
          coachId,
          storeId,
          title: data.title,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          capacity: data.capacity,
          bookedCount: 0,
          price: data.price,
          status: 'scheduled',
          description: data.description,
        };

        set((state) => ({
          courses: [...state.courses, course],
        }));

        return course;
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

      checkIn: (courseId, attendances) => {
        const coachId = getCoachId();
        if (!coachId) return [];

        const course = get().courses.find((c) => c.id === courseId);
        if (!course || course.coachId !== coachId) return [];

        const updatedBookings: Booking[] = [];

        const memberState = useMemberStore.getState();

        const updatedMemberBookings = memberState.bookings.map((b: Booking) => {
          if (b.courseId !== courseId) return b;
          const att = attendances.find((a) => a.bookingId === b.id);
          if (att) {
            const updated: Booking = { ...b, attendance: att.present };
            if (att.present) {
              updated.status = 'completed';
            }
            updatedBookings.push(updated);
            return updated;
          }
          return b;
        });

        useMemberStore.setState({ bookings: updatedMemberBookings });

        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === courseId
              ? { ...c, status: 'completed' as CourseStatus }
              : c
          ),
        }));

        const user = useAuthStore.getState().currentUser;
        if (user) {
          useMessageStore.getState().sendMessage({
            userId: user.id,
            role: user.role,
            type: 'attendance_record',
            title: '课程打卡完成',
            content: `「${course.title}」课程已完成打卡，共 ${attendances.filter((a) => a.present).length} 人出勤`,
            relatedId: courseId,
            relatedType: 'course',
          });
        }

        updatedBookings.forEach((b) => {
          if (b.attendance) {
            useMessageStore.getState().sendMessage({
              userId: b.memberId,
              role: 'member',
              type: 'attendance_record',
              title: '出勤记录已生成',
              content: `您已完成「${course.title}」课程出勤，可在我的预约中查看详情`,
              relatedId: b.id,
              relatedType: 'booking',
              voucher: generateVoucher('attendance', b.id),
            });
          }
        });

        return updatedBookings;
      },

      uploadReport: (bookingId, report) => {
        const coachId = getCoachId();
        if (!coachId) return null;

        const memberState = useMemberStore.getState();

        const booking = memberState.bookings.find((b: Booking) => b.id === bookingId);
        if (!booking) return null;

        const course = get().courses.find((c) => c.id === booking.courseId);
        if (!course || course.coachId !== coachId) return null;

        const updatedBooking: Booking = {
          ...booking,
          trainingReport: report,
        };

        useMemberStore.setState({
          bookings: memberState.bookings.map((b: Booking) =>
            b.id === bookingId ? updatedBooking : b
          ),
        });

        useMessageStore.getState().sendMessage({
          userId: booking.memberId,
          role: 'member',
          type: 'attendance_record',
          title: '训练报告已上传',
          content: `教练已为您上传「${course.title}」的训练报告，请查看`,
          relatedId: bookingId,
          relatedType: 'booking',
        });

        return updatedBooking;
      },

      calculateConsumptionRate: (coachId, month) => {
        const targetMonth = month ?? getCurrentMonth();
        const state = get();

        const coachCourses = state.courses.filter((c) => {
          if (c.coachId !== coachId) return false;
          if (c.status === 'cancelled') return false;
          return c.date.startsWith(targetMonth);
        });

        const totalCourses = coachCourses.length;

        const completedCourses = coachCourses.filter(
          (c) => c.status === 'completed' || c.status === 'ongoing'
        );

        let consumedCourses = 0;
        const memberState = useMemberStore.getState();

        completedCourses.forEach((course) => {
          const courseBookings = memberState.bookings.filter(
            (b: Booking) => b.courseId === course.id && b.attendance === true
          );
          consumedCourses += courseBookings.length;
        });

        const totalCapacity = coachCourses.reduce((sum, c) => sum + c.capacity, 0);
        const consumptionRate =
          totalCapacity > 0
            ? Number(((consumedCourses / totalCapacity) * 100).toFixed(2))
            : 0;

        const stats: CoachStats = {
          coachId,
          month: targetMonth,
          totalCourses,
          consumedCourses,
          consumptionRate,
          avgSatisfaction: 4.5,
        };

        set({ stats });

        return stats;
      },
    }),
    {
      name: 'fitpro-coach-store',
    }
  )
);
