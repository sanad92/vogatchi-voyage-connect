
import { useMemo } from "react";

interface UseBookingCalculationsProps {
  checkInDate?: string;
  checkOutDate?: string;
  costPerNight?: number;
  sellingPricePerNight?: number;
}

export const useBookingCalculations = ({
  checkInDate,
  checkOutDate,
  costPerNight,
  sellingPricePerNight
}: UseBookingCalculationsProps) => {
  return useMemo(() => {
    const numberOfNights = checkInDate && checkOutDate ? 
      Math.max(0, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;

    const totalCostCustomer = sellingPricePerNight ? sellingPricePerNight * numberOfNights : 0;
    const totalProfit = (sellingPricePerNight && costPerNight) ? (sellingPricePerNight - costPerNight) * numberOfNights : 0;

    return {
      numberOfNights,
      totalCostCustomer,
      totalProfit
    };
  }, [checkInDate, checkOutDate, costPerNight, sellingPricePerNight]);
};
