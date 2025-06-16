import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ListChecks,
  DollarSign,
  MessageSquare,
  Package,
  Plane,
  Bus,
  Car,
  Star,
} from "lucide-react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { formatDate } from "@/lib/utils";
import LoyaltyPointsDisplay from "./LoyaltyPointsDisplay";

interface CustomerDetailsDialogProps {
  selectedCustomer: string | null;
  onClose: () => void;
}

const CustomerDetailsDialog = ({ selectedCustomer, onClose }: CustomerDetailsDialogProps) => {
  const { customerData, isLoading, refetch, error } = useCustomerData(selectedCustomer || '');

  useEffect(() => {
    if (selectedCustomer) {
      refetch();
    }
  }, [selectedCustomer, refetch]);

  return (
    <Dialog open={!!selectedCustomer} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            تفاصيل العميل
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500">جاري تحميل بيانات العميل...</p>
          </div>
        ) : customerData ? (
          <div className="space-y-6">
            {/* البيانات الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">المعلومات الشخصية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{customerData.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{customerData.email || 'غير متوفر'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{customerData.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{customerData.address || 'غير متوفر'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>
                      تاريخ التسجيل:{' '}
                      {formatDate(customerData.created_at || '')}
                    </span>
                  </div>
                  
                  {/* إضافة عرض نقاط الولاء */}
                  {customerData.loyalty_points && customerData.loyalty_points > 0 && (
                    <div className="pt-3 border-t">
                      <LoyaltyPointsDisplay
                        points={customerData.loyalty_points}
                        size="lg"
                        showProgress={true}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* إحصائيات العميل */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">إحصائيات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-gray-500" />
                      <span>عدد الحجوزات:</span>
                    </div>
                    <Badge variant="secondary">
                      {customerData.total_bookings || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>إجمالي الإنفاق:</span>
                    </div>
                    <Badge variant="secondary">
                      {customerData.total_spent || 0}
                    </Badge>
                  </div>
                  {customerData.segment && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-gray-500" />
                        <span>الشريحة:</span>
                      </div>
                      <Badge className="capitalize" style={{ backgroundColor: customerData.segment.color, color: 'white' }}>
                        {customerData.segment.name_ar}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* تفاصيل الحجوزات */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">الحجوزات</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* حجوزات الفنادق */}
                {customerData.hotel_bookings && customerData.hotel_bookings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        حجوزات الفنادق
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {customerData.hotel_bookings.map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between">
                          <span>{booking.hotel_name}</span>
                          <Badge>{booking?.status?.name_ar}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* حجوزات الطيران */}
                {customerData.flight_bookings && customerData.flight_bookings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        حجوزات الطيران
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {customerData.flight_bookings.map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between">
                          <span>
                            {booking.departure_airport?.iata_code} -{' '}
                            {booking.arrival_airport?.iata_code}
                          </span>
                          <Badge>{booking?.status?.name_ar}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* حجوزات النقل */}
                {customerData.transport_bookings && customerData.transport_bookings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bus className="h-4 w-4" />
                        حجوزات النقل
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {customerData.transport_bookings.map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between">
                          <span>{booking.route?.route_name_ar}</span>
                          <Badge>{booking?.status?.name_ar}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* حجوزات تأجير السيارات */}
                {customerData.car_rentals && customerData.car_rentals.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        حجوزات تأجير السيارات
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {customerData.car_rentals.map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between">
                          <span>{booking.vehicle_type?.name_ar}</span>
                          <Badge>{booking?.status?.name_ar}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* التواصل والملاحظات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    التواصل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customerData.communications && customerData.communications.length > 0 ? (
                    customerData.communications.map((communication: any) => (
                      <div key={communication.id} className="flex items-center justify-between">
                        <span>{communication.communication_type}</span>
                        <span>{communication.created_at}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">لا يوجد سجل تواصل</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    الملاحظات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customerData.notes && customerData.notes.length > 0 ? (
                    customerData.notes.map((note: any) => (
                      <div key={note.id} className="space-y-1">
                        <p className="text-sm">{note.content}</p>
                        <div className="text-xs text-gray-500">
                          بواسطة: {note.created_by_profile?.full_name || 'غير معروف'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">لا يوجد ملاحظات</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48">
            <p className="text-red-500">
              {error ? 'فشل في تحميل بيانات العميل' : 'العميل غير موجود'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
