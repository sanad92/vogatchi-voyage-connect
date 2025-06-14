
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, Users, DollarSign } from "lucide-react";
import { FlightBooking } from "@/types/flightBooking";

interface FlightBookingStatsProps {
  bookings: FlightBooking[];
}

const FlightBookingStats = ({ bookings }: FlightBookingStatsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPassengers = bookings.reduce((sum, booking) => sum + booking.number_of_passengers, 0);
  const totalSales = bookings.reduce((sum, booking) => sum + booking.total_cost, 0);
  const totalProfit = bookings.reduce((sum, booking) => sum + (booking.total_profit || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الحجوزات</p>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </div>
            <Plane className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المسافرين</p>
              <p className="text-2xl font-bold">{totalPassengers}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المبيعات</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الأرباح</p>
              <p className="text-2xl font-bold">{formatCurrency(totalProfit)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlightBookingStats;
