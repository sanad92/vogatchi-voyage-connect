
export interface VehicleType {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  capacity_passengers: number;
  fuel_type: string;
  transmission_type: string;
  features: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransportRoute {
  id: string;
  route_name: string;
  route_name_ar: string;
  departure_city: string;
  arrival_city: string;
  distance_km?: number;
  estimated_duration_hours?: number;
  route_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransportBooking {
  id: string;
  booking_reference: string;
  customer_id?: string;
  customer_name: string;
  supplier_id?: string;
  supplier_name: string;
  route_id?: string;
  vehicle_type_id?: string;
  
  // تفاصيل الرحلة
  departure_date: string;
  departure_time?: string;
  arrival_date?: string;
  arrival_time?: string;
  pickup_location: string;
  dropoff_location: string;
  number_of_passengers: number;
  
  // التكاليف والأسعار
  currency: string;
  cost_per_trip: number;
  selling_price_per_trip: number;
  total_cost: number;
  supplier_cost: number;
  total_profit?: number;
  exchange_rate_to_egp: number;
  total_cost_egp?: number;
  supplier_cost_egp?: number;
  
  // المدفوعات
  paid_amount: number;
  remaining_amount?: number;
  payment_due_date?: string;
  payment_method?: string;
  
  // الحالة والوثائق
  status_id?: string;
  status?: {
    name: string;
    name_ar: string;
    color: string;
  };
  booking_agent_name: string;
  special_requests?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_plate_number?: string;
  
  // الوثائق
  invoice_sent: boolean;
  invoice_sent_date?: string;
  voucher_sent: boolean;
  voucher_sent_date?: string;
  supplier_payment_sent: boolean;
  supplier_payment_sent_date?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CarRental {
  id: string;
  rental_reference: string;
  customer_id?: string;
  customer_name: string;
  supplier_id?: string;
  supplier_name: string;
  vehicle_type_id?: string;
  
  // تفاصيل الإيجار
  rental_start_date: string;
  rental_end_date: string;
  rental_duration_days: number;
  pickup_location: string;
  return_location: string;
  
  // تفاصيل السيارة
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_plate_number?: string;
  vehicle_color?: string;
  fuel_level_pickup: string;
  fuel_level_return?: string;
  
  // التكاليف والأسعار
  currency: string;
  daily_rate: number;
  total_rental_cost: number;
  supplier_daily_cost: number;
  supplier_total_cost: number;
  insurance_cost: number;
  additional_fees: number;
  security_deposit: number;
  total_profit?: number;
  exchange_rate_to_egp: number;
  total_cost_egp?: number;
  supplier_cost_egp?: number;
  
  // المدفوعات
  paid_amount: number;
  remaining_amount?: number;
  deposit_paid: number;
  deposit_returned: number;
  payment_due_date?: string;
  payment_method?: string;
  
  // الحالة والوثائق
  status_id?: string;
  status?: {
    name: string;
    name_ar: string;
    color: string;
  };
  booking_agent_name: string;
  driver_license_number?: string;
  driver_license_expiry?: string;
  insurance_included: boolean;
  gps_included: boolean;
  additional_driver_count: number;
  
  // الوثائق
  contract_sent: boolean;
  contract_sent_date?: string;
  invoice_sent: boolean;
  invoice_sent_date?: string;
  supplier_payment_sent: boolean;
  supplier_payment_sent_date?: string;
  
  // ملاحظات
  pickup_notes?: string;
  return_notes?: string;
  damage_notes?: string;
  special_requirements?: string;
  
  created_at: string;
  updated_at: string;
}
