import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  subtitle?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    borderHover: 'hover:border-primary',
  },
  success: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600',
    borderHover: 'hover:border-green-500/50',
  },
  warning: {
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
    borderHover: 'hover:border-yellow-500/50',
  },
  error: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    borderHover: 'hover:border-red-500/50',
  },
  accent: {
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    borderHover: 'hover:border-accent/50',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  variant = 'default',
  subtitle,
  onClick,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const iconColorClass = color || styles.iconColor;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        styles.borderHover,
        onClick && 'active:scale-[0.98]'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-4">
          {/* Icon Container with background */}
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg transition-transform duration-200',
              styles.iconBg,
              'group-hover:scale-105'
            )}
          >
            <Icon className={cn('w-6 h-6', iconColorClass)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className={cn('text-2xl font-bold font-mono', iconColorClass)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
