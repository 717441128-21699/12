import { create } from 'zustand';
import type { CourseCategory, PricingRule, RefundRequest } from '../types';
import { categories as categoriesApi, pricing as pricingApi, refunds as refundsApi } from '../api/endpoints';

interface ManagerState {
  categories: CourseCategory[];
  pricingRules: PricingRule[];
  refundRequests: RefundRequest[];
  loading: boolean;
  error: string | null;

  fetchCategories: () => Promise<void>;
  fetchPricingRules: () => Promise<void>;
  fetchRefundRequests: (status?: string) => Promise<void>;
  fetchAll: () => Promise<void>;

  upsertCategory: (data: Partial<CourseCategory> & { name: string; basePrice: number }) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  updatePricingRules: (rules: PricingRule[]) => Promise<boolean>;
  reviewRefund: (requestId: string, approve: boolean, rejectReason?: string) => Promise<boolean>;

  clearError: () => void;
}

export const useManagerStore = create<ManagerState>((set, get) => ({
  categories: [],
  pricingRules: [],
  refundRequests: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const data = await categoriesApi.list();
      set({ categories: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取分类列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchPricingRules: async () => {
    set({ loading: true, error: null });
    try {
      const data = await pricingApi.list();
      set({ pricingRules: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取定价规则失败';
      set({ error: message, loading: false });
    }
  },

  fetchRefundRequests: async (status) => {
    set({ loading: true, error: null });
    try {
      const data = await refundsApi.list(status ? { status } : undefined);
      set({ refundRequests: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取退款列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [categoriesData, pricingData, refundsData] = await Promise.all([
        categoriesApi.list(),
        pricingApi.list(),
        refundsApi.list(),
      ]);
      set({
        categories: categoriesData,
        pricingRules: pricingData,
        refundRequests: refundsData,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载数据失败';
      set({ error: message, loading: false });
    }
  },

  upsertCategory: async (data) => {
    set({ loading: true, error: null });
    try {
      if (data.id) {
        const { id, ...rest } = data;
        const updated = await categoriesApi.update(id, rest);
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? updated : cat
          ),
          loading: false,
        }));
      } else {
        const created = await categoriesApi.create({
          name: data.name,
          icon: data.icon || 'activity',
          description: data.description || '',
          basePrice: data.basePrice,
          color: data.color || '#FF5E1A',
        });
        set((state) => ({
          categories: [...state.categories, created],
          loading: false,
        }));
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存分类失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  deleteCategory: async (id) => {
    set({ loading: true, error: null });
    try {
      await categoriesApi.delete(id);
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        loading: false,
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除分类失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  updatePricingRules: async (rules) => {
    set({ loading: true, error: null });
    try {
      const data = await pricingApi.update(rules);
      set({ pricingRules: data, loading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新定价规则失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  reviewRefund: async (requestId, approve, rejectReason) => {
    set({ loading: true, error: null });
    try {
      let updated: RefundRequest;
      if (approve) {
        updated = await refundsApi.approve(requestId);
      } else {
        updated = await refundsApi.reject(requestId, { reason: rejectReason || '不符合退款条件' });
      }
      set((state) => ({
        refundRequests: state.refundRequests.map((req) =>
          req.id === requestId ? updated : req
        ),
        loading: false,
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '审核退款失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
