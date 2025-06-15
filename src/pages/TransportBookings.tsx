
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Car, BarChart3 } from 'lucide-react';
import TransportBookingForm from '@/components/transport/TransportBookingForm';
import TransportBookingsList from '@/components/transport/TransportBookingsList';
import { useTransportBookings } from '@/hooks/useTransportBookings';

const TransportBookings = () => {
  const [showForm, setShowForm] = useState(false);
  const { transportBookings } = useTransportBookings();

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  // حساب الإحصائيات
  const totalBookings = transportBookings?.length || 0;
  const totalRevenue = transportBookings?.reduce((sum, booking) => sum + booking.total_cost, 0) || 0;
  const totalProfit = transportBookings?.reduce((sum, booking) => sum + (booking.total_profit || 0), 0) || 0;
  const pendingBookings = transportBookings?.filter(booking => !booking.invoice_sent).length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6 text-blue-600" />
            حجوزات النقل والرحلات الداخلية
          </h1>
          <p className="text-gray-600">إدارة حجوزات النقل والانتقالات والرحلات الداخلية</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          حجز جديد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalBookings}</div>
                <div className="text-sm text-gray-600">إجمالي الحجوزات</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {(totalRevenue / 1000).toFixed(0)}ك
                </div>
                <div className="text-sm text-gray-600">إجمالي الإيرادات</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {(totalProfit / 1000).toFixed(0)}ك
                </div>
                <div className="text-sm text-gray-600">إجمالي الأرباح</div>
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
                <div className="text-sm text-gray-600">حجوزات معلقة</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={showForm ? "form" : "list"} value={showForm ? "form" : "list"}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="list" 
            onClick={() => setShowForm(false)}
            className="flex items-center gap-2"
          >
            <Car className="h-4 w-4" />
            قائمة الحجوزات
          </TabsTrigger>
          <TabsTrigger 
            value="form"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            حجز جديد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <TransportBookingsList />
        </TabsContent>

        <TabsContent value="form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إضافة حجز نقل جديد</CardTitle>
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
