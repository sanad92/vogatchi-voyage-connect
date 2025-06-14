
-- Add customer_id column to hotel_bookings table
ALTER TABLE public.hotel_bookings 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for better performance
CREATE INDEX idx_hotel_bookings_customer_id ON public.hotel_bookings(customer_id);

-- Update the calculate_booking_values function to handle customer_id
CREATE OR REPLACE FUNCTION calculate_booking_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate number of nights
  NEW.number_of_nights = NEW.check_out_date - NEW.check_in_date;
  
  -- Calculate total cost to customer
  NEW.total_cost_customer = NEW.selling_price_per_night * NEW.number_of_nights;
  
  -- Calculate total profit
  NEW.total_profit = (NEW.selling_price_per_night - NEW.cost_per_night) * NEW.number_of_nights;
  
  -- Calculate remaining amount
  NEW.remaining_amount = NEW.total_cost_customer - COALESCE(NEW.paid_amount, 0);
  
  -- If customer_id is provided, update customer_name from customers table
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO NEW.customer_name FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
