
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Calendar, 
  CreditCard, 
  Star, 
  Download,
  Eye,
  MessageSquare,
  Bell,
  Settings,
  Gift,
  FileText,
  Phone
} from "lucide-react";
import { Customer } from "@/types/customer";

interface CustomerPortalProps {
  customer: Customer;
}

const CustomerPortal = ({ customer }: CustomerPortalProps) => {
  const [activeTab, setActiveTab] = useState("profile");

  // بيانات وهمية لمحاكاة بوابة العميل
  const customerBookings = [
    {
      id: 'HB-2024-001234',
      type: 'hotel',
      destination: 'دبي',
      hotelName: 'فندق برج العرب',
      checkIn: '2024-02-15',
      checkOut: '2024-02-20',
      status: 'confirmed',
      totalAmount: 15000,
      voucher: 'voucher-001.pdf'
    },
    {
      id: 'FB-2024-001235',
      type: 'flight',
      route: 'القاهرة - دبي',
      airline: 'طيران الإمارات',
      departure: '2024-02-15T08:00',
      arrival: '2024-02-15T12:00',
      status: 'confirmed',
      totalAmount: 5000,
      ticket: 'ticket-001.pdf'
    }
  ];

  const customerInvoices = [
    {
      id: 'INV-2024-001',
      date: '2024-01-15',
      amount: 20000,
      status: 'paid',
      downloadUrl: 'invoice-001.pdf'
    },
    {
      id: 'INV-2024-002',
      date: '2024-01-10',
      amount: 8500,
      status: 'paid',
      downloadUrl: 'invoice-002.pdf'
    }
  ];

  const loyaltyTransactions = [
    {
      id: '1',
      date: '2024-01-15',
      type: 'earned',
      points: 200,
      description: 'حجز فندق في دبي',
      booking: 'HB-2024-001234'
    },
    {
      id: '2',
      date: '2024-01-10',
      type: 'earned',
      points: 50,
      description: 'حجز طيران القاهرة - دبي',
      booking: 'FB-2024-001235'
    }
  ];

  const notifications = [
    {
      id: '1',
      type: 'booking',
      title: 'تأكيد الحجز',
      message: 'تم تأكيد حجز فندق برج العرب في دبي',
      date: '2024-01-15T10:00:00Z',
      read: false
    },
    {
      id: '2',
      type: 'offer',
      title: 'عرض خاص',
      message: 'خصم 20% على حجوزات الفنادق في المالديف',
      date: '2024-01-14T09:00:00Z',
      read: true
    }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStatusText = (status: string) => {
    const texts = {
      confirmed: 'مؤكد',
      pending: 'في الانتظار',
      cancelled: 'ملغي',
      paid: 'مدفوع',
      unpaid: 'غير مدفوع'
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ترحيب بالعميل */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">مرحباً، {customer.name}</h1>
                <p className="text-gray-600">آخر زيارة: منذ يومين</p>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="font-bold text-lg">{customer.loyalty_points || 0}</span>
                <span className="text-sm text-gray-600">نقطة</span>
              </div>
              <Badge className="bg-purple-100 text-purple-800">
                عضو ذهبي
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* محتوى البوابة */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          <TabsTrigger value="bookings">حجوزاتي</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          <TabsTrigger value="loyalty">نقاط الولاء</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
          <TabsTrigger value="support">الدعم</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                المعلومات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">الاسم الكامل</label>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">رقم الهاتف</label>
                  <p className="font-medium">{customer.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">البريد الإلكتروني</label>
                  <p className="font-medium">{customer.email || 'غير محدد'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">الجنسية</label>
                  <p className="font-medium">{customer.nationality || 'غير محدد'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">العنوان</label>
                  <p className="font-medium">{customer.address || 'غير محدد'}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  تحديث المعلومات
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="font-bold text-2xl">{customer.total_bookings || 0}</p>
                <p className="text-sm text-gray-600">إجمالي الحجوزات</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <CreditCard className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-bold text-2xl">{(customer.total_spent || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-600">إجمالي الإنفاق (ج.م)</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Gift className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <p className="font-bold text-2xl">{customer.loyalty_points || 0}</p>
                <p className="text-sm text-gray-600">نقاط الولاء</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                حجوزاتي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerBookings.map(booking => (
                  <div key={booking.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{booking.id}</h4>
                        <p className="text-sm text-gray-600">
                          {booking.type === 'hotel' ? booking.hotelName : booking.airline}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusText(booking.status)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">الوجهة: </span>
                        <span className="font-medium">
                          {booking.type === 'hotel' ? booking.destination : booking.route}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">التاريخ: </span>
                        <span className="font-medium">
                          {booking.type === 'hotel' ? 
                            `${booking.checkIn} - ${booking.checkOut}` : 
                            new Date(booking.departure).toLocaleDateString('ar-SA')
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">المبلغ: </span>
                        <span className="font-medium">{booking.totalAmount.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        عرض التفاصيل
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        تحميل الفاوتشر
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                الفواتير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customerInvoices.map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium">{invoice.id}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(invoice.date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{invoice.amount.toLocaleString()} ج.م</p>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusText(invoice.status)}
                        </Badge>
                      </div>
                      
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        تحميل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                برنامج نقاط الولاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{customer.loyalty_points || 0} نقطة</h3>
                <p className="text-gray-600">رصيدك الحالي من نقاط الولاء</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">آخر المعاملات</h4>
                {loyaltyTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <Star className={`h-4 w-4 ${
                          transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${
                      transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'earned' ? '+' : '-'}{transaction.points}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`p-4 border rounded-lg ${
                      !notification.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  التواصل معنا
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">خط الدعم الساخن</h4>
                  <p className="text-blue-600 font-bold text-lg">19555</p>
                  <p className="text-sm text-blue-600">متاح 24/7</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">واتساب</h4>
                  <p className="text-green-600 font-bold">+20 100 123 4567</p>
                  <p className="text-sm text-green-600">الرد خلال دقائق</p>
                </div>
                
                <Button className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  بدء محادثة جديدة
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الأسئلة الشائعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <h5 className="font-medium">كيف يمكنني تعديل حجز؟</h5>
                  <p className="text-sm text-gray-600">اتصل بنا أو تواصل عبر واتساب</p>
                </div>
                
                <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <h5 className="font-medium">سياسة الإلغاء</h5>
                  <p className="text-sm text-gray-600">تعرف على شروط وأحكام الإلغاء</p>
                </div>
                
                <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <h5 className="font-medium">كيف أستخدم نقاط الولاء؟</h5>
                  <p className="text-sm text-gray-600">دليل استخدام نقاط الولاء</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerPortal;
