import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'purple';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surfaceAlt text-foreground border-border',
  success: 'bg-success/15 text-success border-success/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  info: 'bg-info/15 text-info border-info/30',
  accent: 'bg-accent/15 text-accent border-accent/30',
  purple: 'bg-purple/15 text-purple border-purple/30',
};

const dotColor: Record<BadgeVariant, string> = {
  default: 'bg-muted',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-yellow-400',
  info: 'bg-info',
  accent: 'bg-accent',
  purple: 'bg-purple',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', dot = false, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
          'text-xs font-medium transition-colors',
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {dot && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse-soft', dotColor[variant])} />}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
