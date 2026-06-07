export type UserRole = 'member' | 'coach' | 'manager' | 'owner';

export type MemberLevel = 'normal' | 'silver' | 'gold' | 'diamond';

export type TrainingGoal = 'lose_fat' | 'muscle_gain' | 'shaping' | 'rehabilitation';

export type CourseStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export type BookingStatus = 'booked' | 'waiting' | 'cancelled' | 'completed' | 'refunded';

export type RefundStatus = 'pending' | 'approved' | 'rejected';

export type MessageType =
  | 'booking_success'
  | 'waiting_promoted'
  | 'course_reminder'
  | 'refund_request'
  | 'refund_result'
  | 'attendance_record';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  password: string;
  avatar?: string;
  storeId?: string;
  memberLevel?: MemberLevel;
  level?: MemberLevel;
}

export interface MemberBodyData {
  memberId: string;
  height: number;
  weight: number;
  bodyFat: number;
  age: number;
  gender: 'male' | 'female';
  goal: TrainingGoal;
  bmi: number;
  bmr: number;
}

export interface TrainingPlan {
  id: string;
  memberId: string;
  weeks: TrainingWeek[];
  createdAt: string;
}

export interface TrainingWeek {
  week: number;
  days: TrainingDay[];
}

export interface TrainingDay {
  day: string;
  focus: string;
  exercises: TrainingExercise[];
}

export interface TrainingExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
}

export interface DietPlan {
  id: string;
  memberId: string;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: DietMeal[];
}

export interface DietMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  items: string[];
}

export interface CourseCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  basePrice: number;
  color: string;
}

export interface Course {
  id: string;
  categoryId: string;
  coachId: string;
  storeId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  price: number;
  status: CourseStatus;
  description?: string;
}

export interface WaitingQueue {
  courseId: string;
  members: { memberId: string; joinedAt: string }[];
}

export interface Booking {
  id: string;
  memberId: string;
  courseId: string;
  status: BookingStatus;
  price: number;
  discountRate: number;
  actualPrice: number;
  bookedAt: string;
  attendance?: boolean;
  trainingReport?: string;
}

export interface RefundRequest {
  id: string;
  bookingId: string;
  memberId: string;
  totalSessions: number;
  completedSessions: number;
  refundRatio: number;
  paidAmount: number;
  refundAmount: number;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  reviewedAt?: string;
  reviewerId?: string;
}

export interface PricingRule {
  level: MemberLevel;
  levelName: string;
  discountRate: number;
  singlePrice: number;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface CoachStats {
  coachId: string;
  month: string;
  totalCourses: number;
  consumedCourses: number;
  consumptionRate: number;
  avgSatisfaction: number;
}

export interface StoreMetrics {
  storeId: string;
  month: string;
  bookingRate: number;
  churnRate: number;
  avgSatisfaction: number;
  totalRevenue: number;
  activeMembers: number;
}

export interface MessageVoucher {
  type: 'booking' | 'refund' | 'attendance';
  bookingId?: string;
  refundId?: string;
  amount?: number;
  issuedAt: string;
  code: string;
}

export interface Message {
  id: string;
  userId: string;
  role: UserRole;
  type: MessageType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: 'booking' | 'course' | 'refund';
  read: boolean;
  createdAt: string;
  hasVoucher: boolean;
  voucher?: MessageVoucher;
}
