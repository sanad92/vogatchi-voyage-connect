import type { SopLead, SopLeadActivity } from '@/hooks/useSop';
import type { SopLeadStage } from '@/lib/sop';

export const OPEN_LEAD_STAGES: SopLeadStage[] = [
  'new', 'assigned', 'qualified', 'pricing_requested', 'quoted', 'follow_up',
  'accepted_pending_recheck', 'rechecked', 'payment_pending',
];

export const CLOSED_LEAD_STAGES: SopLeadStage[] = ['won', 'lost', 'cancelled'];

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  website: 'الموقع',
  facebook: 'فيسبوك',
  instagram: 'إنستجرام',
  referral: 'ترشيح',
  walk_in: 'زيارة مباشرة',
  repeat: 'عميل متكرر',
  phone: 'مكالمة',
  other: 'أخرى',
};

export const LEAD_ACTIVITY_LABELS: Record<SopLeadActivity['activity_type'], string> = {
  call: 'مكالمة',
  whatsapp: 'واتساب',
  email: 'بريد إلكتروني',
  meeting: 'اجتماع',
  note: 'ملاحظة',
  task: 'مهمة',
};

export const isLeadOpen = (stage: SopLeadStage) => OPEN_LEAD_STAGES.includes(stage);

export const isFollowUpOverdue = (lead: Pick<SopLead, 'next_follow_up_at' | 'stage'>, now = new Date()) => {
  if (!lead.next_follow_up_at || !isLeadOpen(lead.stage)) return false;
  const due = new Date(lead.next_follow_up_at);
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
};

export const isFollowUpToday = (lead: Pick<SopLead, 'next_follow_up_at'>, now = new Date()) => {
  if (!lead.next_follow_up_at) return false;
  const due = new Date(lead.next_follow_up_at);
  if (Number.isNaN(due.getTime())) return false;
  return due.getFullYear() === now.getFullYear()
    && due.getMonth() === now.getMonth()
    && due.getDate() === now.getDate();
};

export interface LeadPipelineStats {
  total: number;
  newLeads: number;
  active: number;
  quoted: number;
  overdue: number;
  won: number;
  lost: number;
  conversionRate: number;
}

export const buildLeadPipelineStats = (leads: SopLead[], now = new Date()): LeadPipelineStats => {
  const won = leads.filter((lead) => lead.stage === 'won').length;
  const lost = leads.filter((lead) => lead.stage === 'lost' || lead.stage === 'cancelled').length;
  const decided = won + lost;
  return {
    total: leads.length,
    newLeads: leads.filter((lead) => lead.stage === 'new').length,
    active: leads.filter((lead) => isLeadOpen(lead.stage) && lead.stage !== 'new').length,
    quoted: leads.filter((lead) => ['quoted', 'follow_up', 'accepted_pending_recheck'].includes(lead.stage)).length,
    overdue: leads.filter((lead) => isFollowUpOverdue(lead, now)).length,
    won,
    lost,
    conversionRate: decided ? Math.round((won / decided) * 1000) / 10 : 0,
  };
};

export const formatLeadDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

