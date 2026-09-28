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

const digits = (v?: string | null) => (v || '').replace(/\D/g, '');

export default function QuoteWhatsAppFollowupButton({ quote }: { quote: Quote & { customers?: { name?: string; phone?: string } | null } }) {
  const orgId = useOrgId();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['quote-wa-conversation', orgId, quote.id],
    queryFn: async () => {
      const db = supabase as any;
      const [settings, byCustomer] = await Promise.all([
        db.from('organization_settings').select('quote_followup_template').eq('organization_id', orgId).maybeSingle(),
        quote.customer_id
          ? db.from('whatsapp_conversations').select('id').eq('organization_id', orgId).eq('customer_id', quote.customer_id)
              .order('last_message_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      let conversationId: string | null = byCustomer.data?.id ?? null;
      const phone = digits(quote.customers?.phone);
      if (!conversationId && phone) {
        const { data: byPhone } = await db.from('whatsapp_conversations').select('id').eq('organization_id', orgId)
          .ilike('phone_number', `%${phone.slice(-9)}`).order('last_message_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
        conversationId = byPhone?.id ?? null;
      }
      return { conversationId, template: settings.data?.quote_followup_template || DEFAULT_FOLLOWUP_TEMPLATE };
    },
    enabled: !!orgId,
  });

  const open = () => {
    if (!data?.conversationId) return;
    const text = fillFollowupTemplate(data.template, { ...quote, customerName: quote.customers?.name });
    const params = new URLSearchParams({ quote: quote.id, text });
    navigate(`/whatsapp-inbox/${data.conversationId}?${params.toString()}`);
  };

  return (
    <Button variant="outline" size="sm" onClick={open} disabled={!data?.conversationId}
      title={data && !data.conversationId ? 'لا توجد محادثة واتساب مرتبطة بهذا العميل' : undefined}>
      <MessageCircle className="h-4 w-4 ml-1" /> متابعة على واتساب
    </Button>
  );
}
