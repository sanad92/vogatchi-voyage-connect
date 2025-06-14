
export interface HotelBooking {
  id: string;
  customer_id?: string;
  customer_name: string;
  internal_booking_number: string;
  booking_date: string;
  booking_agent_name: string;
  hotel_name: string;
  hotel_star_rating: number;
  destination_city: string;
  check_in_date: string;
  check_out_date: string;
  number_of_nights: number;
  room_type: string;
  number_of_adults: number;
  number_of_children: number;
  children_ages?: string;
  meal_plan: MealPlan;
  booking_reference_supplier?: string;
  cancellation_policy?: string;
  supplier_name: string;
  cost_per_night: number;
  selling_price_per_night: number;
  total_cost_customer: number;
  total_profit: number;
  payment_method?: string;
  paid_amount: number;
  remaining_amount: number;
  payment_due_date?: string;
  invoice_sent: boolean;
  supplier_payment_sent: boolean;
  voucher_sent: boolean;
  invoice_sent_date?: string;
  supplier_payment_sent_date?: string;
  voucher_sent_date?: string;
  created_at: string;
  updated_at: string;
}

export interface HotelSupplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  payment_terms?: string;
  is_direct_hotel: boolean;
  created_at: string;
}

export type MealPlan = 'RO' | 'BB' | 'HB' | 'FB' | 'ALL' | 'UAI' | 'SAL';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
}

export interface SpecialRequestType {
  id: string;
  name: string;
  category: string; // Changed from union type to string to match database
  has_extra_cost: boolean;
  extra_cost_amount: number;
  is_active: boolean;
  created_at: string;
}

export interface BookingSpecialRequest {
  id: string;
  booking_id: string;
  special_request_type_id?: string;
  custom_request_text?: string;
  notes?: string;
  created_at: string;
  special_request_type?: SpecialRequestType;
}

export interface NewHotelBooking {
  customer_id?: string;
  customer_name: string;
  booking_agent_name: string;
  hotel_name: string;
  hotel_star_rating: number;
  destination_city: string;
  check_in_date: string;
  check_out_date: string;
  room_type: string;
  number_of_adults: number;
  number_of_children: number;
  children_ages?: string;
  meal_plan: MealPlan;
  booking_reference_supplier?: string;
  cancellation_policy?: string;
  supplier_name: string;
  cost_per_night: number;
  selling_price_per_night: number;
  payment_method?: string;
  paid_amount?: number;
  payment_due_date?: string;
  special_requests?: string[]; // IDs of selected special request types
  custom_request?: string; // Free text for custom requests
}
