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
  MessageVoucher,
} from '../types';
import { Database, saveDb, resetDb, generateId } from './db';
import { getDiscountRate, getDefaultPricingRules } from '../utils/price';

function todayISO(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeVoucher(
  type: 'booking' | 'refund' | 'attendance',
  id: string,
  amount?: number
): MessageVoucher {
  const prefix = type === 'booking' ? 'BK' : type === 'refund' ? 'RF' : 'AT';
  return {
    type,
    bookingId: type === 'booking' || type === 'attendance' ? id : undefined,
    refundId: type === 'refund' ? id : undefined,
    amount,
    issuedAt: todayISO(),
    code: `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`,
  };
}

export function seedStores(): Store[] {
  return [
    { id: 's1', name: 'FitPro 旗舰店', address: '南京路88号', city: '上海' },
    { id: 's2', name: 'FitPro 朝阳店', address: '朝阳路168号', city: '北京' },
    { id: 's3', name: 'FitPro 天河店', address: '天河路200号', city: '广州' },
    { id: 's4', name: 'FitPro 南山店', address: '科技园路50号', city: '深圳' },
  ];
}

export function seedCategories(): CourseCategory[] {
  return [
    { id: 'c1', name: '动感单车', icon: 'bike', description: '高强度有氧燃脂', basePrice: 88, color: '#FF5E1A' },
    { id: 'c2', name: '瑜伽', icon: 'flower2', description: '身心放松塑形', basePrice: 128, color: '#00C48C' },
    { id: 'c3', name: '力量训练', icon: 'dumbbell', description: '肌群强化训练', basePrice: 158, color: '#3B82F6' },
    { id: 'c4', name: 'HIIT', icon: 'flame', description: '高强度间歇训练', basePrice: 98, color: '#FF4757' },
    { id: 'c5', name: '普拉提', icon: 'activity', description: '核心控制力训练', basePrice: 148, color: '#A855F7' },
  ];
}

export function seedPricingRules(): PricingRule[] {
  return getDefaultPricingRules();
}

export function seedUsers(): User[] {
  return [
    { id: 'm1', role: 'member', name: '张小明', phone: '13800000001', password: '123456', storeId: 's1', memberLevel: 'gold', level: 'gold' },
    { id: 'm2', role: 'member', name: '李思思', phone: '13800000002', password: '123456', storeId: 's1', memberLevel: 'silver', level: 'silver' },
    { id: 'm3', role: 'member', name: '王大力', phone: '13800000003', password: '123456', storeId: 's2', memberLevel: 'diamond', level: 'diamond' },
    { id: 'm4', role: 'member', name: '赵小美', phone: '13800000004', password: '123456', storeId: 's3', memberLevel: 'normal', level: 'normal' },
    { id: 'm5', role: 'member', name: '刘强', phone: '13800000005', password: '123456', storeId: 's4', memberLevel: 'gold', level: 'gold' },
    { id: 'm6', role: 'member', name: '陈芳', phone: '13800000006', password: '123456', storeId: 's2', memberLevel: 'silver', level: 'silver' },
    { id: 'm7', role: 'member', name: '周杰', phone: '13800000007', password: '123456', storeId: 's3', memberLevel: 'normal', level: 'normal' },
    { id: 'coach1', role: 'coach', name: '陈教练', phone: '13900000001', password: '123456', storeId: 's1' },
    { id: 'coach2', role: 'coach', name: '林教练', phone: '13900000002', password: '123456', storeId: 's1' },
    { id: 'coach3', role: 'coach', name: '黄教练', phone: '13900000003', password: '123456', storeId: 's2' },
    { id: 'coach4', role: 'coach', name: '周教练', phone: '13900000004', password: '123456', storeId: 's3' },
    { id: 'coach5', role: 'coach', name: '吴教练', phone: '13900000005', password: '123456', storeId: 's4' },
    { id: 'manager1', role: 'manager', name: '运营经理-孙', phone: '13700000001', password: '123456' },
    { id: 'owner1', role: 'owner', name: '店长-钱', phone: '13600000001', password: '123456' },
  ];
}

export function seedCourses(): Course[] {
  return [
    {
      id: 'course1',
      categoryId: 'c1',
      coachId: 'coach1',
      storeId: 's1',
      title: '晨间燃脂动感单车',
      date: daysFromNow(1),
      startTime: '07:00',
      endTime: '08:00',
      capacity: 20,
      bookedCount: 15,
      price: 88,
      status: 'scheduled',
      description: '清晨高强度有氧训练，快速燃烧脂肪，开启活力一天。',
    },
    {
      id: 'course2',
      categoryId: 'c2',
      coachId: 'coach2',
      storeId: 's1',
      title: '午间舒缓瑜伽',
      date: daysFromNow(1),
      startTime: '12:30',
      endTime: '13:30',
      capacity: 15,
      bookedCount: 15,
      price: 128,
      status: 'scheduled',
      description: '工作间隙放松身心，舒缓肩颈压力，提升专注力。',
    },
    {
      id: 'course3',
      categoryId: 'c3',
      coachId: 'coach1',
      storeId: 's1',
      title: '下肢力量强化',
      date: daysFromNow(1),
      startTime: '18:30',
      endTime: '19:30',
      capacity: 12,
      bookedCount: 8,
      price: 158,
      status: 'scheduled',
      description: '深蹲、硬拉、箭步蹲，全方位打造强壮下肢。',
    },
    {
      id: 'course4',
      categoryId: 'c4',
      coachId: 'coach3',
      storeId: 's2',
      title: 'HIIT燃脂挑战',
      date: daysFromNow(2),
      startTime: '19:00',
      endTime: '20:00',
      capacity: 25,
      bookedCount: 20,
      price: 98,
      status: 'scheduled',
      description: '45分钟高强度间歇训练，挑战你的极限。',
    },
    {
      id: 'course5',
      categoryId: 'c5',
      coachId: 'coach4',
      storeId: 's3',
      title: '普拉提核心训练',
      date: daysFromNow(2),
      startTime: '10:00',
      endTime: '11:00',
      capacity: 10,
      bookedCount: 6,
      price: 148,
      status: 'scheduled',
      description: '强化核心肌群，改善体态，提升身体控制能力。',
    },
    {
      id: 'course6',
      categoryId: 'c2',
      coachId: 'coach5',
      storeId: 's4',
      title: '流瑜伽进阶',
      date: daysFromNow(3),
      startTime: '09:00',
      endTime: '10:30',
      capacity: 12,
      bookedCount: 5,
      price: 128,
      status: 'scheduled',
      description: '连贯体式流动，配合呼吸，深度拉伸与力量结合。',
    },
    {
      id: 'course7',
      categoryId: 'c3',
      coachId: 'coach2',
      storeId: 's1',
      title: '上肢力量训练',
      date: daysFromNow(0),
      startTime: '18:00',
      endTime: '19:00',
      capacity: 12,
      bookedCount: 10,
      price: 158,
      status: 'ongoing',
      description: '胸部、背部、手臂全方位训练。',
    },
    {
      id: 'course8',
      categoryId: 'c1',
      coachId: 'coach3',
      storeId: 's2',
      title: '动感单车竞速',
      date: daysFromNow(-1),
      startTime: '19:00',
      endTime: '20:00',
      capacity: 20,
      bookedCount: 18,
      price: 88,
      status: 'completed',
      description: '模拟山地竞速，高强度心肺训练。',
    },
    {
      id: 'course9',
      categoryId: 'c4',
      coachId: 'coach4',
      storeId: 's3',
      title: 'HIIT晨间特训',
      date: daysFromNow(4),
      startTime: '06:30',
      endTime: '07:15',
      capacity: 15,
      bookedCount: 3,
      price: 98,
      status: 'scheduled',
      description: '清晨快速唤醒身体代谢，高效燃脂。',
    },
    {
      id: 'course10',
      categoryId: 'c5',
      coachId: 'coach5',
      storeId: 's4',
      title: '产后恢复普拉提',
      date: daysFromNow(5),
      startTime: '14:00',
      endTime: '15:00',
      capacity: 8,
      bookedCount: 2,
      price: 148,
      status: 'scheduled',
      description: '专为产后妈妈设计，温和恢复盆底肌与核心。',
    },
  ];
}

function calcPrice(user: User, basePrice: number): { discountRate: number; actualPrice: number } {
  const level = (user.memberLevel || user.level || 'normal') as 'normal' | 'silver' | 'gold' | 'diamond';
  const discountRate = getDiscountRate(level);
  return { discountRate, actualPrice: Math.round(basePrice * discountRate) };
}

export function seedBookings(users: User[], courses: Course[]): Booking[] {
  const m1 = users.find((u) => u.id === 'm1')!;
  const m2 = users.find((u) => u.id === 'm2')!;
  const m3 = users.find((u) => u.id === 'm3')!;
  const m4 = users.find((u) => u.id === 'm4')!;
  const m5 = users.find((u) => u.id === 'm5')!;
  const m6 = users.find((u) => u.id === 'm6')!;

  const c1 = courses.find((c) => c.id === 'course1')!;
  const c2 = courses.find((c) => c.id === 'course2')!;
  const c3 = courses.find((c) => c.id === 'course3')!;
  const c4 = courses.find((c) => c.id === 'course4')!;
  const c5 = courses.find((c) => c.id === 'course5')!;
  const c7 = courses.find((c) => c.id === 'course7')!;
  const c8 = courses.find((c) => c.id === 'course8')!;

  const p1 = calcPrice(m1, c1.price);
  const p2 = calcPrice(m1, c3.price);
  const p3 = calcPrice(m2, c2.price);
  const p4 = calcPrice(m3, c4.price);
  const p5 = calcPrice(m4, c5.price);
  const p6 = calcPrice(m1, c8.price);
  const p7 = calcPrice(m5, c7.price);
  const p8 = calcPrice(m6, c4.price);

  return [
    {
      id: 'b1',
      memberId: 'm1',
      courseId: 'course1',
      status: 'booked',
      price: c1.price,
      discountRate: p1.discountRate,
      actualPrice: p1.actualPrice,
      bookedAt: daysFromNowISO(-2),
    },
    {
      id: 'b2',
      memberId: 'm1',
      courseId: 'course3',
      status: 'booked',
      price: c3.price,
      discountRate: p2.discountRate,
      actualPrice: p2.actualPrice,
      bookedAt: daysFromNowISO(-2),
    },
    {
      id: 'b3',
      memberId: 'm2',
      courseId: 'course2',
      status: 'waiting',
      price: c2.price,
      discountRate: p3.discountRate,
      actualPrice: p3.actualPrice,
      bookedAt: daysFromNowISO(-1),
    },
    {
      id: 'b4',
      memberId: 'm3',
      courseId: 'course4',
      status: 'booked',
      price: c4.price,
      discountRate: p4.discountRate,
      actualPrice: p4.actualPrice,
      bookedAt: daysFromNowISO(-1),
    },
    {
      id: 'b5',
      memberId: 'm4',
      courseId: 'course5',
      status: 'booked',
      price: c5.price,
      discountRate: p5.discountRate,
      actualPrice: p5.actualPrice,
      bookedAt: daysFromNowISO(-1),
    },
    {
      id: 'b6',
      memberId: 'm1',
      courseId: 'course8',
      status: 'completed',
      price: c8.price,
      discountRate: p6.discountRate,
      actualPrice: p6.actualPrice,
      bookedAt: daysFromNowISO(-3),
      attendance: true,
      trainingReport: '本节课完成度良好，心率保持在燃脂区间，建议下次增加阻力档位。',
    },
    {
      id: 'b7',
      memberId: 'm5',
      courseId: 'course7',
      status: 'booked',
      price: c7.price,
      discountRate: p7.discountRate,
      actualPrice: p7.actualPrice,
      bookedAt: daysFromNowISO(-1),
    },
    {
      id: 'b8',
      memberId: 'm6',
      courseId: 'course4',
      status: 'booked',
      price: c4.price,
      discountRate: p8.discountRate,
      actualPrice: p8.actualPrice,
      bookedAt: daysFromNowISO(-1),
    },
  ];
}

export function seedWaitingQueues(): WaitingQueue[] {
  return [
    {
      courseId: 'course2',
      members: [
        { memberId: 'm1', joinedAt: daysFromNowISO(-2) },
        { memberId: 'm2', joinedAt: daysFromNowISO(-1) },
        { memberId: 'm6', joinedAt: daysFromNowISO(-0.5) },
      ],
    },
    {
      courseId: 'course4',
      members: [
        { memberId: 'm7', joinedAt: daysFromNowISO(-0.5) },
      ],
    },
  ];
}

export function seedRefundRequests(bookings: Booking[]): RefundRequest[] {
  const b1 = bookings.find((b) => b.id === 'b1')!;
  const b2 = bookings.find((b) => b.id === 'b2')!;

  return [
    {
      id: 'r1',
      bookingId: 'b1',
      memberId: 'm1',
      totalSessions: 20,
      completedSessions: 5,
      refundRatio: 0.75,
      paidAmount: b1.actualPrice * 20,
      refundAmount: Math.round(b1.actualPrice * 20 * 0.75),
      status: 'pending',
      reason: '工作调动，无法继续上课',
      createdAt: daysFromNowISO(-6),
    },
    {
      id: 'r2',
      bookingId: 'b2',
      memberId: 'm2',
      totalSessions: 12,
      completedSessions: 2,
      refundRatio: 0.83,
      paidAmount: b2.actualPrice * 12,
      refundAmount: Math.round(b2.actualPrice * 12 * 0.83),
      status: 'pending',
      reason: '身体原因，医生建议休息',
      createdAt: daysFromNowISO(-4),
    },
    {
      id: 'r3',
      bookingId: 'b6',
      memberId: 'm1',
      totalSessions: 10,
      completedSessions: 3,
      refundRatio: 0.7,
      paidAmount: 1599,
      refundAmount: 1119,
      status: 'approved',
      reason: '搬家距离太远',
      createdAt: daysFromNowISO(-15),
      reviewedAt: daysFromNowISO(-12),
      reviewerId: 'manager1',
    },
  ];
}

export function seedMessages(bookings: Booking[], refundRequests: RefundRequest[], courses: Course[]): Message[] {
  const b1 = bookings.find((b) => b.id === 'b1')!;
  const b4 = bookings.find((b) => b.id === 'b4')!;
  const b6 = bookings.find((b) => b.id === 'b6')!;
  const r1 = refundRequests.find((r) => r.id === 'r1')!;
  const c3 = courses.find((c) => c.id === 'course3')!;

  return [
    {
      id: 'msg1',
      userId: 'm1',
      role: 'member',
      type: 'booking_success',
      title: '预约成功',
      content: `您已成功预约「晨间燃脂动感单车」课程，上课时间 ${c3.date} 07:00-08:00，请准时到店。`,
      relatedId: 'b1',
      relatedType: 'booking',
      read: false,
      createdAt: daysFromNowISO(-2),
      hasVoucher: true,
      voucher: makeVoucher('booking', b1.id, b1.actualPrice),
    },
    {
      id: 'msg2',
      userId: 'm1',
      role: 'member',
      type: 'course_reminder',
      title: '课程提醒',
      content: '您预约的「下肢力量强化」课程将在2小时后开始，请提前15分钟到店热身。',
      relatedId: 'course3',
      relatedType: 'course',
      read: false,
      createdAt: daysFromNowISO(-0.1),
      hasVoucher: false,
    },
    {
      id: 'msg3',
      userId: 'm2',
      role: 'member',
      type: 'booking_success',
      title: '候补排队中',
      content: '「午间舒缓瑜伽」课程已满员，您已进入候补队列，当前排位第2位，有空位将自动补位。',
      relatedId: 'b3',
      relatedType: 'booking',
      read: true,
      createdAt: daysFromNowISO(-1),
      hasVoucher: false,
    },
    {
      id: 'msg4',
      userId: 'm1',
      role: 'member',
      type: 'attendance_record',
      title: '出勤记录已生成',
      content: '您的「动感单车竞速」课程出勤已记录，教练已上传训练报告，请查收。',
      relatedId: 'b6',
      relatedType: 'booking',
      read: true,
      createdAt: daysFromNowISO(-0.9),
      hasVoucher: true,
      voucher: {
        type: 'attendance',
        bookingId: 'b6',
        issuedAt: daysFromNowISO(-0.9),
        code: 'AT20260606001',
      },
    },
    {
      id: 'msg5',
      userId: 'm3',
      role: 'member',
      type: 'booking_success',
      title: '预约成功',
      content: '您已成功预约「HIIT燃脂挑战」课程，上课时间请查看课程详情。',
      relatedId: 'b4',
      relatedType: 'booking',
      read: false,
      createdAt: daysFromNowISO(-1),
      hasVoucher: true,
      voucher: makeVoucher('booking', b4.id, b4.actualPrice),
    },
    {
      id: 'msg6',
      userId: 'manager1',
      role: 'manager',
      type: 'refund_request',
      title: '新退款申请待审批',
      content: `会员张小明提交了退款申请，金额 ¥${r1.refundAmount}，请及时处理。`,
      relatedId: 'r1',
      relatedType: 'refund',
      read: false,
      createdAt: daysFromNowISO(-0.5),
      hasVoucher: false,
    },
    {
      id: 'msg7',
      userId: 'coach1',
      role: 'coach',
      type: 'course_reminder',
      title: '课程即将开始',
      content: '您的「下肢力量强化」课程将在今天 18:30 开始，请提前准备。',
      relatedId: 'course3',
      relatedType: 'course',
      read: false,
      createdAt: daysFromNowISO(-0.2),
      hasVoucher: false,
    },
    {
      id: 'msg8',
      userId: 'owner1',
      role: 'owner',
      type: 'attendance_record',
      title: '月度运营数据已更新',
      content: '6月门店运营数据看板已更新，请注意查看。',
      read: false,
      createdAt: daysFromNowISO(-0.8),
      hasVoucher: false,
    },
    {
      id: 'msg9',
      userId: 'm1',
      role: 'member',
      type: 'refund_request',
      title: '退款申请已提交',
      content: `您已提交退款申请，应退金额 ¥${r1.refundAmount}，请等待运营审核。`,
      relatedId: 'r1',
      relatedType: 'refund',
      read: true,
      createdAt: daysFromNowISO(-6),
      hasVoucher: false,
    },
    {
      id: 'msg10',
      userId: 'm6',
      role: 'member',
      type: 'waiting_promoted',
      title: '候补补位成功',
      content: '恭喜您从候补队列中补位成功，已为您预约课程。',
      relatedId: 'b8',
      relatedType: 'booking',
      read: false,
      createdAt: daysFromNowISO(-0.3),
      hasVoucher: true,
      voucher: makeVoucher('booking', 'b8'),
    },
  ];
}

export function seedCoachStats(): CoachStats[] {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return [
    {
      coachId: 'coach1',
      month: currentMonth,
      totalCourses: 48,
      consumedCourses: 45,
      consumptionRate: 93.75,
      avgSatisfaction: 4.9,
    },
    {
      coachId: 'coach2',
      month: currentMonth,
      totalCourses: 52,
      consumedCourses: 48,
      consumptionRate: 92.31,
      avgSatisfaction: 4.8,
    },
    {
      coachId: 'coach3',
      month: currentMonth,
      totalCourses: 40,
      consumedCourses: 36,
      consumptionRate: 90.0,
      avgSatisfaction: 4.7,
    },
    {
      coachId: 'coach4',
      month: currentMonth,
      totalCourses: 35,
      consumedCourses: 30,
      consumptionRate: 85.71,
      avgSatisfaction: 4.6,
    },
    {
      coachId: 'coach5',
      month: currentMonth,
      totalCourses: 30,
      consumedCourses: 25,
      consumptionRate: 83.33,
      avgSatisfaction: 4.5,
    },
  ];
}

export function seedStoreMetrics(): StoreMetrics[] {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return [
    {
      storeId: 's1',
      month: currentMonth,
      bookingRate: 87.5,
      churnRate: 3.2,
      avgSatisfaction: 4.7,
      totalRevenue: 128500,
      activeMembers: 856,
    },
    {
      storeId: 's2',
      month: currentMonth,
      bookingRate: 82.3,
      churnRate: 4.1,
      avgSatisfaction: 4.5,
      totalRevenue: 98700,
      activeMembers: 642,
    },
    {
      storeId: 's3',
      month: currentMonth,
      bookingRate: 90.1,
      churnRate: 2.8,
      avgSatisfaction: 4.8,
      totalRevenue: 156300,
      activeMembers: 1023,
    },
    {
      storeId: 's4',
      month: currentMonth,
      bookingRate: 78.6,
      churnRate: 5.2,
      avgSatisfaction: 4.3,
      totalRevenue: 76800,
      activeMembers: 512,
    },
  ];
}

export function buildSeedDatabase(): Database {
  const stores = seedStores();
  const categories = seedCategories();
  const pricingRules = seedPricingRules();
  const users = seedUsers();
  const courses = seedCourses();
  const bookings = seedBookings(users, courses);
  const waitingQueues = seedWaitingQueues();
  const refundRequests = seedRefundRequests(bookings);
  const messages = seedMessages(bookings, refundRequests, courses);
  const coachStats = seedCoachStats();
  const storeMetrics = seedStoreMetrics();

  return {
    users,
    stores,
    categories,
    pricingRules,
    courses,
    bookings,
    waitingQueues,
    refundRequests,
    messages,
    coachStats,
    storeMetrics,
  };
}

export function runSeed(force: boolean = false): Database {
  if (!force) {
    const { isDbEmpty } = require('./db') as typeof import('./db');
    if (!isDbEmpty()) {
      return (require('./db') as typeof import('./db')).getDb();
    }
  }

  resetDb();
  const db = buildSeedDatabase();
  saveDb(db);
  return db;
}
