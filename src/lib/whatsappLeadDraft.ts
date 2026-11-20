import type { SopLead } from '@/hooks/useSop';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { extractWhatsAppLeadDraft, type WhatsAppLeadDraft } from '../../supabase/functions/_shared/whatsapp-lead-draft';

export type { WhatsAppLeadDraft };

export async function reviewWhatsAppLeadDraft(organizationId: string, conversationId: string): Promise<WhatsAppLeadDraft> {
  const { data, error } = await callUntypedRpc<Array<{ content: string }>>('sop_review_whatsapp_lead_messages', {
    _org: organizationId, _conversation: conversationId,
  });
  if (error || !Array.isArray(data)) {
    throw new Error('تعذّر استخراج مسودة الطلب من هذه المحادثة');
  }
  return extractWhatsAppLeadDraft(data.map(({ content }) => content));
}

export function getWhatsAppLeadDraftDefaults(draft: WhatsAppLeadDraft): Partial<SopLead> {
  return {
    ...(draft.intent && { service_type: draft.intent === 'visa' ? 'other' : draft.intent }),
    ...(draft.destination_city && { destination: draft.destination_city }),
    ...(draft.check_in_date && { check_in: draft.check_in_date }),
    ...(draft.check_out_date && { check_out: draft.check_out_date }),
    ...(draft.adults !== undefined && { adults: draft.adults }),
    ...(draft.children_ages && { children_count: draft.children_ages.length, children_ages: draft.children_ages }),
    ...(draft.budget_amount !== undefined && draft.budget_currency && {
      budget_amount: draft.budget_amount, budget_currency: draft.budget_currency,
    }),
  };
}
