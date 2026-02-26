import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface SubscriptionStatus {
  active: boolean;
  expired: boolean;
  expires_at: string | null;
  status: 'active' | 'trialing' | 'expired' | 'cancelled' | 'none';
  is_trialing: boolean;
  trial_days_remaining: number | null;
  plan_name: string;
  plan_name_ar: string;
  limits: {
    max_users: number;
    max_bookings: number;
    max_storage_mb: number;
  };
  usage: {
    users: number;
    bookings_this_month: number;
  };
  can_add_user: boolean;
  can_add_booking: boolean;
}

export const useSubscriptionEnforcement = () => {
  const { organizationId } = useOrganization();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription-status', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase.rpc('check_subscription_limits', {
        _org_id: organizationId,
      });
      if (error) throw error;
      return data as unknown as SubscriptionStatus;
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });

  const canAddUser = data?.can_add_user ?? false;
  const canAddBooking = data?.can_add_booking ?? false;
  const isExpired = data?.expired ?? false;
  const isActive = data?.active ?? false;
  const isTrialing = data?.is_trialing ?? false;
  const trialDaysRemaining = data?.trial_days_remaining ?? null;

  const getUserLimitMessage = (): string | null => {
    if (!data) return null;
    if (!data.active) return 'الاشتراك منتهٍ أو غير نشط. لا يمكن إضافة مستخدمين.';
    if (!data.can_add_user)
      return `تم الوصول للحد الأقصى من المستخدمين (${data.limits.max_users}). يرجى ترقية الخطة.`;
    return null;
  };

  const getBookingLimitMessage = (): string | null => {
    if (!data) return null;
    if (!data.active) return 'الاشتراك منتهٍ أو غير نشط. لا يمكن إضافة حجوزات.';
    if (!data.can_add_booking)
      return `تم الوصول للحد الأقصى من الحجوزات الشهرية (${data.limits.max_bookings}). يرجى ترقية الخطة.`;
    return null;
  };

  return {
    subscription: data,
    loading: isLoading,
    isActive,
    isExpired,
    isTrialing,
    trialDaysRemaining,
    canAddUser,
    canAddBooking,
    getUserLimitMessage,
    getBookingLimitMessage,
    refetch,
  };
};
