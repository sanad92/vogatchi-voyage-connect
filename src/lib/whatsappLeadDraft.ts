import { supabase } from '@/integrations/supabase/client';
import type { SopLead } from '@/hooks/useSop';
import type { WhatsAppLeadDraft } from '../../supabase/functions/_shared/whatsapp-lead-draft';

export type { WhatsAppLeadDraft };

export async function reviewWhatsAppLeadDraft(organizationId: string, conversationId: string): Promise<WhatsAppLeadDraft> {
  const { data, error } = await supabase.functions.invoke<{ success: boolean; data: WhatsAppLeadDraft }>('ai-extract-lead', {
    body: { organization_id: organizationId, conversation_id: conversationId },
  });
  if (error || !data?.success || !data.data || typeof data.data !== 'object') {
    throw new Error('تعذّر استخراج مسودة الطلب من هذه المحادثة');
  }
  return data.data;
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
