import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CourseCategory, PricingRule, RefundRequest, RefundStatus } from '../types';
import { initialCategories, initialPricingRules, initialRefundRequests, generateId } from '../utils/mockData';
import { useMessageStore } from './messageStore';

interface ManagerState {
  categories: CourseCategory[];
  pricingRules: PricingRule[];
  refundRequests: RefundRequest[];
  upsertCategory: (data: Partial<CourseCategory> & { name: string; basePrice: number }) => void;
  deleteCategory: (id: string) => void;
  updatePricingRules: (rules: PricingRule[]) => void;
  reviewRefund: (requestId: string, approve: boolean, reviewerId?: string) => void;
}

export const useManagerStore = create<ManagerState>()(
  persist(
    (set) => ({
      categories: initialCategories,
      pricingRules: initialPricingRules,
      refundRequests: initialRefundRequests,

      upsertCategory: (data) =>
        set((state) => {
          if (data.id) {
            return {
              categories: state.categories.map((cat) =>
                cat.id === data.id ? ({ ...cat, ...data } as CourseCategory) : cat
              ),
            };
          }
          const newCategory: CourseCategory = {
            id: generateId(),
            name: data.name,
            icon: data.icon || 'activity',
            description: data.description || '',
            basePrice: data.basePrice,
            color: data.color || '#FF5E1A',
          };
          return { categories: [...state.categories, newCategory] };
        }),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        })),

      updatePricingRules: (rules) =>
        set(() => ({
          pricingRules: rules,
        })),

      reviewRefund: (requestId, approve, reviewerId) =>
        set((state) => {
          const updatedRequests: RefundRequest[] = state.refundRequests.map((req) => {
            if (req.id === requestId) {
              const status = (approve ? 'approved' : 'rejected') as RefundStatus;
              const updated: RefundRequest = {
                ...req,
                status,
                reviewedAt: new Date().toISOString(),
                reviewerId,
              };

              const sendMessage = useMessageStore.getState().sendMessage;
              sendMessage({
                userId: req.memberId,
                role: 'member',
                type: 'refund_result',
                title: approve ? '退款申请已通过' : '退款申请已驳回',
                content: approve
                  ? `您的退款申请已通过审批，退款金额 ¥${req.refundAmount.toFixed(2)} 将在3个工作日内到账。`
                  : `您的退款申请未通过审批，如有疑问请联系客服。退款申请编号：${req.id}`,
                relatedId: req.id,
                relatedType: 'refund',
                hasVoucher: approve,
                voucher: approve
                  ? {
                      type: 'refund',
                      refundId: req.id,
                      amount: req.refundAmount,
                      issuedAt: new Date().toISOString(),
                      code: `RF${Date.now()}`,
                    }
                  : undefined,
              });

              return updated;
            }
            return req;
          });
          return { refundRequests: updatedRequests };
        }),
    }),
    {
      name: 'fitpro-manager-store',
    }
  )
);
