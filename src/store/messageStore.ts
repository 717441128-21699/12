import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, MessageType, UserRole, MessageVoucher } from '../types';
import { initialMessages } from '../utils/mockData';

interface SendMessageParams {
  userId: string;
  role: UserRole;
  type: MessageType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: 'booking' | 'course' | 'refund';
  hasVoucher?: boolean;
  voucher?: MessageVoucher;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface MessageState {
  messages: Message[];
  unreadCount: number;
  toasts: ToastItem[];
  sendMessage: (params: SendMessageParams) => Message;
  markRead: (messageId: string) => void;
  markAllRead: (userId: string) => void;
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

function generateId(): string {
  return `msg${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export function generateVoucherCode(type: string): string {
  const prefix = type === 'booking' ? 'BK' : type === 'refund' ? 'RF' : 'AT';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${date}${random}`;
}

function generateToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      messages: initialMessages,
      unreadCount: initialMessages.filter((m) => !m.read).length,
      toasts: [],

      sendMessage: (params) => {
        const newMessage: Message = {
          id: generateId(),
          userId: params.userId,
          role: params.role,
          type: params.type,
          title: params.title,
          content: params.content,
          relatedId: params.relatedId,
          relatedType: params.relatedType,
          read: false,
          createdAt: new Date().toISOString(),
          hasVoucher: !!(params.hasVoucher || params.voucher),
          voucher: params.voucher,
        };
        set((state) => ({
          messages: [newMessage, ...state.messages],
          unreadCount: state.unreadCount + 1,
        }));
        return newMessage;
      },

      markRead: (messageId) => {
        set((state) => {
          const message = state.messages.find((m) => m.id === messageId);
          if (!message || message.read) return state;
          return {
            messages: state.messages.map((m) =>
              m.id === messageId ? { ...m, read: true } : m,
            ),
            unreadCount: state.unreadCount - 1,
          };
        });
      },

      markAllRead: (userId) => {
        set((state) => {
          let count = 0;
          const updated = state.messages.map((m) => {
            if (m.userId === userId && !m.read) {
              count++;
              return { ...m, read: true };
            }
            return m;
          });
          return {
            messages: updated,
            unreadCount: state.unreadCount - count,
          };
        });
      },

      showToast: (toast) => {
        const id = generateToastId();
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));
        setTimeout(() => {
          get().dismissToast(id);
        }, 3000);
      },

      dismissToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: 'fitpro-message-storage',
      partialize: (state) => ({
        messages: state.messages,
        unreadCount: state.unreadCount,
      }),
    },
  ),
);
