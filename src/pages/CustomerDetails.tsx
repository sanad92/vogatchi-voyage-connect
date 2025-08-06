import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  FileText,
  TrendingUp,
  MessageSquare,
  Clock,
  DollarSign,
  Star,
  Package,
  Plane,
  Car,
  Bus,
  ArrowLeft,
  Plus,
  Download
} from "lucide-react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { formatDate } from "@/lib/utils";
import CustomerEditDialog from "@/components/customers/CustomerEditDialog";
import CustomerBookingHistory from "@/components/customers/CustomerBookingHistory";
import CustomerInvoiceHistory from "@/components/customers/CustomerInvoiceHistory";
import CustomerCommunicationLog from "@/components/customers/CustomerCommunicationLog";
import CustomerQuickActions from "@/components/customers/CustomerQuickActions";
import LoyaltyPointsDisplay from "@/components/customers/LoyaltyPointsDisplay";

const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { customerData, isLoading, refetch, error } = useCustomerData(customerId || '');

  useEffect(() => {
    if (customerId) {
      refetch();
    }
  }, [customerId, refetch]);

  if (!customerId) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 p-6">
        <div className="text-center">
          <p className="text-destructive">معرف العميل غير صحيح</p>
          <Button onClick={() => navigate('/customers')} className="mt-4">
            العودة لقائمة العملاء
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">جاري تحميل بيانات العميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customerData) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 p-6">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-lg">
            {error ? 'حدث خطأ في تحميل بيانات العميل' : 'العميل غير موجود'}
          </p>
          <Button onClick={() => navigate('/customers')}>
            العودة لقائمة العملاء
          </Button>
        </div>
      </div>
    );
  }

  const customerStats = {
    totalBookings: customerData.total_bookings || 0,
    totalSpent: customerData.total_spent || 0,
    loyaltyPoints: customerData.loyalty_points || 0,
    lastBookingDate: customerData.last_booking_date,
    registrationDate: customerData.created_at
  };

  const handleEditSave = () => {
    refetch();
    setIsEditDialogOpen(false);
    toast.success('تم تحديث بيانات العميل بنجاح');
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/customers')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customerData.name}</h1>
            <p className="text-muted-foreground">
              عميل منذ {formatDate(customerData.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            تعديل البيانات
          </Button>
          <CustomerQuickActions customer={customerData} />
        </div>
      </div>

      {/* Customer Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
                <p className="text-2xl font-bold">{customerStats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإنفاق</p>
                <p className="text-2xl font-bold">{customerStats.totalSpent.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نقاط الولاء</p>
                <p className="text-2xl font-bold">{customerStats.loyaltyPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر حجز</p>
                <p className="text-lg font-semibold">
                  {customerStats.lastBookingDate 
                    ? formatDate(customerStats.lastBookingDate)
                    : 'لا يوجد'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            الحجوزات
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            الفواتير
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            التواصل
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  المعلومات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الاسم</label>
                    <p className="font-medium">{customerData.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الهاتف</label>
                    <p className="font-medium">{customerData.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
                    <p className="font-medium">{customerData.email || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الجنسية</label>
                    <p className="font-medium">{customerData.nationality || 'غير محددة'}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">العنوان</label>
                  <p className="font-medium">{customerData.address || 'غير محدد'}</p>
                </div>
                {customerData.passport_number && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">رقم الجواز</label>
                    <p className="font-medium">{customerData.passport_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Segment & Loyalty */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  الشريحة ونقاط الولاء
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerData.segment && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">شريحة العميل</label>
                    <div className="mt-1">
                      <Badge 
                        className="text-white" 
                        style={{ backgroundColor: customerData.segment.color }}
                      >
                        {customerData.segment.name_ar}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {customerStats.loyaltyPoints > 0 && (
                  <LoyaltyPointsDisplay
                    points={customerStats.loyaltyPoints}
                    size="lg"
                    showProgress={true}
                  />
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">متوسط قيمة الحجز</label>
                    <p className="text-lg font-semibold">
                      {customerStats.totalBookings > 0 
                        ? Math.round(customerStats.totalSpent / customerStats.totalBookings).toLocaleString()
                        : 0
                      } ج.م
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">عميل منذ</label>
                    <p className="text-lg font-semibold">
                      {Math.floor((new Date().getTime() - new Date(customerStats.registrationDate).getTime()) / (1000 * 60 * 60 * 24))} يوم
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle>النشاط الأخير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Recent Bookings */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    آخر الحجوزات
                  </h4>
                  {customerData.hotel_bookings?.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="text-sm p-2 bg-muted rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{booking.hotel_name}</span>
                        <Badge variant="outline">{booking.status?.name_ar}</Badge>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        {formatDate(booking.check_in_date)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recent Communications */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    آخر التواصل
                  </h4>
                  {customerData.communications?.slice(0, 3).map((comm: any) => (
                    <div key={comm.id} className="text-sm p-2 bg-muted rounded">
                      <div className="font-medium">{comm.communication_type}</div>
                      <p className="text-muted-foreground text-xs mt-1">
                        {formatDate(comm.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Customer Notes */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    الملاحظات
                  </h4>
                  {customerData.notes?.slice(0, 3).map((note: any) => (
                    <div key={note.id} className="text-sm p-2 bg-muted rounded">
                      <p className="line-clamp-2">{note.content}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <CustomerBookingHistory customerId={customerId} />
        </TabsContent>

        <TabsContent value="invoices">
          <CustomerInvoiceHistory customerId={customerId} />
        </TabsContent>

        <TabsContent value="communication">
          <CustomerCommunicationLog customerId={customerId} />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>تحليلات العميل</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                سيتم إضافة تحليلات مفصلة للعميل في التحديث القادم...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <CustomerEditDialog
        customer={customerData}
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditSave}
      />
    </div>
  );
};

export default CustomerDetails;