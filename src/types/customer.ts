
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
}

export interface UseCustomerFormProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  initialData?: Partial<CustomerData>;
  isEditMode?: boolean;
  customerId?: string;
}
