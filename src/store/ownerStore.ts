import { create } from 'zustand';
import type { Store, StoreMetrics, CoachStats } from '../types';
import { stores as storesApi, stats as statsApi } from '../api/endpoints';

interface CoachRanking {
  coachId: string;
  coachName: string;
  avgSatisfaction: number;
  consumptionRate: number;
  totalCourses: number;
}

interface OwnerState {
  stores: Store[];
  metrics: StoreMetrics[];
  coachRankings: CoachStats[];
  loading: boolean;
  error: string | null;

  fetchStores: () => Promise<void>;
  fetchMetrics: (month?: string) => Promise<StoreMetrics[]>;
  fetchRankings: () => Promise<void>;
  fetchAll: (month?: string) => Promise<void>;
  exportReport: (month?: string) => Promise<string | null>;

  clearError: () => void;
}

export const useOwnerStore = create<OwnerState>((set, get) => ({
  stores: [],
  metrics: [],
  coachRankings: [],
  loading: false,
  error: null,

  fetchStores: async () => {
    set({ loading: true, error: null });
    try {
      const data = await storesApi.list();
      set({ stores: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取门店列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchMetrics: async (month) => {
    set({ loading: true, error: null });
    try {
      const { stores } = get();
      const targetStores = stores.length > 0 ? stores : await storesApi.list();
      if (stores.length === 0) {
        set({ stores: targetStores });
      }

      const metricsPromises = targetStores.map((s) =>
        storesApi.metrics(s.id, month ? { month } : undefined)
      );
      const results = await Promise.all(metricsPromises);
      const allMetrics: StoreMetrics[] = [];
      for (const result of results) {
        if (Array.isArray(result)) {
          allMetrics.push(...result);
        } else {
          allMetrics.push(result);
        }
      }

      set((state) => {
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const otherMetrics = state.metrics.filter((m) => m.month !== targetMonth);
        return {
          metrics: [...otherMetrics, ...allMetrics],
          loading: false,
        };
      });

      return allMetrics;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取门店数据失败';
      set({ error: message, loading: false });
      return [];
    }
  },

  fetchRankings: async () => {
    set({ loading: true, error: null });
    try {
      const data = await statsApi.rankCoaches();
      const rankings: CoachStats[] = data.map((r: CoachRanking) => ({
        coachId: r.coachId,
        month: new Date().toISOString().slice(0, 7),
        totalCourses: r.totalCourses,
        consumedCourses: Math.round(r.totalCourses * (r.consumptionRate / 100)),
        consumptionRate: r.consumptionRate,
        avgSatisfaction: r.avgSatisfaction,
      }));
      set({ coachRankings: rankings, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取教练排行失败';
      set({ error: message, loading: false });
    }
  },

  fetchAll: async (month) => {
    set({ loading: true, error: null });
    try {
      await get().fetchStores();
      await Promise.all([get().fetchMetrics(month), get().fetchRankings()]);
      set({ loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载数据失败';
      set({ error: message, loading: false });
    }
  },

  exportReport: async (month) => {
    set({ loading: true, error: null });
    try {
      const csv = await statsApi.export(month ? { month } : undefined);
      set({ loading: false });
      return csv;
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出报表失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
