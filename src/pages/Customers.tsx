
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
import { useCustomers } from "@/hooks/useCustomers";
import { useCRM } from "@/hooks/useCRM";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const { customerSegments } = useCRM();
  const { customers, isLoading: customersLoading, error: customersError } = useCustomers(searchTerm, activeSegment);
  const { customerData, isLoading: customerDataLoading } = useCustomerData(selectedCustomer || '');

  const handleCustomerAdded = (customer: any) => {
    console.log('Customer added:', customer);
    setIsAddDialogOpen(false);
  };

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false);
  };

  // Filter customers based on active tab
  const getFilteredCustomers = () => {
    if (!customers) return [];
    
    switch (activeTab) {
      case 'vip':
        return customers.filter(customer => 
          customer.segment?.name === 'VIP' || customer.total_spent > 50000 || customer.total_bookings > 10
        );
      case 'new':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return customers.filter(customer => 
          new Date(customer.created_at) > thirtyDaysAgo
        );
      case 'inactive':
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return customers.filter(customer => 
          !customer.last_booking_date || new Date(customer.last_booking_date) < sixMonthsAgo
        );
      default:
        return customers;
    }
  };

  const filteredCustomers = getFilteredCustomers();

  // Calculate stats from real data
  const stats = {
    totalCustomers: customers?.length || 0,
    activeCustomers: customers?.filter(c => c.last_booking_date && 
      new Date(c.last_booking_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length || 0,
    needsFollowUp: customers?.filter(c => c.total_bookings > 0 && 
      (!c.last_booking_date || new Date(c.last_booking_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    ).length || 0,
    noCommunication: customers?.filter(c => c.total_bookings === 0).length || 0
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
        totalCustomers={stats.totalCustomers}
        activeCustomers={stats.activeCustomers}
        needsFollowUp={stats.needsFollowUp}
        noCommunication={stats.noCommunication}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">جميع العملاء</TabsTrigger>
          <TabsTrigger value="vip" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            VIP
          </TabsTrigger>
          <TabsTrigger value="new">عملاء جدد</TabsTrigger>
          <TabsTrigger value="inactive">غير نشطين</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
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

          {/* معالجة حالات التحميل والأخطاء */}
          {customersLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">جاري تحميل بيانات العملاء...</p>
            </div>
          )}

          {customersError && (
            <div className="text-center py-8">
              <p className="text-red-600">حدث خطأ في تحميل بيانات العملاء</p>
              <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* قائمة العملاء */}
          {!customersLoading && !customersError && (
            <>
              {filteredCustomers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomers.map((customer) => (
                    <CustomerCard
                      key={customer.id}
                      customer={{
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email,
                        total_bookings: customer.total_bookings || 0,
                        total_spent: customer.total_spent || 0,
                        loyalty_points: customer.loyalty_points || 0,
                        last_booking_date: customer.last_booking_date,
                        segment_id: customer.segment_id
                      }}
                      onSelect={() => setSelectedCustomer(customer.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد عملاء</h3>
                  <p className="text-gray-600 mb-4">
                    {activeTab === 'all' ? 'لم يتم العثور على أي عملاء' :
                     activeTab === 'vip' ? 'لا توجد عملاء VIP حالياً' :
                     activeTab === 'new' ? 'لا توجد عملاء جدد في آخر 30 يوم' :
                     'لا توجد عملاء غير نشطين'}
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة عميل جديد
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* عرض تفاصيل العميل المحدد */}
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {customerDataLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">جاري تحميل تفاصيل العميل...</p>
              </div>
            ) : customerData ? (
              <>
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
                        <p><strong>الجنسية:</strong> {customerData.nationality || 'غير محدد'}</p>
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
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-600">لم يتم العثور على بيانات العميل</p>
                <Button variant="outline" onClick={() => setSelectedCustomer(null)} className="mt-2">
                  إغلاق
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Customers;
