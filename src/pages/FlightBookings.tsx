
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane } from "lucide-react";
import FlightBookingForm from "@/components/flight-bookings/FlightBookingForm";
import FlightBookingsList from "@/components/flight-bookings/FlightBookingsList";
import { FlightBooking } from "@/types/flightBooking";

const FlightBookings = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedBooking, setSelectedBooking] = useState<FlightBooking | null>(null);

  const handleCreateNew = () => {
    setSelectedBooking(null);
    setActiveTab("form");
  };

  const handleEditBooking = (booking: FlightBooking) => {
    setSelectedBooking(booking);
    setActiveTab("details");
  };

  const handleFormSuccess = () => {
    setActiveTab("list");
    setSelectedBooking(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Plane className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">حجوزات الطيران</h1>
          <p className="text-gray-600">إدارة حجوزات الطيران والتذاكر</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">قائمة الحجوزات</TabsTrigger>
          <TabsTrigger value="form">حجز جديد</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedBooking}>
            تفاصيل الحجز
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <FlightBookingsList 
            onCreateNew={handleCreateNew}
            onEditBooking={handleEditBooking}
          />
        </TabsContent>

        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                إنشاء حجز طيران جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlightBookingForm 
                onSuccess={handleFormSuccess}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {selectedBooking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  تفاصيل حجز الطيران - {selectedBooking.booking_reference}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* معلومات العميل */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">معلومات العميل</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>اسم العميل:</strong> {selectedBooking.customer_name}</p>
                      <p><strong>وكيل الحجز:</strong> {selectedBooking.booking_agent_name}</p>
                      <p><strong>رقم الحجز:</strong> {selectedBooking.booking_reference}</p>
                      {selectedBooking.confirmation_number && (
                        <p><strong>رقم التأكيد:</strong> {selectedBooking.confirmation_number}</p>
                      )}
                    </div>
                  </div>

                  {/* تفاصيل الرحلة */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">تفاصيل الرحلة</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>من:</strong> {selectedBooking.departure_airport?.name}</p>
                      <p><strong>إلى:</strong> {selectedBooking.arrival_airport?.name}</p>
                      <p><strong>تاريخ المغادرة:</strong> {selectedBooking.departure_date}</p>
                      <p><strong>تاريخ الوصول:</strong> {selectedBooking.arrival_date}</p>
                      <p><strong>شركة الطيران:</strong> {selectedBooking.airline?.name}</p>
                      <p><strong>درجة السفر:</strong> {selectedBooking.flight_class?.name_ar}</p>
                      <p><strong>عدد المسافرين:</strong> {selectedBooking.number_of_passengers}</p>
                    </div>
                  </div>

                  {/* المعلومات المالية */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">المعلومات المالية</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>سعر التذكرة:</strong> {selectedBooking.ticket_price_per_person} {selectedBooking.currency}</p>
                      <p><strong>الضرائب والرسوم:</strong> {selectedBooking.taxes_and_fees || 0} {selectedBooking.currency}</p>
                      <p><strong>التكلفة الإجمالية:</strong> {selectedBooking.total_cost} {selectedBooking.currency}</p>
                      <p><strong>تكلفة المورد:</strong> {selectedBooking.supplier_cost} {selectedBooking.currency}</p>
                      <p><strong>الربح:</strong> {selectedBooking.total_profit || 0} {selectedBooking.currency}</p>
                      <p><strong>المبلغ المدفوع:</strong> {selectedBooking.paid_amount || 0} {selectedBooking.currency}</p>
                      <p><strong>المتبقي:</strong> {selectedBooking.remaining_amount || 0} {selectedBooking.currency}</p>
                    </div>
                  </div>

                  {/* معلومات إضافية */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">معلومات إضافية</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>المورد:</strong> {selectedBooking.supplier_name}</p>
                      {selectedBooking.special_requests && (
                        <p><strong>طلبات خاصة:</strong> {selectedBooking.special_requests}</p>
                      )}
                      {selectedBooking.meal_preferences && (
                        <p><strong>تفضيلات الوجبات:</strong> {selectedBooking.meal_preferences}</p>
                      )}
                      {selectedBooking.seat_preferences && (
                        <p><strong>تفضيلات المقاعد:</strong> {selectedBooking.seat_preferences}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* تفاصيل المسافرين */}
                {selectedBooking.passenger_details && selectedBooking.passenger_details.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">تفاصيل المسافرين</h3>
                    <div className="grid gap-4">
                      {selectedBooking.passenger_details.map((passenger, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">المسافر {index + 1}</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>الاسم:</strong> {passenger.name}</p>
                            <p><strong>جواز السفر:</strong> {passenger.passport}</p>
                            <p><strong>تاريخ الميلاد:</strong> {passenger.date_of_birth}</p>
                            <p><strong>الجنسية:</strong> {passenger.nationality}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FlightBookings;
