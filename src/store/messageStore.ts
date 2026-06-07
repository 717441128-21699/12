import { create } from 'zustand';
import type { Message } from '../types';
import { messages as messagesApi } from '../api/endpoints';

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
  loading: boolean;
  error: string | null;

  fetchMessages: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchAll: () => Promise<void>;

  markRead: (messageId: string) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;

  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  clearError: () => void;
}

function generateToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  unreadCount: 0,
  toasts: [],
  loading: false,
  error: null,

  fetchMessages: async () => {
    set({ loading: true, error: null });
    try {
      const data = await messagesApi.list();
      set({ messages: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取消息列表失败';
      set({ error: message, loading: false });
    }
  },

  fetchUnreadCount: async () => {
    set({ error: null });
    try {
      const data = await messagesApi.unreadCount();
      set({ unreadCount: data.count });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取未读计数失败';
      set({ error: message });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [messagesData, unreadData] = await Promise.all([
        messagesApi.list(),
        messagesApi.unreadCount(),
      ]);
      set({
        messages: messagesData,
        unreadCount: unreadData.count,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载消息失败';
      set({ error: message, loading: false });
    }
  },

  markRead: async (messageId) => {
    set({ error: null });
    try {
      const updated = await messagesApi.markRead(messageId);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? updated : m
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '标记已读失败';
      set({ error: message });
      return false;
    }
  },

  markAllRead: async () => {
    set({ error: null });
    try {
      const result = await messagesApi.markAllRead();
      set((state) => ({
        messages: state.messages.map((m) => ({ ...m, read: true })),
        unreadCount: 0,
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '标记全部已读失败';
      set({ error: message });
      return false;
    }
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

  clearError: () => {
    set({ error: null });
  },
}));
