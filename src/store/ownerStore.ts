import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Store, StoreMetrics, CoachStats } from '../types';
import { initialStores, initialMetrics, initialCoachRankings, mockUsers, generateId } from '../utils/mockData';

interface OwnerState {
  stores: Store[];
  metrics: StoreMetrics[];
  coachRankings: CoachStats[];
  fetchMetrics: (month?: string) => StoreMetrics[];
  exportReport: (month?: string) => void;
}

const generateMockMetrics = (month: string): StoreMetrics[] => {
  return initialStores.map((store) => ({
    storeId: store.id,
    month,
    bookingRate: Math.round((70 + Math.random() * 25) * 10) / 10,
    churnRate: Math.round((2 + Math.random() * 5) * 10) / 10,
    avgSatisfaction: Math.round((4 + Math.random()) * 10) / 10,
    totalRevenue: Math.round(50000 + Math.random() * 150000),
    activeMembers: Math.round(300 + Math.random() * 800),
  }));
};

const generateMockRankings = (month: string): CoachStats[] => {
  const coaches = mockUsers.filter((u) => u.role === 'coach');
  return coaches.map((coach) => {
    const totalCourses = Math.round(30 + Math.random() * 30);
    const consumedCourses = Math.round(totalCourses * (0.8 + Math.random() * 0.15));
    return {
      coachId: coach.id,
      month,
      totalCourses,
      consumedCourses,
      consumptionRate: Math.round((consumedCourses / totalCourses) * 10000) / 100,
      avgSatisfaction: Math.round((4 + Math.random()) * 10) / 10,
    };
  }).sort((a, b) => b.avgSatisfaction - a.avgSatisfaction);
};

const downloadCSV = (csvContent: string, filename: string) => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const useOwnerStore = create<OwnerState>()(
  persist(
    (set, get) => ({
      stores: initialStores,
      metrics: initialMetrics,
      coachRankings: initialCoachRankings,

      fetchMetrics: (month) => {
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const existingMetrics = get().metrics.filter((m) => m.month === targetMonth);

        if (existingMetrics.length > 0) {
          return existingMetrics;
        }

        const newMetrics = generateMockMetrics(targetMonth);
        const newRankings = generateMockRankings(targetMonth);

        set((state) => ({
          metrics: [...state.metrics.filter((m) => m.month !== targetMonth), ...newMetrics],
          coachRankings: [
            ...state.coachRankings.filter((r) => r.month !== targetMonth),
            ...newRankings,
          ],
        }));

        return newMetrics;
      },

      exportReport: (month) => {
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const metrics = get().fetchMetrics(targetMonth);
        const rankings = get().coachRankings.filter((r) => r.month === targetMonth);
        const stores = get().stores;

        let csv = 'FitPro 连锁健身场馆月度运营报表\n';
        csv += `报表月份,${targetMonth}\n`;
        csv += `生成时间,${new Date().toLocaleString('zh-CN')}\n\n`;

        csv += '=== 各门店运营数据 ===\n';
        csv += '门店名称,城市,预约率(%),会员流失率(%),平均满意度,总收入(¥),活跃会员数\n';
        metrics.forEach((m) => {
          const store = stores.find((s) => s.id === m.storeId);
          const storeName = store?.name || '-';
          const city = store?.city || '-';
          csv += `${storeName},${city},${m.bookingRate},${m.churnRate},${m.avgSatisfaction},${m.totalRevenue},${m.activeMembers}\n`;
        });

        csv += '\n=== 教练满意度排名 ===\n';
        csv += '排名,教练姓名,总课程数,已耗课程数,耗课率(%),平均满意度\n';
        rankings.forEach((r, index) => {
          const coach = mockUsers.find((u) => u.id === r.coachId);
          const coachName = coach?.name || r.coachId;
          csv += `${index + 1},${coachName},${r.totalCourses},${r.consumedCourses},${r.consumptionRate},${r.avgSatisfaction}\n`;
        });

        const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
        const totalMembers = metrics.reduce((sum, m) => sum + m.activeMembers, 0);
        const avgBookingRate = Math.round((metrics.reduce((sum, m) => sum + m.bookingRate, 0) / metrics.length) * 10) / 10;
        const avgSatisfaction = Math.round((metrics.reduce((sum, m) => sum + m.avgSatisfaction, 0) / metrics.length) * 10) / 10;

        csv += '\n=== 汇总统计 ===\n';
        csv += `门店总数,${metrics.length}\n`;
        csv += `总营收(¥),${totalRevenue}\n`;
        csv += `总活跃会员数,${totalMembers}\n`;
        csv += `平均预约率(%),${avgBookingRate}\n`;
        csv += `平均满意度,${avgSatisfaction}\n`;

        const filename = `FitPro运营报表_${targetMonth}.csv`;
        downloadCSV(csv, filename);
      },
    }),
    {
      name: 'fitpro-owner-store',
    }
  )
);
