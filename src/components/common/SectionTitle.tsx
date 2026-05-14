import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

/**
 * Smaller section title used inside cards/tabs (not full pages).
 * Keeps typography rhythm consistent with PageHeader.
 */
const SectionTitle = ({ title, description, icon: Icon, actions, className }: SectionTitleProps) => (
  <div className={cn('flex items-center justify-between gap-3 mb-4', className)}>
    <div className="min-w-0">
      <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h2>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export default SectionTitle;
