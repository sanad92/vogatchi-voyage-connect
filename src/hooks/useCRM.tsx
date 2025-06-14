
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CustomerSegment, LoyaltyPoints, LoyaltyReward, MarketingCampaign } from '@/types/crm';

export const useCRM = () => {
  const queryClient = useQueryClient();

  // جلب تقسيمات العملاء
  const { data: customerSegments, isLoading: segmentsLoading } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('is_active', true)
        .order('minimum_bookings', { ascending: false });
      
      if (error) throw error;
      return data as CustomerSegment[];
    },
  });

  // جلب مكافآت نقاط الولاء
  const { data: loyaltyRewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });
      
      if (error) throw error;
      return data as LoyaltyReward[];
    },
  });

  // جلب الحملات التسويقية
  const { data: marketingCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select(`
          *,
          target_segment:customer_segments(name_ar, color)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // إنشاء حملة تسويقية جديدة
  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert(campaign)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('تم إنشاء الحملة التسويقية بنجاح');
    },
    onError: () => {
      toast.error('خطأ في إنشاء الحملة التسويقية');
    },
  });

  // استرداد نقاط الولاء
  const redeemPointsMutation = useMutation({
    mutationFn: async ({ customerId, rewardId, pointsToRedeem }: { 
      customerId: string; 
      rewardId: string; 
      pointsToRedeem: number; 
    }) => {
      // First get the current points
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', customerId)
        .single();
      
      if (customerError) throw customerError;
      
      const newPoints = (customer.loyalty_points || 0) - pointsToRedeem;
      
      // تحديث نقاط العميل
      const { error: updateError } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId);
      
      if (updateError) throw updateError;

      // تسجيل عملية الاسترداد
      const { data, error } = await supabase
        .from('customer_loyalty_points')
        .insert({
          customer_id: customerId,
          points_used: pointsToRedeem,
          current_balance: -pointsToRedeem,
          transaction_type: 'redeemed',
          description: `استرداد مكافأة - ${pointsToRedeem} نقطة`
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-full-data'] });
      toast.success('تم استرداد النقاط بنجاح');
    },
    onError: () => {
      toast.error('خطأ في استرداد النقاط');
    },
  });

  return {
    customerSegments,
    segmentsLoading,
    loyaltyRewards,
    rewardsLoading,
    marketingCampaigns,
    campaignsLoading,
    createCampaign: createCampaignMutation.mutate,
    redeemPoints: redeemPointsMutation.mutate,
    isCreatingCampaign: createCampaignMutation.isPending,
    isRedeemingPoints: redeemPointsMutation.isPending,
  };
};
