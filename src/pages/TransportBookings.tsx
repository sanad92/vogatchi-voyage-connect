import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Car, BarChart3 } from 'lucide-react';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import TransportBookingForm from '@/components/transport/TransportBookingForm';
import EnhancedTransportBookingForm from '@/components/transport/EnhancedTransportBookingForm';
import TransportBookingsList from '@/components/transport/TransportBookingsList';
import { useTransportBookings } from '@/hooks/useTransportBookings';

const TransportBookings = () => {
  const [activeTab, setActiveTab] = useState("list");
  const { transportBookings } = useTransportBookings();
  const navigate = useNavigate();

  const handleFormSuccess = () => {
    setActiveTab("list");
  };

  const handleCreateNew = () => {
    setActiveTab("enhanced-form");
  };

  const totalBookings = transportBookings?.length || 0;
  const totalRevenue = transportBookings?.reduce((sum, booking) => sum + booking.total_cost, 0) || 0;
  const totalProfit = transportBookings?.reduce((sum, booking) => sum + (booking.total_profit || 0), 0) || 0;
  const pendingBookings = transportBookings?.filter(booking => !booking.invoice_sent).length || 0;

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'حجوزات النقل' }
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            حجوزات النقل والرحلات الداخلية
          </h1>
          <p className="text-sm text-muted-foreground">إدارة حجوزات النقل والانتقالات</p>
        </div>
        <Button size="sm" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 ml-2" />
          حجز جديد
        </Button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalBookings}</div>
                <div className="text-sm text-muted-foreground">إجمالي الحجوزات</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{(totalRevenue / 1000).toFixed(0)}ك</div>
                <div className="text-sm text-muted-foreground">إجمالي الإيرادات</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{(totalProfit / 1000).toFixed(0)}ك</div>
                <div className="text-sm text-muted-foreground">إجمالي الأرباح</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{pendingBookings}</div>
                <div className="text-sm text-muted-foreground">بدون فاتورة</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            قائمة الحجوزات
          </TabsTrigger>
          <TabsTrigger value="enhanced-form" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            حجز محسن
          </TabsTrigger>
          <TabsTrigger value="basic-form" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            حجز أساسي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <TransportBookingsList />
        </TabsContent>

        <TabsContent value="enhanced-form" className="space-y-6">
          <EnhancedTransportBookingForm onSuccess={handleFormSuccess} />
        </TabsContent>

        <TabsContent value="basic-form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إضافة حجز نقل أساسي</CardTitle>
            </CardHeader>
            <CardContent>
              <TransportBookingForm onSuccess={handleFormSuccess} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransportBookings;
