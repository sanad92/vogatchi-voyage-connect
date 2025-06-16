
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerSegmentBadge from "@/components/crm/CustomerSegmentBadge";
import LoyaltyPointsDisplay from "@/components/crm/LoyaltyPointsDisplay";
import CustomerBookingsList from "./CustomerBookingsList";
import CustomerFollowUpButton from "./CustomerFollowUpButton";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useCRM } from "@/hooks/useCRM";
import { RefreshCw, AlertCircle, User, Calendar, Phone } from "lucide-react";

interface CustomerDetailsDialogProps {
  selectedCustomer: string | null;
  onClose: () => void;
}

const CustomerDetailsDialog = ({ selectedCustomer, onClose }: CustomerDetailsDialogProps) => {
  const { customerData, isLoading: customerDataLoading, error, refetch } = useCustomerData(selectedCustomer || '');
  const { customerSegments } = useCRM();

  if (!selectedCustomer) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG');
  };

  const handleRetry = () => {
    refetch();
  };

  const handleFollowUpCompleted = () => {
    refetch();
  };

  return (
    <Dialog open={!!selectedCustomer} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        {customerDataLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">جاري تحميل تفاصيل العميل...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <p className="text-red-600 mb-2 font-medium">خطأ في تحميل تفاصيل العميل</p>
              <p className="text-sm text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
              </p>
              <p className="text-xs text-gray-500">
                يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
              <Button variant="outline" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : customerData ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                تفاصيل العميل - {customerData.name}
                <CustomerSegmentBadge segment={customerSegments?.find(s => s.id === customerData.segment_id)} />
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="follow-up">متابعة العميل</TabsTrigger>
                <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
                <TabsTrigger value="loyalty">نقاط الولاء</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {/* معلومات العميل الأساسية */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">معلومات الاتصال</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>الهاتف:</strong> {customerData.phone}</p>
                        <p><strong>البريد الإلكتروني:</strong> {customerData.email || 'غير محدد'}</p>
                        <p><strong>العنوان:</strong> {customerData.address || 'غير محدد'}</p>
                        <p><strong>الجنسية:</strong> {customerData.nationality || 'غير محدد'}</p>
                        <p><strong>تاريخ التسجيل:</strong> {formatDate(customerData.created_at)}</p>
                        {customerData.last_booking_date && (
                          <p><strong>آخر حجز:</strong> {formatDate(customerData.last_booking_date)}</p>
                        )}
                      </div>
                    </div>

                    {/* معلومات من أضاف العميل */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        معلومات إضافة العميل
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>تم إضافته بواسطة:</strong> {
                            customerData.created_by_profile?.full_name || 
                            customerData.created_by_profile?.email || 
                            'غير محدد'
                          }
                        </p>
                        <p><strong>تاريخ الإضافة:</strong> {formatDateTime(customerData.created_at)}</p>
                      </div>
                    </div>

                    {/* إحصائيات العميل */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{customerData.total_bookings || 0}</div>
                        <div className="text-sm text-gray-600">إجمالي الحجوزات</div>
                      </div>
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {(customerData.total_spent || 0).toLocaleString()} ج.م
                        </div>
                        <div className="text-sm text-gray-600">إجمالي المنفق</div>
                      </div>
                    </div>
                  </div>

                  {/* نقاط الولاء */}
                  <div>
                    <LoyaltyPointsDisplay 
                      customerId={selectedCustomer}
                      loyaltyPoints={customerData.loyalty_points || 0}
                      onRedeemPoints={() => {
                        refetch();
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="follow-up" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* معلومات آخر متابعة */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      معلومات آخر متابعة
                    </h3>
                    <div className="space-y-2 text-sm">
                      {customerData.last_follow_up_date ? (
                        <>
                          <p>
                            <strong>تاريخ آخر متابعة:</strong> {formatDateTime(customerData.last_follow_up_date)}
                          </p>
                          <p>
                            <strong>تمت بواسطة:</strong> {
                              customerData.last_follow_up_by_profile?.full_name || 
                              customerData.last_follow_up_by_profile?.email || 
                              'غير محدد'
                            }
                          </p>
                        </>
                      ) : (
                        <p className="text-yellow-600">لم تتم أي متابعة مع هذا العميل بعد</p>
                      )}
                    </div>
                  </div>

                  {/* زر المتابعة */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      تسجيل متابعة جديدة
                    </h3>
                    <CustomerFollowUpButton
                      customerId={selectedCustomer}
                      customerName={customerData.name}
                      lastFollowUpDate={customerData.last_follow_up_date}
                      onFollowUpCompleted={handleFollowUpCompleted}
                    />
                  </div>
                </div>

                {/* سجل المتابعات السابقة */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">سجل المتابعات السابقة</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerData.follow_ups && customerData.follow_ups.length > 0 ? (
                      customerData.follow_ups
                        .filter((followUp: any) => followUp.status === 'completed')
                        .map((followUp: any) => (
                          <div key={followUp.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{followUp.notes || 'متابعة عامة'}</div>
                              <div className="text-xs text-gray-500">
                                {formatDateTime(followUp.completed_at || followUp.created_at)}
                              </div>
                              {followUp.assigned_to_profile?.full_name && (
                                <div className="text-xs text-blue-600">
                                  بواسطة: {followUp.assigned_to_profile.full_name}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        لا توجد متابعات سابقة
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bookings" className="space-y-4">
                <CustomerBookingsList
                  hotelBookings={customerData.hotel_bookings || []}
                  flightBookings={customerData.flight_bookings || []}
                  transportBookings={customerData.transport_bookings || []}
                  carRentals={customerData.car_rentals || []}
                />
              </TabsContent>

              <TabsContent value="loyalty" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LoyaltyPointsDisplay 
                    customerId={selectedCustomer}
                    loyaltyPoints={customerData.loyalty_points || 0}
                    onRedeemPoints={() => {
                      refetch();
                    }}
                  />
                  
                  {/* تاريخ معاملات نقاط الولاء */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">تاريخ معاملات النقاط</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customerData.loyalty_transactions && customerData.loyalty_transactions.length > 0 ? (
                        customerData.loyalty_transactions.map((transaction: any) => (
                          <div key={transaction.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="text-sm">
                              <div className="font-medium">{transaction.description}</div>
                              <div className="text-gray-500 text-xs">
                                {formatDate(transaction.created_at)}
                              </div>
                            </div>
                            <div className={`text-sm font-medium ${
                              transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.transaction_type === 'earned' ? '+' : '-'}
                              {transaction.points_earned || transaction.points_used} نقطة
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          لا توجد معاملات نقاط ولاء
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto" />
            <p className="text-gray-600 mb-4">لم يتم العثور على بيانات العميل</p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
              <Button variant="outline" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
