
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface CustomerSelectionStepProps {
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  customers: any[];
  selectedCustomer: any;
  setSelectedCustomer: (customer: any) => void;
  bookingType: string;
  setBookingType: (type: string) => void;
  bookings: any[];
  selectedBooking: any;
  handleSelectBooking: (booking: any) => void;
  getBookingTitle: (booking: any) => string;
  getBookingReference: (booking: any) => string;
}

const CustomerSelectionStep = ({
  customerSearch,
  setCustomerSearch,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  bookingType,
  setBookingType,
  bookings,
  selectedBooking,
  handleSelectBooking,
  getBookingTitle,
  getBookingReference,
}: CustomerSelectionStepProps) => {
  return (
    <div className="space-y-6">
      {/* اختيار العميل */}
      <Card>
        <CardHeader>
          <CardTitle>اختيار العميل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customer-search">البحث عن العميل</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="customer-search"
                placeholder="الاسم، البريد الإلكتروني، أو رقم الهاتف..."
                className="pl-8"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto border rounded-lg">
            {customers?.map((customer) => (
              <div
                key={customer.id}
                className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">
                  {customer.email} • {customer.phone}
                </div>
              </div>
            ))}
          </div>

          {selectedCustomer && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800">العميل المحدد:</div>
              <div className="text-green-700">{selectedCustomer.name}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* اختيار الحجز (اختياري) */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>اختيار الحجز (اختياري)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="booking-type">تصفية حسب نوع الحجز</Label>
              <Select value={bookingType} onValueChange={setBookingType}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع أنواع الحجوزات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="hotel">حجز فندق</SelectItem>
                  <SelectItem value="flight">حجز طيران</SelectItem>
                  <SelectItem value="transport">حجز نقل</SelectItem>
                  <SelectItem value="car_rental">إيجار سيارة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bookings && bookings.length > 0 ? (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedBooking?.id === booking.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => handleSelectBooking(booking)}
                  >
                    <div className="font-medium">{getBookingTitle(booking)}</div>
                    <div className="text-sm text-gray-500">
                      رقم الحجز: {getBookingReference(booking)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                لا توجد حجوزات متاحة لهذا العميل
              </div>
            )}

            <div className="text-sm text-gray-600">
              يمكنك المتابعة بدون اختيار حجز لإنشاء فاتورة مستقلة
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSelectionStep;
