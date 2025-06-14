
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Plus, Phone, Mail, Calendar, MessageSquare } from "lucide-react";
import CustomerServiceTabs from "@/components/customer-service/CustomerServiceTabs";
import { useCustomerData } from "@/hooks/useCustomerData";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          bookings(id, status, check_in_date),
          follow_ups:customer_follow_ups(id, status),
          communications:customer_communications(id, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { customerData, refetch: refetchCustomerData } = useCustomerData(selectedCustomer?.id);

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleOpenCustomerService = (customer: any) => {
    setSelectedCustomer(customer);
    setIsServiceDialogOpen(true);
  };

  const getCustomerStats = (customer: any) => {
    const totalBookings = customer.bookings?.length || 0;
    const activeBookings = customer.bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
    const pendingFollowUps = customer.follow_ups?.filter((f: any) => f.status === 'pending').length || 0;
    const lastCommunication = customer.communications?.[0]?.created_at;

    return { totalBookings, activeBookings, pendingFollowUps, lastCommunication };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">جاري تحميل بيانات العملاء...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* العنوان والبحث */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-bold">إدارة العملاء</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="البحث عن عميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 w-full sm:w-64"
              />
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              عميل جديد
            </Button>
          </div>
        </div>

        {/* الإحصائيات السريعة */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{customers?.length || 0}</div>
              <div className="text-sm text-gray-600">إجمالي العملاء</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {customers?.filter(c => c.bookings?.some((b: any) => b.status === 'confirmed')).length || 0}
              </div>
              <div className="text-sm text-gray-600">عملاء نشطين</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {customers?.filter(c => c.follow_ups?.some((f: any) => f.status === 'pending')).length || 0}
              </div>
              <div className="text-sm text-gray-600">يحتاجون متابعة</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {customers?.filter(c => !c.communications || c.communications.length === 0).length || 0}
              </div>
              <div className="text-sm text-gray-600">بدون تواصل</div>
            </CardContent>
          </Card>
        </div>

        {/* قائمة العملاء */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredCustomers.map((customer) => {
            const stats = getCustomerStats(customer);
            return (
              <Card key={customer.id} className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                      <div className="space-y-1 mt-2">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </div>
                    {stats.pendingFollowUps > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.pendingFollowUps} مهام عالقة
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* إحصائيات العميل */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-lg font-bold text-blue-600">{stats.totalBookings}</div>
                      <div className="text-xs text-gray-600">إجمالي الحجوزات</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">{stats.activeBookings}</div>
                      <div className="text-xs text-gray-600">حجوزات نشطة</div>
                    </div>
                  </div>

                  {/* آخر تواصل */}
                  {stats.lastCommunication && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      آخر تواصل: {new Date(stats.lastCommunication).toLocaleDateString('ar-EG')}
                    </div>
                  )}

                  {/* أزرار العمليات */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleOpenCustomerService(customer)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      خدمة العملاء
                    </Button>
                    <Button variant="outline" size="sm">
                      تعديل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dialog خدمة العملاء */}
        <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                خدمة العملاء - {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            {customerData && (
              <CustomerServiceTabs 
                customer={customerData} 
                onUpdate={() => {
                  refetchCustomerData();
                  refetch();
                }} 
              />
            )}
          </DialogContent>
        </Dialog>

        {filteredCustomers.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-8 text-center text-gray-500">
              {searchTerm ? "لا توجد نتائج للبحث" : "لا يوجد عملاء مسجلين"}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Customers;
