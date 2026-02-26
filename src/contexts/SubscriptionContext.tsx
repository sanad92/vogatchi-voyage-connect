import { createContext, useContext, ReactNode } from 'react';
import { useSubscriptionEnforcement, SubscriptionStatus } from '@/hooks/useSubscriptionEnforcement';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';

interface SubscriptionContextType {
  isReadOnly: boolean;
  isExpired: boolean;
  isActive: boolean;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  canWrite: boolean;
  canAddUser: boolean;
  canAddBooking: boolean;
  getBlockMessage: () => string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const enforcement = useSubscriptionEnforcement();
  const { isPlatformAdmin } = usePlatformAdmin();

  // Platform admins bypass all restrictions
  const isExpired = !isPlatformAdmin && enforcement.isExpired;
  const isReadOnly = !isPlatformAdmin && (enforcement.isExpired || !enforcement.isActive);
  const canWrite = isPlatformAdmin || enforcement.isActive;

  const getBlockMessage = (): string | null => {
    if (isPlatformAdmin) return null;
    if (!enforcement.subscription) return 'لا يوجد اشتراك نشط.';
    if (enforcement.isExpired) return 'الاشتراك منتهٍ. النظام في وضع القراءة فقط.';
    if (!enforcement.isActive) return 'الاشتراك غير نشط.';
    return null;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isReadOnly,
        isExpired,
        isActive: canWrite,
        subscription: enforcement.subscription ?? null,
        loading: enforcement.loading,
        canWrite,
        canAddUser: isPlatformAdmin || enforcement.canAddUser,
        canAddBooking: isPlatformAdmin || enforcement.canAddBooking,
        getBlockMessage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
