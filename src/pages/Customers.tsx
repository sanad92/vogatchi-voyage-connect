
import { useState } from "react";
import { Plus, Search, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerCard from "@/components/customers/CustomerCard";
import CustomerStats from "@/components/customers/CustomerStats";
import QuickCustomerAdd from "@/components/customers/QuickCustomerAdd";
import CustomerSearch from "@/components/customers/CustomerSearch";
import CustomerSegmentBadge from "@/components/crm/CustomerSegmentBadge";
import LoyaltyPointsDisplay from "@/components/crm/LoyaltyPointsDisplay";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useCRM } from "@/hooks/useCRM";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  
  const { customerSegments } = useCRM();
  const { customerData } = useCustomerData(selectedCustomer || '');

  // بيانات إحصائية تجريبية
  const mockStats = {
    totalCustomers: 1234,
    activeCustomers: 89,
    needsFollowUp: 15,
    noCommunication: 8
  };

  const handleCustomerAdded = (customer: any) => {
    console.log('Customer added:', customer);
    setIsAddDialogOpen(false);
  };

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          إدارة العملاء
        </h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              إضافة عميل جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عميل جديد</DialogTitle>
            </DialogHeader>
            <QuickCustomerAdd 
              onCustomerAdded={handleCustomerAdded}
              onCancel={handleCancelAdd}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* إحصائيات العملاء */}
      <CustomerStats 
        totalCustomers={mockStats.totalCustomers}
        activeCustomers={mockStats.activeCustomers}
        needsFollowUp={mockStats.needsFollowUp}
        noCommunication={mockStats.noCommunication}
      />

      {/* فلاتر تقسيم العملاء */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
        <Button
          variant={activeSegment === null ? "default" : "outline"}
          onClick={() => setActiveSegment(null)}
          size="sm"
        >
          جميع العملاء
        </Button>
        {customerSegments?.map((segment) => (
          <Button
            key={segment.id}
            variant={activeSegment === segment.id ? "default" : "outline"}
            onClick={() => setActiveSegment(segment.id)}
            size="sm"
            style={{
              backgroundColor: activeSegment === segment.id ? segment.color : 'transparent',
              borderColor: segment.color,
              color: activeSegment === segment.id ? 'white' : segment.color
            }}
          >
            {segment.name_ar}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">جميع العملاء</TabsTrigger>
          <TabsTrigger value="vip" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            VIP
          </TabsTrigger>
          <TabsTrigger value="new">عملاء جدد</TabsTrigger>
          <TabsTrigger value="inactive">غير نشطين</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* شريط البحث */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ابحث عن عميل باسم أو رقم الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <CustomerSearch 
              onCustomerSelect={(customer) => setSelectedCustomer(customer.id)}
              onNewCustomer={() => setIsAddDialogOpen(true)}
            />
          </div>

          {/* قائمة العملاء */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* عملاء تجريبيون مع ميزات CRM */}
            <CustomerCard
              customer={{
                id: '1',
                name: 'أحمد محمد علي',
                phone: '+201234567890',
                email: 'ahmed@example.com',
                total_bookings: 8,
                total_spent: 45000,
                loyalty_points: 450,
                last_booking_date: '2024-01-15',
                segment_id: customerSegments?.find(s => s.name === 'VIP')?.id
              }}
              onSelect={() => setSelectedCustomer('1')}
            />
            
            <CustomerCard
              customer={{
                id: '2',
                name: 'فاطمة حسن',
                phone: '+201987654321',
                email: 'fatma@example.com',
                total_bookings: 3,
                total_spent: 18000,
                loyalty_points: 180,
                last_booking_date: '2024-01-10',
                segment_id: customerSegments?.find(s => s.name === 'Premium')?.id
              }}
              onSelect={() => setSelectedCustomer('2')}
            />

            <CustomerCard
              customer={{
                id: '3',
                name: 'محمد أحمد',
                phone: '+201567890123',
                email: 'mohamed@example.com',
                total_bookings: 1,
                total_spent: 8500,
                loyalty_points: 85,
                last_booking_date: '2024-01-20',
                segment_id: customerSegments?.find(s => s.name === 'Regular')?.id
              }}
              onSelect={() => setSelectedCustomer('3')}
            />
          </div>
        </TabsContent>

        <TabsContent value="vip" className="space-y-4">
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">عملاء كبار الشخصيات</h3>
            <p className="text-gray-600">العملاء الذين أنفقوا أكثر من 50,000 جنيه أو لديهم أكثر من 10 حجوزات</p>
          </div>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">العملاء الجدد</h3>
            <p className="text-gray-600">العملاء الذين انضموا خلال آخر 30 يوم</p>
          </div>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">العملاء غير النشطين</h3>
            <p className="text-gray-600">العملاء الذين لم يقوموا بحجز خلال آخر 6 أشهر</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* عرض تفاصيل العميل المحدد */}
      {selectedCustomer && customerData && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                تفاصيل العميل - {customerData.name}
                <CustomerSegmentBadge segment={customerSegments?.find(s => s.id === customerData.segment_id)} />
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {/* معلومات العميل الأساسية */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">معلومات الاتصال</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>الهاتف:</strong> {customerData.phone}</p>
                    <p><strong>البريد الإلكتروني:</strong> {customerData.email || 'غير محدد'}</p>
                    <p><strong>العنوان:</strong> {customerData.address || 'غير محدد'}</p>
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
                    // تحديث البيانات بعد استرداد النقاط
                  }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Customers;
