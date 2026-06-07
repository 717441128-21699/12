import apiClient from './client';
import type {
  User,
  UserRole,
  MemberLevel,
  Course,
  CourseCategory,
  Booking,
  WaitingQueue,
  RefundRequest,
  RefundStatus,
  Message,
  MessageType,
  PricingRule,
  Store,
  StoreMetrics,
  CoachStats,
  CourseStatus,
  MemberBodyData,
  TrainingPlan,
  DietPlan,
} from '../types';

interface SafeUser extends Omit<User, 'password'> {}

interface AuthResponse {
  token: string;
  user: SafeUser;
}

interface LoginParams {
  role: UserRole;
  phone: string;
  password: string;
}

interface RegisterParams {
  name: string;
  phone: string;
  password: string;
  storeId?: string;
  memberLevel?: MemberLevel;
}

interface CreateCourseParams {
  categoryId: string;
  storeId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price: number;
  description?: string;
}

interface UpdateCourseParams {
  categoryId?: string;
  storeId?: string;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  price?: number;
  status?: CourseStatus;
  description?: string;
}

interface CheckInItem {
  bookingId: string;
  attended: boolean;
}

interface CheckInResponse {
  message: string;
  results: { bookingId: string; success: boolean; error?: string }[];
}

interface UploadReportParams {
  bookingId: string;
  report: string;
}

interface CreateBookingParams {
  courseId: string;
}

interface BookingWaitResponse {
  waiting: boolean;
  position: number;
}

interface CreateRefundParams {
  bookingId: string;
  totalSessions: number;
  completedSessions: number;
  reason: string;
}

interface RejectRefundParams {
  reason: string;
}

interface CourseWithDetails extends Course {
  coach?: { id: string; name: string; phone: string };
  category?: { id: string; name: string; icon: string; color: string };
  store?: { id: string; name: string; address: string; city: string };
}

interface WaitingQueueWithPosition extends WaitingQueue {
  myPosition?: number;
}

interface CoachRanking {
  coachId: string;
  coachName: string;
  avgSatisfaction: number;
  consumptionRate: number;
  totalCourses: number;
}

export const auth = {
  login: (params: LoginParams): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/login', params),

  register: (params: RegisterParams): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/register', params),

  me: (): Promise<SafeUser> => apiClient.get<SafeUser>('/auth/me'),
};

export const courses = {
  list: (params?: { date?: string; category?: string; coach?: string; store?: string }): Promise<CourseWithDetails[]> =>
    apiClient.get<CourseWithDetails[]>('/courses', params),

  get: (id: string): Promise<CourseWithDetails> =>
    apiClient.get<CourseWithDetails>(`/courses/${id}`),

  create: (params: CreateCourseParams): Promise<CourseWithDetails> =>
    apiClient.post<CourseWithDetails>('/courses', params),

  update: (id: string, params: UpdateCourseParams): Promise<CourseWithDetails> =>
    apiClient.put<CourseWithDetails>(`/courses/${id}`, params),

  delete: (id: string): Promise<CourseWithDetails | { message: string; course: CourseWithDetails }> =>
    apiClient.delete<CourseWithDetails | { message: string; course: CourseWithDetails }>(`/courses/${id}`),

  checkIn: (id: string, attendance: CheckInItem[]): Promise<CheckInResponse> =>
    apiClient.post<CheckInResponse>(`/courses/${id}/check-in`, { attendance }),

  uploadReport: (id: string, params: UploadReportParams): Promise<{ message: string; booking: Booking }> =>
    apiClient.post<{ message: string; booking: Booking }>(`/courses/${id}/report`, params),
};

export const bookings = {
  list: (): Promise<Booking[]> => apiClient.get<Booking[]>('/bookings'),

  create: (params: CreateBookingParams): Promise<Booking | BookingWaitResponse> =>
    apiClient.post<Booking | BookingWaitResponse>('/bookings', params),

  cancel: (id: string): Promise<{ promotedMemberId?: string }> =>
    apiClient.delete<{ promotedMemberId?: string }>(`/bookings/${id}`),
};

