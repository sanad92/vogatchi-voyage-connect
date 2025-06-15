
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Car, BarChart3, Calendar } from 'lucide-react';
import CarRentalForm from '@/components/transport/CarRentalForm';
import CarRentalsList from '@/components/transport/CarRentalsList';
import { useCarRentals } from '@/hooks/useCarRentals';

const CarRentals = () => {
  const [showForm, setShowForm] = useState(false);
  const { carRentals } = useCarRentals();

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  // حساب الإحصائيات
  const totalRentals = carRentals?.length || 0;
  const totalRevenue = carRentals?.reduce((sum, rental) => sum + rental.total_rental_cost, 0) || 0;
  const totalProfit = carRentals?.reduce((sum, rental) => sum + (rental.total_profit || 0), 0) || 0;
  const activeRentals = carRentals?.filter(rental => {
    const today = new Date();
    const startDate = new Date(rental.rental_start_date);
    const endDate = new Date(rental.rental_end_date);
    return startDate <= today && endDate >= today;
  }).length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6 text-green-600" />
            إيجار السيارات
          </h1>
          <p className="text-gray-600">إدارة عقود إيجار السيارات والمركبات</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          عقد إيجار جديد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{totalRentals}</div>
                <div className="text-sm text-gray-600">إجمالي العقود</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
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
              <Calendar className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{activeRentals}</div>
                <div className="text-sm text-gray-600">عقود نشطة</div>
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
            قائمة العقود
          </TabsTrigger>
          <TabsTrigger 
            value="form"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            عقد جديد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <CarRentalsList />
        </TabsContent>

        <TabsContent value="form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إضافة عقد إيجار جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <CarRentalForm onSuccess={handleFormSuccess} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CarRentals;
