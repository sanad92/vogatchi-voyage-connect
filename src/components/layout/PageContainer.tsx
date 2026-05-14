import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** narrow=max-w-4xl, default=max-w-7xl, full=max-w-none */
  width?: 'narrow' | 'default' | 'full';
}

/**
 * Unified page wrapper. Provides consistent horizontal padding
 * and a max-width that matches Linear/Vercel-style apps.
 */
const PageContainer = ({ children, className, width = 'default' }: PageContainerProps) => {
  const widthClass =
    width === 'narrow' ? 'max-w-4xl' : width === 'full' ? 'max-w-none' : 'max-w-7xl';

  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 py-6', widthClass, className)}>
      {children}
    </div>
  );
};

export default PageContainer;
