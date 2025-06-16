
import { CustomerSegment } from './common';

export interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  address?: string;
  segment_id?: string;
}

export interface Customer {
  id: string;
  name: string;
  full_name?: string; // إضافة full_name كخاصية اختيارية للتوافق
  phone: string;
  email?: string;
  nationality?: string;
  segment_id?: string;
  total_bookings?: number;
  total_spent?: number;
  loyalty_points?: number;
  last_booking_date?: string;
  segment?: CustomerSegment;
  created_at?: string;
  updated_at?: string;
  address?: string;
  passport_number?: string;
  preferences?: any;
  communication_preferences?: any;
  
  // الحقول الجديدة لنظام المتابعة
  created_by?: string;
  created_by_profile?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  last_follow_up_date?: string;
  last_follow_up_by?: string;
  last_follow_up_by_profile?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface UseCustomerFormProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  initialData?: Partial<CustomerData>;
  isEditMode?: boolean;
  customerId?: string;
}
