import * as React from 'react';
import { cn } from '@/lib/utils';

type ProgressVariant = 'accent' | 'success' | 'info' | 'danger';

export interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: ProgressVariant;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  info: 'bg-info',
  danger: 'bg-danger',
};

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = true,
  variant = 'accent',
  label,
  size = 'md',
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={cn('w-full', className)}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {showLabel && (
            <span className={cn('text-sm font-semibold', variant === 'accent' ? 'text-accent' : '')}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full rounded-full bg-surfaceAlt overflow-hidden', sizeStyles[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantStyles[variant],
            size !== 'sm' && 'shadow-[0_0_10px_rgba(255,94,26,0.4)]',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
