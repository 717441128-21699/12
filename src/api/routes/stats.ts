import type { CoachStats, StoreMetrics } from '../../types';
import { getDb, ApiContext, ApiResponse, ok, fail } from '../db';

export interface CoachRanking {
  coachId: string;
  coachName: string;
  avgSatisfaction: number;
  consumptionRate: number;
  totalCourses: number;
}

export function getCoachStats(ctx: ApiContext, coachId: string, query?: { month?: string }): ApiResponse<CoachStats> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId) {
    return fail('未登录');
  }

  if (currentUserRole === 'coach' && currentUserId !== coachId) {
    return fail('无权查看其他教练的数据');
  }

  if (currentUserRole !== 'coach' && currentUserRole !== 'manager' && currentUserRole !== 'owner') {
    return fail('无权访问');
  }

  const targetMonth = query?.month || new Date().toISOString().slice(0, 7);

  let stats = db.coachStats.find((s) => s.coachId === coachId && s.month === targetMonth);

  if (!stats) {
    const coachCourses = db.courses.filter((c) => c.coachId === coachId);
    const monthCourses = coachCourses.filter((c) => c.date.startsWith(targetMonth));
    const totalCourses = monthCourses.length;
    const consumedCourses = monthCourses.filter(
      (c) => c.status === 'completed' || c.status === 'ongoing'
    ).length;
    const consumptionRate = totalCourses > 0 ? Number(((consumedCourses / totalCourses) * 100).toFixed(2)) : 0;

    const precomputed = db.coachStats.find((s) => s.coachId === coachId);

    stats = {
      coachId,
      month: targetMonth,
      totalCourses,
      consumedCourses,
      consumptionRate,
      avgSatisfaction: precomputed?.avgSatisfaction || 4.5,
    };
  }

  return ok(stats);
}

export function getStoreStats(ctx: ApiContext, storeId: string, query?: { month?: string }): ApiResponse<StoreMetrics> {
  const db = getDb();
  const { currentUserId, currentUserRole } = ctx;

  if (!currentUserId) {
    return fail('未登录');
  }

  if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
    return fail('无权访问，仅店长和运营可查看门店数据');
  }

  const targetMonth = query?.month || new Date().toISOString().slice(0, 7);

  let metrics = db.storeMetrics.find((m) => m.storeId === storeId && m.month === targetMonth);

  if (!metrics) {
    const storeCourses = db.courses.filter((c) => c.storeId === storeId && c.date.startsWith(targetMonth));
    const totalSlots = storeCourses.reduce((sum, c) => sum + c.capacity, 0);
    const totalBooked = storeCourses.reduce((sum, c) => sum + c.bookedCount, 0);
    const bookingRate = totalSlots > 0 ? Number(((totalBooked / totalSlots) * 100).toFixed(2)) : 0;

    const storeMembers = db.users.filter((u) => u.role === 'member' && u.storeId === storeId);
    const activeMembers = storeMembers.filter((m) =>
      db.bookings.some(
        (b) => b.memberId === m.id && b.bookedAt.startsWith(targetMonth)
      )
    ).length;

    const revenue = db.bookings
      .filter((b) => {
        const course = db.courses.find((c) => c.id === b.courseId);
        return course?.storeId === storeId && b.bookedAt.startsWith(targetMonth) && b.status !== 'cancelled';
      })
      .reduce((sum, b) => sum + b.actualPrice, 0);

    const precomputed = db.storeMetrics.find((m) => m.storeId === storeId);

    metrics = {
      storeId,
      month: targetMonth,
      bookingRate,
      churnRate: precomputed?.churnRate || 3.5,
      avgSatisfaction: precomputed?.avgSatisfaction || 4.5,
      totalRevenue: revenue > 0 ? revenue : (precomputed?.totalRevenue || 0),
      activeMembers: activeMembers > 0 ? activeMembers : (precomputed?.activeMembers || 0),
    };
  }

  return ok(metrics);
}

export function getCoachRankings(ctx: ApiContext): ApiResponse<CoachRanking[]> {
  const db = getDb();
  const { currentUserRole } = ctx;

  if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
    return fail('无权访问');
  }

  const coaches = db.users.filter((u) => u.role === 'coach');

  const rankings: CoachRanking[] = coaches.map((coach) => {
    const precomputed = db.coachStats.find((s) => s.coachId === coach.id);
    const coachCourses = db.courses.filter((c) => c.coachId === coach.id);
    const totalCourses = coachCourses.length;
    const consumed = coachCourses.filter((c) => c.status === 'completed' || c.status === 'ongoing').length;
    const consumptionRate = totalCourses > 0 ? Number(((consumed / totalCourses) * 100).toFixed(2)) : 0;

    return {
      coachId: coach.id,
      coachName: coach.name,
      avgSatisfaction: precomputed?.avgSatisfaction || 4.0 + Math.random() * 0.9,
      consumptionRate: precomputed?.consumptionRate || consumptionRate,
      totalCourses: precomputed?.totalCourses || totalCourses,
    };
  });

  rankings.sort((a, b) => b.avgSatisfaction - a.avgSatisfaction);

  return ok(rankings);
}

export function exportStats(ctx: ApiContext, query?: { month?: string; format?: 'csv' }): ApiResponse<string> {
  const db = getDb();
  const { currentUserRole } = ctx;

  if (currentUserRole !== 'owner') {
    return fail('无权访问，仅店长可导出报表');
  }

  const targetMonth = query?.month || new Date().toISOString().slice(0, 7);

  const header = [
    '门店名称',
    '城市',
    '月份',
    '预约率(%)',
    '流失率(%)',
    '平均满意度',
    '总营收(¥)',
    '活跃会员数',
  ].join(',');

  const rows: string[] = [header];

  for (const store of db.stores) {
    const metrics = getStoreStats(ctx, store.id, { month: targetMonth });
    if (metrics.success && metrics.data) {
      const m = metrics.data;
      rows.push(
        [
          `"${store.name}"`,
          `"${store.city}"`,
          m.month,
          m.bookingRate.toFixed(2),
          m.churnRate.toFixed(2),
          m.avgSatisfaction.toFixed(2),
          m.totalRevenue.toFixed(2),
          m.activeMembers,
        ].join(',')
      );
    }
  }

  const coachHeader = ['教练ID', '教练姓名', '月耗课率(%)', '平均满意度', '总课程数'].join(',');
  rows.push('');
  rows.push('--- 教练满意度排行 ---');
  rows.push(coachHeader);

  const rankings = getCoachRankings(ctx);
  if (rankings.success && rankings.data) {
    for (const r of rankings.data) {
      rows.push(
        [
          r.coachId,
          `"${r.coachName}"`,
          r.consumptionRate.toFixed(2),
          r.avgSatisfaction.toFixed(2),
          r.totalCourses,
        ].join(',')
      );
    }
  }

  const csv = rows.join('\n');

  if (typeof window !== 'undefined') {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fitpro-report-${targetMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return ok(csv);
}
