
import { useState } from "react";
import { Plus, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerStats from "@/components/customers/CustomerStats";
import CustomerFilters from "@/components/customers/CustomerFilters";
import CustomerSearchBar from "@/components/customers/CustomerSearchBar";
import CustomerGrid from "@/components/customers/CustomerGrid";
import CustomerDetailsDialog from "@/components/customers/CustomerDetailsDialog";
import QuickCustomerAdd from "@/components/customers/QuickCustomerAdd";
import { useCustomers } from "@/hooks/useCustomers";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const { customers, isLoading: customersLoading, error: customersError } = useCustomers(searchTerm, activeSegment);

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
      <CustomerFilters 
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
      />

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
          <CustomerSearchBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onCustomerSelect={(customer) => setSelectedCustomer(customer.id)}
            onNewCustomer={() => setIsAddDialogOpen(true)}
          />

          {/* قائمة العملاء */}
          <CustomerGrid 
            customers={filteredCustomers}
            isLoading={customersLoading}
            error={customersError}
            activeTab={activeTab}
            onCustomerSelect={setSelectedCustomer}
            onAddNewCustomer={() => setIsAddDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* عرض تفاصيل العميل المحدد */}
      <CustomerDetailsDialog 
        selectedCustomer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
};

export default Customers;
