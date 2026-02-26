import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { ReactNode } from 'react';

interface WriteGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  silent?: boolean;
}

/**
 * Wraps write actions (buttons, forms). If subscription is expired/inactive,
 * renders disabled state or shows toast.
 */
const WriteGuard = ({ children, fallback, silent }: WriteGuardProps) => {
  const { canWrite, getBlockMessage } = useSubscription();

  if (!canWrite) {
    if (!silent) {
      const msg = getBlockMessage();
      if (msg) toast.error(msg);
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

/**
 * Hook for mutation guards. Use before executing writes.
 */
export const useWriteGuard = () => {
  const { canWrite, isReadOnly, getBlockMessage, canAddUser, canAddBooking } = useSubscription();

  const guardWrite = (onBlocked?: () => void): boolean => {
    if (!canWrite) {
      const msg = getBlockMessage();
      if (msg) toast.error(msg);
      onBlocked?.();
      return false;
    }
    return true;
  };

  const guardAddUser = (onBlocked?: () => void): boolean => {
    if (!canAddUser) {
      toast.error('تم الوصول للحد الأقصى من المستخدمين. يرجى ترقية الخطة.');
      onBlocked?.();
      return false;
    }
    return true;
  };

  const guardAddBooking = (onBlocked?: () => void): boolean => {
    if (!canAddBooking) {
      toast.error('تم الوصول للحد الأقصى من الحجوزات الشهرية. يرجى ترقية الخطة.');
      onBlocked?.();
      return false;
    }
    return true;
  };

  return { guardWrite, guardAddUser, guardAddBooking, isReadOnly, canWrite };
};

export default WriteGuard;
