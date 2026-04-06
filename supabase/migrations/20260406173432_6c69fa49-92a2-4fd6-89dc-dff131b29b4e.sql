
-- Hotel details: add missing columns
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS star_rating integer;
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS adults integer DEFAULT 2;
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS children integer DEFAULT 0;
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS children_ages text;
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS meal_plan text;
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS cancellation_policy text;
ALTER TABLE public.booking_hotel_details ADD COLUMN IF NOT EXISTS booking_reference text;

-- Flight details: add missing columns
ALTER TABLE public.booking_flight_details ADD COLUMN IF NOT EXISTS passengers_count integer DEFAULT 1;
ALTER TABLE public.booking_flight_details ADD COLUMN IF NOT EXISTS flight_class text;
ALTER TABLE public.booking_flight_details ADD COLUMN IF NOT EXISTS ticket_price_per_person numeric DEFAULT 0;
ALTER TABLE public.booking_flight_details ADD COLUMN IF NOT EXISTS taxes_and_fees numeric DEFAULT 0;
ALTER TABLE public.booking_flight_details ADD COLUMN IF NOT EXISTS is_round_trip boolean DEFAULT false;
ALTER TABLE public.booking_flight_details ADD COLUMN IF NOT EXISTS seat_preferences text;
ALTER TABLE public.booking_flight_details ADD COLUMN IF NOT EXISTS meal_preferences text;
