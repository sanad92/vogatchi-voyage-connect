
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import CustomerStats from "@/components/customers/CustomerStats";
import CustomerCard from "@/components/customers/CustomerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Search, Plus } from "lucide-react";
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

  // إحصائيات العملاء
  const totalCustomers = customers?.length || 0;
  const activeCustomers = customers?.filter(c => c.bookings?.some((b: any) => b.status === 'confirmed')).length || 0;
  const needsFollowUp = customers?.filter(c => c.follow_ups?.some((f: any) => f.status === 'pending')).length || 0;
  const noCommunication = customers?.filter(c => !c.communications || c.communications.length === 0).length || 0;

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
        <CustomerStats
          totalCustomers={totalCustomers}
          activeCustomers={activeCustomers}
          needsFollowUp={needsFollowUp}
          noCommunication={noCommunication}
        />

        {/* قائمة العملاء */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onServiceClick={handleOpenCustomerService}
            />
          ))}
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
