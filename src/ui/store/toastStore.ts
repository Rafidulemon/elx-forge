import { create } from 'zustand';
import { createId } from '@shared/utils/id';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) => {
    const toast: Toast = { id: createId(), type, message };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  warning: (message: string) => useToastStore.getState().push('warning', message),
  info: (message: string) => useToastStore.getState().push('info', message),
};