import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  size = 'md',
  className,
}) => {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = original;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        className={cn(
          'relative w-full mx-4 rounded-2xl glass shadow-card',
          'animate-[fadeInUp_0.25s_ease-out]',
          sizeStyles[size],
          className,
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-4">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
              )}
              {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-3 !p-1.5 !h-auto"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
        <div className={cn('px-6', title || showCloseButton ? '' : 'pt-6')}>{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 p-6 pt-4 mt-2 border-t border-border/60">
            {footer}
          </div>
        )}
        {!footer && children && <div className="h-6" />}
      </div>
    </div>
  );
};
