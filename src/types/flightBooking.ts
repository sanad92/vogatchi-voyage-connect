
import { SupportedCurrency } from './currency';
import { BookingStatus } from './common';

export interface Airport {
  id: string;
  name: string;
  city: string;
  iata_code: string;
  country: string;
  is_active: boolean;
  created_at: string;
}

export interface Airline {
  id: string;
  name: string;
  iata_code: string;
  is_active: boolean;
  created_at: string;
}

export interface FlightClass {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  baggage_allowance?: string;
}

export interface PassengerDetail {
  name: string;
  passport_number: string;
  nationality: string;
  date_of_birth: string;
  gender: string;
}

export interface BaggageInfo {
  checked_bags: number;
  weight_limit: number;
  additional_fees: number;
}

export interface FlightBooking {
  id: string;
  booking_reference: string;
  customer_id?: string;
  customer_name: string;
  departure_airport_id: string;
  departure_airport: Airport;
  arrival_airport_id: string;
  arrival_airport: Airport;
  departure_date: string;
  departure_time?: string;
  arrival_date: string;
  arrival_time?: string;
  airline_id: string;
  airline: Airline;
  flight_number?: string;
  flight_class_id: string;
  flight_class: FlightClass;
  number_of_passengers: number;
  passenger_details?: PassengerDetail[];
  ticket_price_per_person: number;
  taxes_and_fees?: number;
  total_cost: number;
  currency: SupportedCurrency;
  supplier_cost: number;
  supplier_name: string;
  booking_agent_id?: string;
  booking_agent_name: string;
  booking_date: string;
  status_id?: string;
  booking_status?: BookingStatus;
  paid_amount?: number;
  remaining_amount?: number;
  payment_due_date?: string;
  payment_method?: string;
  confirmation_number?: string;
  ticket_numbers?: string[];
  baggage_info?: BaggageInfo;
  meal_preferences?: string;
  seat_preferences?: string;
  special_requests?: string;
  supplier_reference?: string;
  total_profit?: number;
  exchange_rate_to_egp?: number;
  total_cost_egp?: number;
  supplier_cost_egp?: number;
  invoice_sent: boolean;
  invoice_sent_date?: string;
  voucher_sent: boolean;
  voucher_sent_date?: string;
  supplier_payment_sent: boolean;
  supplier_payment_sent_date?: string;
  is_round_trip?: boolean;
  return_flight_id?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NewFlightBooking {
  customer_id?: string;
  customer_name: string;
  departure_airport_id: string;
  arrival_airport_id: string;
  departure_date: string;
  departure_time?: string;
  arrival_date: string;
  arrival_time?: string;
  airline_id: string;
  flight_number?: string;
  flight_class_id: string;
  number_of_passengers: number;
  passenger_details?: PassengerDetail[];
  ticket_price_per_person: number;
  taxes_and_fees?: number;
  total_cost: number; // Make this required to match database schema
  currency?: SupportedCurrency;
  supplier_cost: number;
  supplier_name: string;
  booking_agent_id?: string;
  booking_agent_name: string;
  status_id?: string;
  paid_amount?: number;
  payment_due_date?: string;
  payment_method?: string;
  confirmation_number?: string;
  ticket_numbers?: string[];
  baggage_info?: BaggageInfo;
  meal_preferences?: string;
  seat_preferences?: string;
  special_requests?: string;
  supplier_reference?: string;
  is_round_trip?: boolean;
  return_flight_id?: string;
  booking_reference?: string;
}
