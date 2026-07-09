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
  // The canonical EmptyState only accepts a structured `action` object; when
  // callers pass a ReactNode we can't forward it as a button, so render the
  // canonical component and stack the raw node underneath.
  return (
    <div className={className}>
      <CanonicalEmptyState icon={icon} title={title} description={description} />
      {action ? <div className="-mt-4 flex justify-center pb-6">{action}</div> : null}
    </div>
  );
};

export default EmptyState;


