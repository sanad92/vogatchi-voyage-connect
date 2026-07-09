import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from '@/hooks/use-toast';

export interface ChatbotSettings {
  id?: string;
  organization_id?: string;
  is_enabled: boolean;
  bot_name: string;
  system_prompt: string;
  welcome_message: string | null;
  handoff_keywords: string[];
  max_bot_replies: number;
  model: string;
  respond_only_outside_hours: boolean;
  auto_handoff_on_error: boolean;
}

const DEFAULTS: ChatbotSettings = {
  is_enabled: false,
  bot_name: 'مساعد Vogatchi',
  system_prompt: 'أنت مساعد ذكي لوكالة سفر Vogatchi. رد بلطف واحترافية.',
  welcome_message: 'مرحبًا! أنا مساعدك الذكي. كيف أستطيع مساعدتك؟',
  handoff_keywords: ['موظف', 'بشري', 'شخص حقيقي', 'agent', 'human'],
  max_bot_replies: 5,
  model: 'google/gemini-2.5-flash',
  respond_only_outside_hours: false,
  auto_handoff_on_error: true,
};

export const useWhatsAppChatbot = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['whatsapp-chatbot-settings', orgId],
    queryFn: async () => {
      if (!orgId) return DEFAULTS;
      const { data } = await (supabase as any)
        .from('whatsapp_chatbot_settings')
        .select('*').eq('organization_id', orgId).maybeSingle();
      return (data as ChatbotSettings) || DEFAULTS;
    },
    enabled: !!orgId,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['whatsapp-chatbot-interactions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await (supabase as any)
        .from('whatsapp_chatbot_interactions')
        .select('*').eq('organization_id', orgId)
        .order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!orgId,
  });

  const save = useMutation({
    mutationFn: async (input: Partial<ChatbotSettings>) => {
      if (!orgId) throw new Error('no org');
      const { error } = await (supabase as any)
        .from('whatsapp_chatbot_settings')
        .upsert({ ...DEFAULTS, ...settings, ...input, organization_id: orgId },
          { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-chatbot-settings', orgId] });
      toast({ title: 'تم حفظ إعدادات البوت' });
    },
    onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
  });

  return {
    settings: settings || DEFAULTS,
    interactions,
    isLoading,
    save: save.mutateAsync,
    isSaving: save.isPending,
  };
};
