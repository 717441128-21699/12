import bcrypt from 'bcryptjs';
import db from './db';

function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

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

function getDiscountRate(level: string): number {
  const rates: Record<string, number> = {
    normal: 1,
    silver: 0.9,
    gold: 0.8,
    diamond: 0.65,
  };
  return rates[level] || 1;
}

export async function initSeedData(): Promise<void> {
  const storesCount = (db.prepare('SELECT COUNT(*) as count FROM stores').get() as { count: number }).count;
  const categoriesCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count;
  const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;

  if (storesCount > 0 && categoriesCount > 0 && usersCount > 0) {
    console.log('[seed] 数据库已存在数据，跳过初始化');
    return;
  }

  console.log('[seed] 开始初始化演示数据...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  const insertStore = db.prepare(
    'INSERT INTO stores (id, name, address, city) VALUES (?, ?, ?, ?)'
  );
  const insertUser = db.prepare(
    'INSERT INTO users (id, role, name, phone, password_hash, store_id, member_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCategory = db.prepare(
    'INSERT INTO categories (id, name, icon, description, base_price, color) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertPricingRule = db.prepare(
    'INSERT INTO pricing_rules (id, level, level_name, discount_rate, single_price, monthly_price, quarterly_price, yearly_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCourse = db.prepare(
    'INSERT INTO courses (id, category_id, coach_id, store_id, title, date, start_time, end_time, capacity, booked_count, price, status, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertBooking = db.prepare(
    'INSERT INTO bookings (id, member_id, course_id, status, price, discount_rate, actual_price, attendance, training_report, booked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertWaiting = db.prepare(
    'INSERT INTO waiting_queue (id, course_id, member_id, position, joined_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertRefund = db.prepare(
    'INSERT INTO refunds (id, booking_id, member_id, total_sessions, completed_sessions, refund_ratio, paid_amount, refund_amount, status, reason, created_at, reviewed_at, reviewer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMessage = db.prepare(
    'INSERT INTO messages (id, user_id, role, type, title, content, related_id, related_type, has_voucher, voucher_data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    const stores = [
      { id: 's1', name: 'FitPro 旗舰店', address: '南京路88号', city: '上海' },
      { id: 's2', name: 'FitPro 朝阳店', address: '朝阳路168号', city: '北京' },
      { id: 's3', name: 'FitPro 天河店', address: '天河路200号', city: '广州' },
      { id: 's4', name: 'FitPro 南山店', address: '科技园路50号', city: '深圳' },
    ];
    for (const s of stores) insertStore.run(s.id, s.name, s.address, s.city);

    const categories = [
      { id: 'c1', name: '动感单车', icon: 'bike', description: '高强度有氧燃脂', basePrice: 88, color: '#FF5E1A' },
      { id: 'c2', name: '瑜伽', icon: 'flower2', description: '身心放松塑形', basePrice: 128, color: '#00C48C' },
      { id: 'c3', name: '力量训练', icon: 'dumbbell', description: '肌群强化训练', basePrice: 158, color: '#3B82F6' },
      { id: 'c4', name: 'HIIT', icon: 'flame', description: '高强度间歇训练', basePrice: 98, color: '#FF4757' },
      { id: 'c5', name: '普拉提', icon: 'activity', description: '核心控制力训练', basePrice: 148, color: '#A855F7' },
    ];
    for (const c of categories) insertCategory.run(c.id, c.name, c.icon, c.description, c.basePrice, c.color);

    const pricingRules = [
      { id: 'pr1', level: 'normal', levelName: '普通会员', discountRate: 1, singlePrice: 0, monthlyPrice: 399, quarterlyPrice: 999, yearlyPrice: 3599 },
      { id: 'pr2', level: 'silver', levelName: '银卡会员', discountRate: 0.9, singlePrice: 0, monthlyPrice: 599, quarterlyPrice: 1499, yearlyPrice: 5399 },
      { id: 'pr3', level: 'gold', levelName: '金卡会员', discountRate: 0.8, singlePrice: 0, monthlyPrice: 899, quarterlyPrice: 2299, yearlyPrice: 8199 },
      { id: 'pr4', level: 'diamond', levelName: '钻石会员', discountRate: 0.65, singlePrice: 0, monthlyPrice: 1499, quarterlyPrice: 3899, yearlyPrice: 13999 },
    ];
    for (const p of pricingRules) insertPricingRule.run(p.id, p.level, p.levelName, p.discountRate, p.singlePrice, p.monthlyPrice, p.quarterlyPrice, p.yearlyPrice);

    const users = [
      { id: 'm1', role: 'member', name: '张小明', phone: '13800000001', storeId: 's1', memberLevel: 'gold' },
      { id: 'm2', role: 'member', name: '李思思', phone: '13800000002', storeId: 's1', memberLevel: 'silver' },
      { id: 'm3', role: 'member', name: '王大力', phone: '13800000003', storeId: 's2', memberLevel: 'diamond' },
      { id: 'm4', role: 'member', name: '赵小美', phone: '13800000004', storeId: 's3', memberLevel: 'normal' },
      { id: 'm5', role: 'member', name: '刘强', phone: '13800000005', storeId: 's4', memberLevel: 'gold' },
      { id: 'm6', role: 'member', name: '陈芳', phone: '13800000006', storeId: 's2', memberLevel: 'silver' },
      { id: 'm7', role: 'member', name: '周杰', phone: '13800000007', storeId: 's3', memberLevel: 'normal' },
      { id: 'coach1', role: 'coach', name: '陈教练', phone: '13900000001', storeId: 's1', memberLevel: null },
      { id: 'coach2', role: 'coach', name: '林教练', phone: '13900000002', storeId: 's1', memberLevel: null },
      { id: 'coach3', role: 'coach', name: '黄教练', phone: '13900000003', storeId: 's2', memberLevel: null },
      { id: 'manager1', role: 'manager', name: '运营经理-孙', phone: '13700000001', storeId: null, memberLevel: null },
      { id: 'owner1', role: 'owner', name: '店长-钱', phone: '13600000001', storeId: null, memberLevel: null },
    ];
    for (const u of users) insertUser.run(u.id, u.role, u.name, u.phone, hashedPassword, u.storeId, u.memberLevel, todayISO());

    const courses = [
      { id: 'course1', categoryId: 'c1', coachId: 'coach1', storeId: 's1', title: '晨间燃脂动感单车', date: daysFromNow(1), startTime: '07:00', endTime: '08:00', capacity: 20, bookedCount: 15, price: 88, status: 'scheduled', description: '清晨高强度有氧训练，快速燃烧脂肪，开启活力一天。' },
      { id: 'course2', categoryId: 'c2', coachId: 'coach2', storeId: 's1', title: '午间舒缓瑜伽', date: daysFromNow(1), startTime: '12:30', endTime: '13:30', capacity: 15, bookedCount: 15, price: 128, status: 'scheduled', description: '工作间隙放松身心，舒缓肩颈压力，提升专注力。' },
      { id: 'course3', categoryId: 'c3', coachId: 'coach1', storeId: 's1', title: '下肢力量强化', date: daysFromNow(1), startTime: '18:30', endTime: '19:30', capacity: 12, bookedCount: 8, price: 158, status: 'scheduled', description: '深蹲、硬拉、箭步蹲，全方位打造强壮下肢。' },
      { id: 'course4', categoryId: 'c4', coachId: 'coach3', storeId: 's2', title: 'HIIT燃脂挑战', date: daysFromNow(2), startTime: '19:00', endTime: '20:00', capacity: 25, bookedCount: 20, price: 98, status: 'scheduled', description: '45分钟高强度间歇训练，挑战你的极限。' },
      { id: 'course5', categoryId: 'c5', coachId: 'coach2', storeId: 's3', title: '普拉提核心训练', date: daysFromNow(2), startTime: '10:00', endTime: '11:00', capacity: 10, bookedCount: 6, price: 148, status: 'scheduled', description: '强化核心肌群，改善体态，提升身体控制能力。' },
      { id: 'course6', categoryId: 'c2', coachId: 'coach3', storeId: 's4', title: '流瑜伽进阶', date: daysFromNow(3), startTime: '09:00', endTime: '10:30', capacity: 12, bookedCount: 5, price: 128, status: 'scheduled', description: '连贯体式流动，配合呼吸，深度拉伸与力量结合。' },
      { id: 'course7', categoryId: 'c3', coachId: 'coach2', storeId: 's1', title: '上肢力量训练', date: daysFromNow(0), startTime: '18:00', endTime: '19:00', capacity: 12, bookedCount: 10, price: 158, status: 'ongoing', description: '胸部、背部、手臂全方位训练。' },
      { id: 'course8', categoryId: 'c1', coachId: 'coach3', storeId: 's2', title: '动感单车竞速', date: daysFromNow(-1), startTime: '19:00', endTime: '20:00', capacity: 20, bookedCount: 18, price: 88, status: 'completed', description: '模拟山地竞速，高强度心肺训练。' },
    ];
    for (const c of courses) insertCourse.run(c.id, c.categoryId, c.coachId, c.storeId, c.title, c.date, c.startTime, c.endTime, c.capacity, c.bookedCount, c.price, c.status, c.description, todayISO());

    function calcPrice(userId: string, basePrice: number): { discountRate: number; actualPrice: number } {
      const user = users.find((u) => u.id === userId);
      const level = user?.memberLevel || 'normal';
      const discountRate = getDiscountRate(level);
      return { discountRate, actualPrice: Math.round(basePrice * discountRate) };
    }

    const c1 = courses.find((c) => c.id === 'course1')!;
    const c2 = courses.find((c) => c.id === 'course2')!;
    const c3 = courses.find((c) => c.id === 'course3')!;
    const c4 = courses.find((c) => c.id === 'course4')!;
    const c5 = courses.find((c) => c.id === 'course5')!;
    const c7 = courses.find((c) => c.id === 'course7')!;
    const c8 = courses.find((c) => c.id === 'course8')!;

    const p1 = calcPrice('m1', c1.price);
    const p2 = calcPrice('m1', c3.price);
    const p3 = calcPrice('m2', c2.price);
    const p4 = calcPrice('m3', c4.price);
    const p5 = calcPrice('m4', c5.price);
    const p6 = calcPrice('m1', c8.price);
    const p7 = calcPrice('m5', c7.price);
    const p8 = calcPrice('m6', c4.price);

    const bookings = [
      { id: 'b1', memberId: 'm1', courseId: 'course1', status: 'booked', price: c1.price, discountRate: p1.discountRate, actualPrice: p1.actualPrice, attendance: null, trainingReport: null, bookedAt: daysFromNowISO(-2) },
      { id: 'b2', memberId: 'm1', courseId: 'course3', status: 'booked', price: c3.price, discountRate: p2.discountRate, actualPrice: p2.actualPrice, attendance: null, trainingReport: null, bookedAt: daysFromNowISO(-2) },
      { id: 'b3', memberId: 'm2', courseId: 'course2', status: 'waiting', price: c2.price, discountRate: p3.discountRate, actualPrice: p3.actualPrice, attendance: null, trainingReport: null, bookedAt: daysFromNowISO(-1) },
      { id: 'b4', memberId: 'm3', courseId: 'course4', status: 'booked', price: c4.price, discountRate: p4.discountRate, actualPrice: p4.actualPrice, attendance: null, trainingReport: null, bookedAt: daysFromNowISO(-1) },
      { id: 'b5', memberId: 'm4', courseId: 'course5', status: 'booked', price: c5.price, discountRate: p5.discountRate, actualPrice: p5.actualPrice, attendance: null, trainingReport: null, bookedAt: daysFromNowISO(-1) },
      { id: 'b6', memberId: 'm1', courseId: 'course8', status: 'completed', price: c8.price, discountRate: p6.discountRate, actualPrice: p6.actualPrice, attendance: 1, trainingReport: '本节课完成度良好，心率保持在燃脂区间，建议下次增加阻力档位。', bookedAt: daysFromNowISO(-3) },
      { id: 'b7', memberId: 'm5', courseId: 'course7', status: 'booked', price: c7.price, discountRate: p7.discountRate, actualPrice: p7.actualPrice, attendance: null, trainingReport: null, bookedAt: daysFromNowISO(-1) },
      { id: 'b8', memberId: 'm6', courseId: 'course4', status: 'booked', price: c4.price, discountRate: p8.discountRate, actualPrice: p8.actualPrice, attendance: null, trainingReport: null, bookedAt: daysFromNowISO(-1) },
    ];
    for (const b of bookings) insertBooking.run(b.id, b.memberId, b.courseId, b.status, b.price, b.discountRate, b.actualPrice, b.attendance, b.trainingReport, b.bookedAt);

    const waitingEntries = [
      { id: 'w1', courseId: 'course2', memberId: 'm1', position: 1, joinedAt: daysFromNowISO(-2) },
      { id: 'w2', courseId: 'course2', memberId: 'm2', position: 2, joinedAt: daysFromNowISO(-1) },
      { id: 'w3', courseId: 'course2', memberId: 'm6', position: 3, joinedAt: daysFromNowISO(-0.5) },
      { id: 'w4', courseId: 'course4', memberId: 'm7', position: 1, joinedAt: daysFromNowISO(-0.5) },
    ];
    for (const w of waitingEntries) insertWaiting.run(w.id, w.courseId, w.memberId, w.position, w.joinedAt);

    const b1 = bookings.find((b) => b.id === 'b1')!;
    const b2 = bookings.find((b) => b.id === 'b2')!;

    const refunds = [
      { id: 'r1', bookingId: 'b1', memberId: 'm1', totalSessions: 20, completedSessions: 5, refundRatio: 0.75, paidAmount: b1.actualPrice * 20, refundAmount: Math.round(b1.actualPrice * 20 * 0.75), status: 'pending', reason: '工作调动，无法继续上课', createdAt: daysFromNowISO(-6), reviewedAt: null, reviewerId: null },
      { id: 'r2', bookingId: 'b2', memberId: 'm2', totalSessions: 12, completedSessions: 2, refundRatio: 0.83, paidAmount: b2.actualPrice * 12, refundAmount: Math.round(b2.actualPrice * 12 * 0.83), status: 'pending', reason: '身体原因，医生建议休息', createdAt: daysFromNowISO(-4), reviewedAt: null, reviewerId: null },
      { id: 'r3', bookingId: 'b6', memberId: 'm1', totalSessions: 10, completedSessions: 3, refundRatio: 0.7, paidAmount: 1599, refundAmount: 1119, status: 'approved', reason: '搬家距离太远', createdAt: daysFromNowISO(-15), reviewedAt: daysFromNowISO(-12), reviewerId: 'manager1' },
    ];
    for (const r of refunds) insertRefund.run(r.id, r.bookingId, r.memberId, r.totalSessions, r.completedSessions, r.refundRatio, r.paidAmount, r.refundAmount, r.status, r.reason, r.createdAt, r.reviewedAt, r.reviewerId);

    const b4 = bookings.find((b) => b.id === 'b4')!;
    const r1 = refunds.find((r) => r.id === 'r1')!;

    function makeVoucherData(type: string, id: string, amount?: number): string {
      const prefix = type === 'booking' ? 'BK' : type === 'refund' ? 'RF' : 'AT';
      return JSON.stringify({
        type,
        bookingId: type === 'booking' || type === 'attendance' ? id : undefined,
        refundId: type === 'refund' ? id : undefined,
        amount,
        issuedAt: todayISO(),
        code: `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`,
      });
    }

    const messages = [
      { id: 'msg1', userId: 'm1', role: 'member', type: 'booking_success', title: '预约成功', content: `您已成功预约「晨间燃脂动感单车」课程，上课时间 ${c3.date} 07:00-08:00，请准时到店。`, relatedId: 'b1', relatedType: 'booking', hasVoucher: 1, voucherData: makeVoucherData('booking', 'b1', b1.actualPrice), read: 0, createdAt: daysFromNowISO(-2) },
      { id: 'msg2', userId: 'm1', role: 'member', type: 'course_reminder', title: '课程提醒', content: '您预约的「下肢力量强化」课程将在2小时后开始，请提前15分钟到店热身。', relatedId: 'course3', relatedType: 'course', hasVoucher: 0, voucherData: null, read: 0, createdAt: daysFromNowISO(-0.1) },
      { id: 'msg3', userId: 'm2', role: 'member', type: 'booking_success', title: '候补排队中', content: '「午间舒缓瑜伽」课程已满员，您已进入候补队列，当前排位第2位，有空位将自动补位。', relatedId: 'b3', relatedType: 'booking', hasVoucher: 0, voucherData: null, read: 1, createdAt: daysFromNowISO(-1) },
      { id: 'msg4', userId: 'm1', role: 'member', type: 'attendance_record', title: '出勤记录已生成', content: '您的「动感单车竞速」课程出勤已记录，教练已上传训练报告，请查收。', relatedId: 'b6', relatedType: 'booking', hasVoucher: 1, voucherData: JSON.stringify({ type: 'attendance', bookingId: 'b6', issuedAt: daysFromNowISO(-0.9), code: 'AT20260606001' }), read: 1, createdAt: daysFromNowISO(-0.9) },
      { id: 'msg5', userId: 'm3', role: 'member', type: 'booking_success', title: '预约成功', content: '您已成功预约「HIIT燃脂挑战」课程，上课时间请查看课程详情。', relatedId: 'b4', relatedType: 'booking', hasVoucher: 1, voucherData: makeVoucherData('booking', 'b4', b4.actualPrice), read: 0, createdAt: daysFromNowISO(-1) },
      { id: 'msg6', userId: 'manager1', role: 'manager', type: 'refund_request', title: '新退款申请待审批', content: `会员张小明提交了退款申请，金额 ¥${r1.refundAmount}，请及时处理。`, relatedId: 'r1', relatedType: 'refund', hasVoucher: 0, voucherData: null, read: 0, createdAt: daysFromNowISO(-0.5) },
      { id: 'msg7', userId: 'coach1', role: 'coach', type: 'course_reminder', title: '课程即将开始', content: '您的「下肢力量强化」课程将在今天 18:30 开始，请提前准备。', relatedId: 'course3', relatedType: 'course', hasVoucher: 0, voucherData: null, read: 0, createdAt: daysFromNowISO(-0.2) },
      { id: 'msg8', userId: 'owner1', role: 'owner', type: 'attendance_record', title: '月度运营数据已更新', content: '6月门店运营数据看板已更新，请注意查看。', relatedId: null, relatedType: null, hasVoucher: 0, voucherData: null, read: 0, createdAt: daysFromNowISO(-0.8) },
      { id: 'msg9', userId: 'm1', role: 'member', type: 'refund_request', title: '退款申请已提交', content: `您已提交退款申请，应退金额 ¥${r1.refundAmount}，请等待运营审核。`, relatedId: 'r1', relatedType: 'refund', hasVoucher: 0, voucherData: null, read: 1, createdAt: daysFromNowISO(-6) },
      { id: 'msg10', userId: 'm6', role: 'member', type: 'waiting_promoted', title: '候补补位成功', content: '恭喜您从候补队列中补位成功，已为您预约课程。', relatedId: 'b8', relatedType: 'booking', hasVoucher: 1, voucherData: makeVoucherData('booking', 'b8'), read: 0, createdAt: daysFromNowISO(-0.3) },
    ];
    for (const m of messages) insertMessage.run(m.id, m.userId, m.role, m.type, m.title, m.content, m.relatedId, m.relatedType, m.hasVoucher, m.voucherData, m.read, m.createdAt);
  });

  tx();
  console.log('[seed] 演示数据初始化完成');
}
