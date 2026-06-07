import type { Booking, Course, MemberLevel, MessageVoucher, User, UserRole, MessageType } from '../../types';
import { getDb, saveDb, generateId, ApiContext, ApiResponse, ok, fail } from '../db';
import { getDiscountRate } from '../../utils/price';

export interface CreateBookingBody {
  courseId: string;
}

function sendMessage(
  userId: string,
  role: UserRole,
  type: MessageType,
  title: string,
  content: string,
  relatedId?: string,
  relatedType?: 'booking' | 'course' | 'refund',
  voucher?: MessageVoucher
): void {
  const db = getDb();
  const newMsg = {
    id: generateId('msg_'),
    userId,
    role: role as UserRole,
    type,
    title,
    content,
    relatedId,
    relatedType,
    read: false,
    createdAt: new Date().toISOString(),
    hasVoucher: !!voucher,
    voucher,
  };
  db.messages.unshift(newMsg);
  saveDb(db);
}

function makeVoucher(type: 'booking' | 'refund' | 'attendance', id: string, amount?: number): MessageVoucher {
  const prefix = type === 'booking' ? 'BK' : type === 'refund' ? 'RF' : 'AT';
  return {
    type,
    bookingId: type === 'booking' || type === 'attendance' ? id : undefined,
    refundId: type === 'refund' ? id : undefined,
    amount,
    issuedAt: new Date().toISOString(),
    code: `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`,
  };
}

export function getBookings(ctx: ApiContext): ApiResponse<Booking[]> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId) {
    return fail<Booking[]>('未登录');
  }

  let result: Booking[] = [];

  if (currentUserRole === 'member') {
    result = db.bookings.filter((b) => b.memberId === currentUserId);
  } else if (currentUserRole === 'coach') {
    const coachCourseIds = db.courses.filter((c) => c.coachId === currentUserId).map((c) => c.id);
    result = db.bookings.filter((b) => coachCourseIds.includes(b.courseId));
  } else if (currentUserRole === 'manager' || currentUserRole === 'owner') {
    result = [...db.bookings];
  } else {
    return fail<Booking[]>('无权访问');
  }

  return ok(result);
}

export function createBooking(ctx: ApiContext, body: CreateBookingBody): ApiResponse<Booking | { waiting: boolean; position: number }> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId || currentUserRole !== 'member') {
    return fail('只有会员可以预约课程');
  }

  const course = db.courses.find((c) => c.id === body.courseId);
  if (!course) {
    return fail('课程不存在');
  }

  const alreadyBooked = db.bookings.some(
    (b) => b.courseId === body.courseId && b.memberId === currentUserId && b.status === 'booked'
  );
  if (alreadyBooked) {
    return fail('您已预约该课程');
  }

  const waitingQueue = db.waitingQueues.find((wq) => wq.courseId === body.courseId);
  const alreadyWaiting = waitingQueue?.members.some((m) => m.memberId === currentUserId);
  if (alreadyWaiting) {
    return fail('您已在该课程的候补队列中');
  }

  const user: User | undefined = db.users.find((u) => u.id === currentUserId);
  const level: MemberLevel = (user?.memberLevel || user?.level || 'normal') as MemberLevel;
  const discountRate = getDiscountRate(level);
  const actualPrice = Math.round(course.price * discountRate);

  if (course.bookedCount >= course.capacity) {
    if (waitingQueue) {
      waitingQueue.members.push({
        memberId: currentUserId,
        joinedAt: new Date().toISOString(),
      });
    } else {
      db.waitingQueues.push({
        courseId: body.courseId,
        members: [{ memberId: currentUserId, joinedAt: new Date().toISOString() }],
      });
    }
    saveDb(db);

    const updatedQueue = db.waitingQueues.find((wq) => wq.courseId === body.courseId);
    const position = updatedQueue?.members.findIndex((m) => m.memberId === currentUserId) ?? -1;

    sendMessage(
      currentUserId,
      'member',
      'booking_success',
      '候补排队中',
      `「${course.title}」课程已满员，您已进入候补队列，当前排位第${position + 1}位，有空位将自动补位。`,
      undefined,
      'course'
    );

    return ok({ waiting: true, position: position + 1 });
  }

  const booking: Booking = {
    id: generateId('b_'),
    memberId: currentUserId,
    courseId: body.courseId,
    status: 'booked',
    price: course.price,
    discountRate,
    actualPrice,
    bookedAt: new Date().toISOString(),
  };

  db.bookings.push(booking);

  const courseIdx = db.courses.findIndex((c) => c.id === body.courseId);
  if (courseIdx !== -1) {
    db.courses[courseIdx] = { ...db.courses[courseIdx], bookedCount: db.courses[courseIdx].bookedCount + 1 };
  }

  saveDb(db);

  const savedCourse = db.courses.find((c) => c.id === body.courseId)!;
  sendMessage(
    currentUserId,
    'member',
    'booking_success',
    '预约成功',
    `您已成功预约「${savedCourse.title}」课程，上课时间 ${savedCourse.date} ${savedCourse.startTime}-${savedCourse.endTime}，请准时到店。`,
    booking.id,
    'booking',
    makeVoucher('booking', booking.id, booking.actualPrice)
  );

  return ok(booking);
}

