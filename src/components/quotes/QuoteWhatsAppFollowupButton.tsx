import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import type { Quote } from '@/hooks/useQuotes';

export const DEFAULT_FOLLOWUP_TEMPLATE =
  'مرحباً {customer_name}، نتابع معك بخصوص عرض السعر رقم {quote_number} لرحلتك إلى {destination}. هل لديك أي استفسار أو تحب نعدّل شيئاً في العرض؟';

export const fillFollowupTemplate = (tpl: string, q: Partial<Quote> & { customerName?: string | null }) =>
  tpl
    .split('{customer_name}').join(q.customerName || q.customer_name || '')
    .split('{quote_number}').join(q.quote_number || '')
    .split('{destination}').join(q.destination || 'وجهتك')
    .split('{total}').join(q.total_amount != null ? `${Number(q.total_amount).toLocaleString()} ${q.currency || ''}`.trim() : '')
    .replace(/\s{2,}/g, ' ').trim();

export default function QuoteWhatsAppFollowupButton({ quote, sourceConversationId }: { quote: Quote; sourceConversationId?: string }) {
  const orgId = useOrgId();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['quote-wa-conversation', orgId, quote.id, sourceConversationId],
    queryFn: async () => {
      const settings = supabase.from('organization_settings').select('quote_followup_template').eq('organization_id', orgId!).maybeSingle();
      const conversations = supabase.from('whatsapp_conversations').select('id').eq('organization_id', orgId!);
      const phone = quote.customers?.phone?.trim();
      const matching = sourceConversationId
        ? conversations.eq('id', sourceConversationId).maybeSingle()
        : quote.customer_id
          ? conversations.eq('customer_id', quote.customer_id).order('last_message_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
          : phone
            ? conversations.in('phone_number', [phone, phone.replace(/\D/g, '')]).limit(2)
            : Promise.resolve({ data: null, error: null });
      const [template, conversation] = await Promise.all([settings, matching]);
      if (conversation.error) throw conversation.error;
      const matches = conversation.data;
      const conversationId = Array.isArray(matches) ? (matches.length === 1 ? matches[0].id : null) : matches?.id ?? null;
      return { conversationId, template: template.data?.quote_followup_template || DEFAULT_FOLLOWUP_TEMPLATE };
    },
    enabled: !!orgId,
  });

  const open = () => {
    if (!data?.conversationId) return;
    if (quote.status === 'draft') {
      navigate(`/whatsapp-inbox/${data.conversationId}`);
      return;
    }
    const text = fillFollowupTemplate(data.template, { ...quote, customerName: quote.customers?.name });
    const params = new URLSearchParams({ quote: quote.id, text });
    navigate(`/whatsapp-inbox/${data.conversationId}?${params.toString()}`);
  };

  return (
    <Button variant="outline" size="sm" onClick={open} disabled={!data?.conversationId}
      title={data && !data.conversationId ? 'لا توجد محادثة واتساب مرتبطة بهذا العميل' : undefined}>
      <MessageCircle className="h-4 w-4 ml-1" /> {quote.status === "draft" ? "فتح محادثة واتساب" : "متابعة على واتساب"}
    </Button>
  );
}
