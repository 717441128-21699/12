export type UserRole = 'member' | 'coach' | 'manager' | 'owner';

export type MemberLevel = 'normal' | 'silver' | 'gold' | 'diamond';

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

export interface UserRow {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  password_hash: string;
  store_id: string | null;
  member_level: MemberLevel | null;
  created_at: string;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  storeId?: string;
  memberLevel?: MemberLevel;
  createdAt: string;
}

export interface JwtPayload {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  storeId?: string;
  memberLevel?: MemberLevel;
}

export interface CourseRow {
  id: string;
  category_id: string;
  coach_id: string;
  store_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  price: number;
  status: CourseStatus;
  description: string | null;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  description: string;
  base_price: number;
  color: string;
}

export interface BookingRow {
  id: string;
  member_id: string;
  course_id: string;
  status: BookingStatus;
  price: number;
  discount_rate: number;
  actual_price: number;
  attendance: number | null;
  training_report: string | null;
  booked_at: string;
}

export interface WaitingQueueRow {
  id: string;
  course_id: string;
  member_id: string;
  position: number;
  joined_at: string;
}

export interface RefundRow {
  id: string;
  booking_id: string;
  member_id: string;
  total_sessions: number;
  completed_sessions: number;
  refund_ratio: number;
  paid_amount: number;
  refund_amount: number;
  status: RefundStatus;
  reason: string;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
}

export interface MessageRow {
  id: string;
  user_id: string;
  role: UserRole;
  type: MessageType;
  title: string;
  content: string;
  related_id: string | null;
  related_type: string | null;
  has_voucher: number;
  voucher_data: string | null;
  read: number;
  created_at: string;
}

export interface StoreRow {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface PricingRuleRow {
  id: string;
  level: MemberLevel;
  level_name: string;
  discount_rate: number;
  single_price: number;
  monthly_price: number;
  quarterly_price: number;
  yearly_price: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
