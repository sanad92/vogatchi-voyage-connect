import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

/**
 * Unified page header used across every ERP page.
 * Linear/Vercel style: tight typography, subtle muted description,
 * optional icon chip and right-side actions.
 */
const PageHeader = ({ title, description, icon: Icon, actions, badge, className }: PageHeaderProps) => {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-5 mb-6',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">

            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
      )}
    </header>

  );
};

export default PageHeader;
