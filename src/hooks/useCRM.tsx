
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CampaignSend, CustomerSegment, LoyaltyReward, MarketingCampaign } from '@/types/crm';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export const useCRM = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();

  // جلب تقسيمات العملاء
  const { data: customerSegments, isLoading: segmentsLoading } = useQuery({
    queryKey: ['customer-segments', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('minimum_bookings', { ascending: false });
      
      if (error) throw error;
      return data as CustomerSegment[];
    },
    enabled: !!orgId,
  });

  // جلب مكافآت نقاط الولاء
  const { data: loyaltyRewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['loyalty-rewards', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('points_required', { ascending: true });
      
      if (error) throw error;
      return data as LoyaltyReward[];
    },
    enabled: !!orgId,
  });

  // جلب الحملات التسويقية
  const { data: marketingCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['marketing-campaigns', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select(`
          *,
          target_segment:customer_segments(name_ar, color)
        `)
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // تحويل البيانات إلى النوع المطلوب مع التأكد من صحة campaign_type
      return data?.map(campaign => ({
        ...campaign,
        campaign_type: campaign.campaign_type as 'email' | 'whatsapp' | 'sms'
      })) as MarketingCampaign[];
    },
    enabled: !!orgId,
  });

  const { data: campaignSends, isLoading: campaignSendsLoading } = useQuery({
    queryKey: ['campaign-sends', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_sends')
        .select('id, campaign_id, customer_id, sent_at, status, response, created_at')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).filter((send): send is CampaignSend => (
        Boolean(send.campaign_id)
        && Boolean(send.customer_id)
        && Boolean(send.created_at)
        && ['sent', 'delivered', 'read', 'failed'].includes(send.status || '')
      ));
    },
    enabled: !!orgId,
  });

  const createSegmentMutation = useMutation({
    mutationFn: async (segment: Pick<CustomerSegment, 'name' | 'name_ar' | 'description' | 'color' | 'minimum_bookings' | 'minimum_total_spent'>) => {
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة');
      const { data, error } = await supabase
        .from('customer_segments')
        .insert({ ...segment, organization_id: orgId, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم إنشاء الشريحة بنجاح');
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'خطأ في إنشاء الشريحة'),
  });

  // إنشاء حملة تسويقية جديدة
  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at'>) => {
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة');
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...campaign,
          organization_id: orgId,
          created_by: user?.id || null,
          target_segment_id: campaign.target_segment_id && campaign.target_segment_id !== 'all'
            ? campaign.target_segment_id
            : null,
          start_date: campaign.start_date || null,
          end_date: campaign.end_date || null,
          status: 'draft',
        })
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
    mutationFn: async ({ customerId, rewardId }: {
      customerId: string; 
      rewardId: string; 
      pointsToRedeem?: number;
    }) => {
      const { data, error } = await callUntypedRpc<unknown>('redeem_loyalty_reward', {
        _customer_id: customerId,
        _reward_id: rewardId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-full-data'] });
      toast.success('تم استرداد النقاط بنجاح');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'خطأ في استرداد النقاط');
    },
  });

  return {
    customerSegments,
    segmentsLoading,
    loyaltyRewards,
    rewardsLoading,
    marketingCampaigns,
    campaignsLoading,
    campaignSends,
    campaignSendsLoading,
    createSegment: createSegmentMutation.mutateAsync,
    createCampaign: createCampaignMutation.mutateAsync,
    redeemPoints: redeemPointsMutation.mutate,
    isCreatingCampaign: createCampaignMutation.isPending,
    isCreatingSegment: createSegmentMutation.isPending,
    isRedeemingPoints: redeemPointsMutation.isPending,
  };
};
