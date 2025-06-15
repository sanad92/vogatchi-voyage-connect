
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HotelBooking, HotelSupplier } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";

interface UseHotelBookingDataProps {
  booking?: HotelBooking | null;
}

export const useHotelBookingData = ({ booking }: UseHotelBookingDataProps) => {
  const [suppliers, setSuppliers] = useState<HotelSupplier[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase
        .from('hotel_suppliers')
        .select('*')
        .order('name');
      if (data) setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  // Fetch existing customer if editing
  useEffect(() => {
    const fetchCustomer = async () => {
      if (booking?.customer_id) {
        const { data } = await supabase
          .from('customers')
          .select('id, name, phone, email, nationality')
          .eq('id', booking.customer_id)
          .single();
        if (data) {
          setSelectedCustomer(data);
        }
      }
    };
    fetchCustomer();
  }, [booking]);

  // Function to fetch existing special requests
  const fetchExistingRequests = async (setValue: any) => {
    if (booking?.id) {
      const { data } = await supabase
        .from('booking_special_requests')
        .select('special_request_type_id, custom_request_text')
        .eq('booking_id', booking.id);
      
      if (data) {
        const requestIds = data
          .filter(req => req.special_request_type_id)
          .map(req => req.special_request_type_id!);
        setSelectedRequests(requestIds);
        
        const customRequest = data.find(req => req.custom_request_text)?.custom_request_text;
        if (customRequest) {
          setValue('custom_request', customRequest);
        }
      }
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  return {
    suppliers,
    selectedCustomer,
    selectedRequests,
    setSelectedRequests,
    handleCustomerSelect,
    fetchExistingRequests
  };
};
