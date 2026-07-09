/**
 * Backward-compat shim.
 * The canonical EmptyState lives at `@/components/ui/empty-state`.
 * This file keeps historical imports (`@/components/common/EmptyState`)
 * working and forwards a `ReactNode` action into the new shape.
 */
import { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { EmptyState as CanonicalEmptyState } from '@/components/ui/empty-state';

interface LegacyEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ icon = Inbox, title, description, action, className }: LegacyEmptyStateProps) => {
  return (
    <CanonicalEmptyState
      icon={icon}
      title={title}
      description={description}
      className={className}
    >
      {/* @ts-expect-error – legacy shim renders raw ReactNode action below icon */}
      {action ? <div className="mt-1">{action}</div> : null}
    </CanonicalEmptyState>
  );
};

export default EmptyState;

