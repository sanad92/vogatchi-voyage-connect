
export interface WhatsAppConversation {
  id: string;
  phone_number: string;
  customer_id?: string;
  assigned_to?: string;
  status: 'active' | 'closed' | 'pending' | 'transferred';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  last_message_at: string;
  auto_assigned: boolean;
  assignment_reason?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    email?: string;
  };
  assigned_employee?: {
    full_name: string;
    employee_code: string;
  };
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_id?: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
  content?: string;
  media_url?: string;
  media_mime_type?: string;
  template_name?: string;
  template_language?: string;
  template_parameters?: any;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  error_code?: string;
  error_message?: string;
  sent_by?: string;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'pending' | 'approved' | 'rejected';
  header_type?: 'text' | 'image' | 'video' | 'document';
  header_text?: string;
  body_text: string;
  footer_text?: string;
  buttons?: any;
  variables?: any;
  created_at: string;
  updated_at: string;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category?: string;
  is_global: boolean;
  created_by?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppSession {
  id: string;
  employee_id: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  active_conversations_count: number;
  max_conversations: number;
  last_activity: string;
  auto_assignment_enabled: boolean;
  created_at: string;
  updated_at: string;
}
