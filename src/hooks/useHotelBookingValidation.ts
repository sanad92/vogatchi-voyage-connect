
import { BookingValidators } from '@/utils/formValidation';
import { Customer } from '@/types/customer';

export const useHotelBookingValidation = () => {
  const validateBookingData = (data: any, selectedCustomer: Customer | null): boolean => {
    return BookingValidators.hotel(data, selectedCustomer);
  };

  return {
    validateBookingData
  };
};

