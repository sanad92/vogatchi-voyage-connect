
import { CustomerSegment } from './common';

export interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  address?: string;
  passport_number?: string;
  segment_id?: string;
}

export interface Customer {
  id: string;
  name: string;
  full_name?: string; // إضافة full_name كخاصية اختيارية للتوافق
  phone?: string | null;
  email?: string | null;
  nationality?: string;
  segment_id?: string;
  total_bookings?: number;
  total_spent?: number;
  /** Currency-safe totals derived from confirmed unified bookings. */
  spend_by_currency?: Record<string, number>;
  /** Currency-safe confirmed booking counts used to calculate real averages. */
  booking_count_by_currency?: Record<string, number>;
  loyalty_points?: number;
  last_booking_date?: string;
  segment?: CustomerSegment;
  created_at?: string;
  updated_at?: string;
  address?: string;
  passport_number?: string | null;
  preferences?: Record<string, unknown> | null;
  communication_preferences?: Partial<Record<'whatsapp' | 'email' | 'sms', boolean>> | null;
  whatsapp_opt_out?: boolean;
  whatsapp_opt_out_at?: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
  
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

export interface DuplicateCustomerSummary {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  archived_at?: string | null;
}

export interface DuplicateContactResult {
  hasDuplication: boolean;
  normalizedPhone?: string | null;
  phoneResult: {
    isDuplicate: boolean;
    existingCustomer?: DuplicateCustomerSummary | null;
    message?: string | null;
    duplicateCount?: number;
    allDuplicates?: DuplicateCustomerSummary[];
  };
  emailResult: {
    isDuplicate: boolean;
    existingCustomer?: DuplicateCustomerSummary | null;
    message?: string | null;
  };
}

export interface UseCustomerFormProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  initialData?: Partial<CustomerData>;
  isEditMode?: boolean;
  customerId?: string;
}
