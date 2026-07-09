import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  eyebrow?: string;
}

/**
 * Consistent section header used inside cards, panels and dashboards.
 * Editorial look — small eyebrow + title + optional right-aligned action.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  eyebrow,
}) => (
  <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
    <div className="min-w-0 flex-1">
      {eyebrow && (
        <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.14em] mb-1">
          {eyebrow}
        </p>
      )}
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
          {title}
        </h3>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          {description}
        </p>
      )}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export default SectionHeader;
