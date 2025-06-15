
// الأنواع المشتركة في النظام
export interface BookingStatus {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  color: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  name_ar: string;
  color: string;
  description?: string;
  minimum_bookings?: number;
  minimum_total_spent?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// أنواع الدفع المدعومة
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online';

// حالات الدفع
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'cancelled' | 'overdue';

// أنواع الحجوزات
export type BookingType = 'hotel' | 'flight' | 'transport' | 'car_rental';
