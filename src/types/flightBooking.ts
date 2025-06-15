
import { SupportedCurrency } from './currency';
import { Customer } from './customer';

export interface Airline {
  id: string;
  name: string;
  iata_code?: string;
  icao_code?: string;
  country?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Airport {
  id: string;
  name: string;
  city: string;
  country: string;
  iata_code: string;
  icao_code?: string;
  timezone?: string;
  is_active: boolean;
  created_at: string;
}

export interface FlightClass {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  description?: string;
  baggage_allowance?: string;
  created_at: string;
}

export interface PassengerDetail {
  name: string;
  passport: string;
  date_of_birth: string;
  nationality: string;
}

export interface BaggageInfo {
  checked?: string;
  carry_on?: string;
  extra_baggage?: string;
}

export interface FlightBooking {
  id: string;
  booking_reference: string;
  customer_id?: string;
  customer_name: string;
  booking_agent_name: string;
  booking_date: string;
  
  // تفاصيل الرحلة
  departure_airport_id: string;
  arrival_airport_id: string;
  departure_date: string;
  departure_time?: string;
  arrival_date: string;
  arrival_time?: string;
  flight_number?: string;
  airline_id: string;
  flight_class_id: string;
  
  // تفاصيل المسافرين
  number_of_passengers: number;
  passenger_details?: PassengerDetail[];
  
  // معلومات الأمتعة والخدمات
  baggage_info?: BaggageInfo;
  special_requests?: string;
  meal_preferences?: string;
  seat_preferences?: string;
  
  // المعلومات المالية
  ticket_price_per_person: number;
  taxes_and_fees?: number;
  total_cost: number;
  supplier_cost: number;
  total_profit?: number;
  currency: SupportedCurrency;
  
  // معلومات الدفع
  payment_method?: string;
  paid_amount?: number;
  remaining_amount?: number;
  payment_due_date?: string;
  
  // حالة الحجز
  status_id?: string;
  confirmation_number?: string;
  ticket_numbers?: string[];
  is_round_trip: boolean;
  return_flight_id?: string;
  
  // معلومات الموردين
  supplier_name: string;
  supplier_reference?: string;
  
  // التواريخ والتتبع
  invoice_sent: boolean;
  invoice_sent_date?: string;
  voucher_sent: boolean;
  voucher_sent_date?: string;
  supplier_payment_sent: boolean;
  supplier_payment_sent_date?: string;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  departure_airport?: Airport;
  arrival_airport?: Airport;
  airline?: Airline;
  flight_class?: FlightClass;
  booking_status?: any;
}

export interface NewFlightBooking {
  customer_id?: string;
  customer_name: string;
  booking_agent_name: string;
  
  // تفاصيل الرحلة
  departure_airport_id: string;
  arrival_airport_id: string;
  departure_date: string;
  departure_time?: string;
  arrival_date: string;
  arrival_time?: string;
  flight_number?: string;
  airline_id: string;
  flight_class_id: string;
  
  // تفاصيل المسافرين
  number_of_passengers: number;
  passenger_details?: PassengerDetail[];
  
  // معلومات الأمتعة والخدمات
  baggage_info?: BaggageInfo;
  special_requests?: string;
  meal_preferences?: string;
  seat_preferences?: string;
  
  // المعلومات المالية
  ticket_price_per_person: number;
  taxes_and_fees?: number;
  supplier_cost: number;
  currency?: SupportedCurrency;
  
  // معلومات الدفع
  payment_method?: string;
  paid_amount?: number;
  payment_due_date?: string;
  
  // معلومات أخرى
  is_round_trip?: boolean;
  supplier_name: string;
  supplier_reference?: string;
  confirmation_number?: string;
}
