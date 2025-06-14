
export interface CustomerFollowUp {
  id: string;
  booking_id: string;
  customer_id: string;
  follow_up_type: 'pre_arrival_2days' | 'pre_arrival_1day' | 'arrival_day' | 'post_checkout';
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assigned_to?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerCommunication {
  id: string;
  customer_id: string;
  booking_id?: string;
  follow_up_id?: string;
  communication_type: 'call' | 'whatsapp' | 'email' | 'sms' | 'meeting';
  direction: 'inbound' | 'outbound';
  status: 'successful' | 'no_answer' | 'busy' | 'failed' | 'scheduled';
  content?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  completed_at?: string;
  handled_by: string;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  booking_id?: string;
  note_type: 'general' | 'preference' | 'complaint' | 'special_request' | 'medical' | 'dietary';
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerSatisfaction {
  id: string;
  customer_id: string;
  booking_id: string;
  overall_rating?: number;
  service_rating?: number;
  communication_rating?: number;
  feedback?: string;
  survey_sent_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  nationality?: string;
  passport_number?: string;
  bookings?: any[];
  communications?: CustomerCommunication[];
  notes?: CustomerNote[];
  follow_ups?: CustomerFollowUp[];
  created_at: string;
  updated_at: string;
}
