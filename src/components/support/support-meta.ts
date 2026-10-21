export const TICKET_CATEGORIES: Record<string, string> = {
  general: 'استفسار عام',
  technical: 'مشكلة تقنية',
  billing: 'الاشتراك والفوترة',
  accounting: 'الحسابات والقيود',
  whatsapp: 'واتساب',
  data: 'البيانات والاستيراد',
  feature_request: 'طلب ميزة',
};

export const TICKET_PRIORITIES: Record<string, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

export const TICKET_STATUSES: Record<string, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  waiting_customer: 'بانتظار ردكم',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};

export const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  in_progress: 'secondary',
  waiting_customer: 'outline',
  resolved: 'outline',
  closed: 'outline',
};

export interface SupportTicket {
  id: string;
  organization_id: string;
  ticket_number: number;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  sla_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  organizations?: { name: string } | null;
}

export const isSlaBreached = (t: SupportTicket) =>
  !t.first_response_at && !!t.sla_due_at && new Date(t.sla_due_at).getTime() < Date.now() && !['resolved', 'closed'].includes(t.status);
