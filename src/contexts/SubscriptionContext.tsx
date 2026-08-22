import { createContext, useContext, ReactNode } from 'react';
import { useSubscriptionEnforcement, SubscriptionStatus } from '@/hooks/useSubscriptionEnforcement';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { PlanFeature } from '@/lib/planFeatures';

interface SubscriptionContextType {
  isReadOnly: boolean;
  isExpired: boolean;
  isActive: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  canWrite: boolean;
  canAddUser: boolean;
  canAddBooking: boolean;
  hasFeature: (feature: PlanFeature) => boolean;
  getBlockMessage: () => string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const enforcement = useSubscriptionEnforcement();
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin();

  // Platform admins bypass all restrictions
  const isExpired = !isPlatformAdmin && enforcement.isExpired;
  const isReadOnly = !isPlatformAdmin && (enforcement.isExpired || !enforcement.isActive);
  const canWrite = isPlatformAdmin || enforcement.isActive;
  const isTrialing = !isPlatformAdmin && enforcement.isTrialing;
  const trialDaysRemaining = enforcement.trialDaysRemaining;
  const planFeatures = enforcement.subscription?.features;

  const hasFeature = (feature: PlanFeature): boolean => {
    if (isPlatformAdmin) return true;
    // Keep access permissive during a rolling deploy until the RPC migration is live.
    if (!planFeatures) return true;
    return planFeatures.includes('all_features') || planFeatures.includes(feature);
  };

  const getBlockMessage = (): string | null => {
    if (isPlatformAdmin) return null;
    if (!enforcement.subscription) return 'لا يوجد اشتراك نشط.';
    if (enforcement.isExpired && enforcement.isTrialing) return 'انتهت الفترة التجريبية. يرجى ترقية خطتك للاستمرار.';
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
        isTrialing,
        trialDaysRemaining,
        subscription: enforcement.subscription ?? null,
        loading: enforcement.loading || adminLoading,
        canWrite,
        canAddUser: isPlatformAdmin || enforcement.canAddUser,
        canAddBooking: isPlatformAdmin || enforcement.canAddBooking,
        hasFeature,
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
