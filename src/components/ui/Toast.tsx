import * as React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessageStore, type ToastType, type ToastItem } from '@/store/messageStore';

const toastStyles: Record<ToastType, { icon: React.ReactNode; border: string; bg: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    border: 'border-success/40',
    bg: 'bg-success/10',
    iconColor: 'text-success',
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    border: 'border-danger/40',
    bg: 'bg-danger/10',
    iconColor: 'text-danger',
  },
  warning: {
    icon: <AlertCircle className="h-5 w-5" />,
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    border: 'border-info/40',
    bg: 'bg-info/10',
    iconColor: 'text-info',
  },
};

function ToastNotification({ toast }: { toast: ToastItem }) {
  const dismissToast = useMessageStore((s) => s.dismissToast);
  const styles = toastStyles[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 min-w-[320px] max-w-md rounded-xl border p-4 shadow-card backdrop-blur-xl',
        'animate-slide-in-right',
        styles.border,
        styles.bg,
      )}
    >
      <div className={cn('flex-shrink-0 mt-0.5', styles.iconColor)}>{styles.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-muted leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => dismissToast(toast.id)}
        className="flex-shrink-0 p-1 rounded-md text-muted hover:text-foreground hover:bg-surfaceAlt transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useMessageStore((s) => s.toasts);

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} />
        </div>
      ))}
    </div>
  );
}
