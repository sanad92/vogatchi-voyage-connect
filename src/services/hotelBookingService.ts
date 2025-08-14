import { api, ApiResponse } from './api';

export interface HotelBookingData {
  customer_id: string;
  hotel_name?: string;
  destination_city?: string;
  check_in_date: string;
  check_out_date: string;
  selling_price_per_night: number;
  cost_per_night: number;
  adults: number;
  children: number;
  room_type?: string;
  meal_plan?: string;
}

export interface HotelBookingResponse {
  success: boolean;
  id: string;
  booking_number: string;
}

class HotelBookingService {
  async createHotelBooking(bookingData: HotelBookingData): Promise<HotelBookingResponse> {
    const response = await api.post<HotelBookingResponse>('/bookings/hotel/create.php', bookingData);
    return response as HotelBookingResponse;
  }
}

export const hotelBookingService = new HotelBookingService();