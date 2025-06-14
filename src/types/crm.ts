
export interface CustomerSegment {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  color: string;
  minimum_bookings: number;
  minimum_total_spent: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface LoyaltyPoints {
  id: string;
  customer_id: string;
  points_earned: number;
  points_used: number;
  current_balance: number;
  booking_id?: string;
  transaction_type: 'earned' | 'redeemed' | 'expired';
  description?: string;
  created_at: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  points_required: number;
  reward_type: 'discount_percentage' | 'discount_amount' | 'free_service';
  reward_value: number;
  is_active: boolean;
  created_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  campaign_type: 'email' | 'whatsapp' | 'sms';
  target_segment_id?: string;
  message_template: string;
  start_date: string;
  end_date?: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignSend {
  id: string;
  campaign_id: string;
  customer_id: string;
  sent_at?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  response?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  action_url?: string;
  expires_at?: string;
  created_at: string;
}
