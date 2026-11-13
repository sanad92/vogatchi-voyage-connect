import { supabase } from '@/integrations/supabase/client';
import { allRows } from '@/lib/pagedRows';

export const companyProfilePath = (id: string) => `/platform/organizations/followup?company=${encodeURIComponent(id)}`;
export const billingFollowupPath = '/platform/subscriptions/followup';
export const dueCompanyFollowupPath = '/platform/organizations/followup/due';

export const contactChannels = { call: 'مكالمة', whatsapp: 'واتساب', email: 'إيميل' };
export const contactOutcomes = {
  reached: 'تم التواصل', no_reply: 'مفيش رد', training_requested: 'طلب تدريب',
  renewal_promised: 'وعد بالتجديد', other: 'نتيجة أخرى',
};

export const contactGapLabels: Record<string, string> = {
  company_phone: 'هاتف المؤسسة',
  company_email: 'بريد المؤسسة',
  owner: 'مالك نشط للمؤسسة',
  owner_name: 'اسم مسؤول المؤسسة',
  owner_phone: 'موبايل مسؤول المؤسسة',
  owner_email: 'بريد المسؤول',
};

export const loadPlatformContactGaps = (signal: AbortSignal) => allRows((from, to) =>
  supabase.rpc('platform_company_contact_gaps').order('organization_id').range(from, to).abortSignal(signal),
);
