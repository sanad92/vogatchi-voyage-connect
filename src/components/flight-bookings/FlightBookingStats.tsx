import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, Users, DollarSign } from "lucide-react";
import { FlightBooking } from "@/types/flightBooking";
import { CURRENCY_SYMBOLS, SupportedCurrency } from "@/types/currency";

interface FlightBookingStatsProps {
  bookings: FlightBooking[];
}

const formatByCurrency = (amount: number, currency: SupportedCurrency) => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${Math.round(amount).toLocaleString('en-US')} ${symbol}`;
};

const FlightBookingStats = ({ bookings }: FlightBookingStatsProps) => {
  const totalPassengers = bookings.reduce((sum, b) => sum + (b.number_of_passengers || 0), 0);

  // تجميع المبيعات والأرباح حسب العملة الأصلية لكل حجز
  const salesByCurrency: Record<string, number> = {};
  const profitByCurrency: Record<string, number> = {};
  bookings.forEach((b) => {
    const cur = (b.currency || 'EGP') as SupportedCurrency;
    salesByCurrency[cur] = (salesByCurrency[cur] || 0) + (Number(b.total_cost) || 0);
    profitByCurrency[cur] = (profitByCurrency[cur] || 0) + (Number(b.total_profit) || 0);
  });

  const currencies = Array.from(
    new Set([...Object.keys(salesByCurrency), ...Object.keys(profitByCurrency)])
  ) as SupportedCurrency[];

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
          <div className="flex items-center justify-between min-h-[3.5rem]">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
              {currencies.length === 0 ? (
                <p className="text-2xl font-bold">—</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {currencies.map((c) => (
                    <p key={c} className="text-base font-bold leading-tight">
                      {formatByCurrency(salesByCurrency[c] || 0, c)}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500 shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between min-h-[3.5rem]">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">إجمالي الأرباح</p>
              {currencies.length === 0 ? (
                <p className="text-2xl font-bold">—</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {currencies.map((c) => (
                    <p key={c} className="text-base font-bold leading-tight">
                      {formatByCurrency(profitByCurrency[c] || 0, c)}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-purple-500 shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlightBookingStats;