export const waiting = {
  list: (): Promise<WaitingQueueWithPosition[]> =>
    apiClient.get<WaitingQueueWithPosition[]>('/waiting'),

  leave: (courseId: string): Promise<{ removed: boolean; position: number }> =>
    apiClient.delete<{ removed: boolean; position: number }>(`/waiting/${courseId}`),
};

export const refunds = {
  list: (params?: { status?: string }): Promise<RefundRequest[]> =>
    apiClient.get<RefundRequest[]>('/refunds', params),

  create: (params: CreateRefundParams): Promise<RefundRequest> =>
    apiClient.post<RefundRequest>('/refunds', params),

  approve: (id: string): Promise<RefundRequest> =>
    apiClient.post<RefundRequest>(`/refunds/${id}/approve`),

  reject: (id: string, params: RejectRefundParams): Promise<RefundRequest> =>
    apiClient.post<RefundRequest>(`/refunds/${id}/reject`, params),
};

export const messages = {
  list: (params?: { type?: MessageType }): Promise<Message[]> =>
    apiClient.get<Message[]>('/messages', params),

  markRead: (id: string): Promise<Message> =>
    apiClient.post<Message>(`/messages/${id}/read`),

  markAllRead: (): Promise<{ updated: number }> =>
    apiClient.post<{ updated: number }>('/messages/read-all'),

  unreadCount: (): Promise<{ count: number }> =>
    apiClient.get<{ count: number }>('/messages/unread-count'),
};

export const categories = {
  list: (): Promise<CourseCategory[]> => apiClient.get<CourseCategory[]>('/categories'),

  create: (params: Omit<CourseCategory, 'id'>): Promise<CourseCategory> =>
    apiClient.post<CourseCategory>('/categories', params),

  update: (id: string, params: Partial<Omit<CourseCategory, 'id'>>): Promise<CourseCategory> =>
    apiClient.put<CourseCategory>(`/categories/${id}`, params),

  delete: (id: string): Promise<CourseCategory> =>
    apiClient.delete<CourseCategory>(`/categories/${id}`),
};

export const pricing = {
  list: (): Promise<PricingRule[]> => apiClient.get<PricingRule[]>('/pricing'),

  update: (rules: PricingRule[]): Promise<PricingRule[]> =>
    apiClient.put<PricingRule[]>('/pricing', { rules }),
};

export const stores = {
  list: (): Promise<Store[]> => apiClient.get<Store[]>('/stores'),

  metrics: (id: string, params?: { month?: string }): Promise<StoreMetrics | StoreMetrics[]> =>
    apiClient.get<StoreMetrics | StoreMetrics[]>(`/stores/${id}/metrics`, params),
};

export const stats = {
  coach: (coachId: string, params?: { month?: string }): Promise<CoachStats> =>
    apiClient.get<CoachStats>(`/stats/coach/${coachId}`, params),

  rankCoaches: (): Promise<CoachRanking[]> =>
    apiClient.get<CoachRanking[]>('/stats/coaches/ranking'),

  export: (params?: { month?: string; format?: 'csv' }): Promise<string> =>
    apiClient.get<string>('/stats/export', params),
};

export const member = {
  bodyData: (): Promise<MemberBodyData> =>
    apiClient.get<MemberBodyData>('/member/body-data'),

  trainingPlan: (): Promise<TrainingPlan> =>
    apiClient.get<TrainingPlan>('/member/training-plan'),

  dietPlan: (): Promise<DietPlan> =>
    apiClient.get<DietPlan>('/member/diet-plan'),
};

export const endpoints = {
  auth,
  courses,
  bookings,
  waiting,
  refunds,
  messages,
  categories,
  pricing,
  stores,
  stats,
  member,
};

export default endpoints;
