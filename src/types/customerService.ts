
export interface CustomerFollowUp {
  id: string;
  booking_id: string;
  customer_id: string;
  follow_up_type: 'pre_arrival_2days' | 'pre_arrival_1day' | 'arrival_day' | 'post_checkout' | 
                  'booking_confirmation' | 'payment_reminder' | 'upsell_opportunity' | 
                  'passport_renewal' | 'satisfaction_survey' | 'loyalty_offers' | 'complaint_followup';
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  completed_at?: string;
  notes?: string;
  last_contact_date?: string;
  customer_value?: 'vip' | 'regular' | 'new';
  created_at: string;
  updated_at: string;
}

export interface CustomerCommunication {
  id: string;
  customer_id: string;
  booking_id?: string;
  follow_up_id?: string;
  communication_type: 'call' | 'whatsapp' | 'email' | 'sms' | 'meeting' | 'push_notification' | 'messenger';
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

// Helper functions for labels and colors
export const getFollowUpTypeLabel = (type: string) => {
  const labels = {
    'pre_arrival_2days': 'قبل الوصول بيومين',
    'pre_arrival_1day': 'قبل الوصول بيوم',
    'arrival_day': 'يوم الوصول',
    'post_checkout': 'بعد المغادرة',
    'booking_confirmation': 'تأكيد الحجز',
    'payment_reminder': 'تذكير بالدفع',
    'upsell_opportunity': 'عرض خدمات إضافية',
    'passport_renewal': 'تجديد جواز السفر',
    'satisfaction_survey': 'استطلاع الرضا',
    'loyalty_offers': 'عروض الولاء',
    'complaint_followup': 'متابعة شكوى'
  };
  return labels[type as keyof typeof labels] || type;
};

export const getPriorityColor = (priority: string) => {
  const colors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    normal: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getCustomerValueColor = (value: string) => {
  const colors = {
    vip: 'bg-purple-100 text-purple-800 border-purple-200',
    regular: 'bg-green-100 text-green-800 border-green-200',
    new: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };
  return colors[value as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getCustomerValueLabel = (value: string) => {
  const labels = {
    vip: 'VIP',
    regular: 'عميل دائم',
    new: 'عميل جديد'
  };
  return labels[value as keyof typeof labels] || value;
};
