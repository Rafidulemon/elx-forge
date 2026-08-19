import { useEffect } from 'react';
import { useToastStore } from '../store/toastStore';
import type { Toast, ToastType } from '../store/toastStore';
import { IconAlert, IconCheck, IconInfo, IconX } from './ui/icons';
import { cn } from '../lib/cn';

const TOAST_STYLE: Record<ToastType, string> = {
  success: 'border-ok/40 text-ok',
  error: 'border-err/40 text-err',
  warning: 'border-warn/40 text-warn',
  info: 'border-brand/40 text-brand',
};

const TOAST_ICON: Record<ToastType, typeof IconInfo> = {
  success: IconCheck,
  error: IconX,
  warning: IconAlert,
  info: IconInfo,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = TOAST_ICON[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 3200);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-line bg-elev px-3.5 py-2.5 text-[13px] shadow-pop animate-slide-up',
        TOAST_STYLE[toast.type],
      )}
    >
      <Icon width={16} height={16} className="mt-px shrink-0" />
      <span className="text-ink">{toast.message}</span>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-12 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}