export function deleteBooking(ctx: ApiContext, bookingId: string): ApiResponse<{ promotedMemberId?: string }> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId) {
    return fail('未登录');
  }

  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    return fail('预约不存在');
  }

  if (currentUserRole === 'member' && booking.memberId !== currentUserId) {
    return fail('无权取消他人的预约');
  }

  if (booking.status !== 'booked') {
    return fail('只有已预约状态可以取消');
  }

  const course = db.courses.find((c) => c.id === booking.courseId);
  if (!course) {
    return fail('关联课程不存在');
  }

  const bookIdx = db.bookings.findIndex((b) => b.id === bookingId);
  db.bookings[bookIdx] = { ...booking, status: 'cancelled' };

  const courseIdx = db.courses.findIndex((c) => c.id === booking.courseId);
  if (courseIdx !== -1) {
    db.courses[courseIdx] = {
      ...db.courses[courseIdx],
      bookedCount: Math.max(0, db.courses[courseIdx].bookedCount - 1),
    };
  }

  saveDb(db);

  sendMessage(
    booking.memberId,
    'member',
    'refund_result',
    '取消预约成功',
    `您已成功取消「${course.title}」课程预约。`,
    course.id,
    'course'
  );

  let promotedMemberId: string | undefined;

  const wqIdx = db.waitingQueues.findIndex((wq) => wq.courseId === booking.courseId);
  if (wqIdx !== -1 && db.waitingQueues[wqIdx].members.length > 0) {
    const firstWaiting = db.waitingQueues[wqIdx].members[0];
    promotedMemberId = firstWaiting.memberId;

    db.waitingQueues[wqIdx] = {
      ...db.waitingQueues[wqIdx],
      members: db.waitingQueues[wqIdx].members.slice(1),
    };

    const promotedUser: User | undefined = db.users.find((u) => u.id === promotedMemberId);
    const promotedLevel: MemberLevel = (promotedUser?.memberLevel || promotedUser?.level || 'normal') as MemberLevel;
    const promotedDiscount = getDiscountRate(promotedLevel);
    const promotedActualPrice = Math.round(course.price * promotedDiscount);

    const promotedBooking: Booking = {
      id: generateId('b_'),
      memberId: promotedMemberId,
      courseId: booking.courseId,
      status: 'booked',
      price: course.price,
      discountRate: promotedDiscount,
      actualPrice: promotedActualPrice,
      bookedAt: new Date().toISOString(),
    };

    db.bookings.push(promotedBooking);

    const cIdx = db.courses.findIndex((c) => c.id === booking.courseId);
    if (cIdx !== -1) {
      db.courses[cIdx] = { ...db.courses[cIdx], bookedCount: db.courses[cIdx].bookedCount + 1 };
    }

    saveDb(db);

    const promotedCourse = db.courses.find((c) => c.id === booking.courseId)!;
    sendMessage(
      promotedMemberId,
      'member',
      'waiting_promoted',
      '候补补位成功',
      `恭喜您从候补队列中补位成功，已为您预约「${promotedCourse.title}」课程，时间：${promotedCourse.date} ${promotedCourse.startTime}-${promotedCourse.endTime}。`,
      promotedBooking.id,
      'booking',
      makeVoucher('booking', promotedBooking.id, promotedBooking.actualPrice)
    );
  }

  return ok({ promotedMemberId });
}
