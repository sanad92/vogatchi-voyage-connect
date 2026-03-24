import { useState } from "react";
import { Plus, Users, Star, Grid, Table, BarChart3, MessageCircle, TrendingUp, Brain, AlertTriangle } from "lucide-react";
import { useClientPagination } from "@/hooks/useClientPagination";
import PaginationControlsUI from "@/components/ui/pagination-controls";
import BreadcrumbNav from "@/components/ui/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerStats from "@/components/customers/CustomerStats";
import CustomerFilters from "@/components/customers/CustomerFilters";
import CustomerGrid from "@/components/customers/CustomerGrid";
import CustomerTableView from "@/components/customers/CustomerTableView";
import CustomerAdvancedSearch, { CustomerSearchFilters } from "@/components/customers/CustomerAdvancedSearch";
import CustomerFollowUpManager from "@/components/customers/CustomerFollowUpManager";
import CustomerDataExporter from "@/components/customers/CustomerDataExporter";
import CustomerDetailsDialog from "@/components/customers/CustomerDetailsDialog";
import QuickCustomerAdd from "@/components/customers/QuickCustomerAdd";
import CustomerPersonalDashboard from "@/components/customers/CustomerPersonalDashboard";
import CustomerCommunicationHub from "@/components/customers/CustomerCommunicationHub";
import CustomerSmartAnalytics from "@/components/customers/CustomerSmartAnalytics";
import CustomerLoyaltyManager from "@/components/customers/CustomerLoyaltyManager";
import AdvancedFollowUpAutomation from "@/components/customers/AdvancedFollowUpAutomation";
import CustomerSatisfactionTracker from "@/components/customers/CustomerSatisfactionTracker";
import SmartCustomerSegmentation from "@/components/customers/SmartCustomerSegmentation";
import PredictiveAnalytics from "@/components/customers/PredictiveAnalytics";
import ComplaintManagementSystem from "@/components/customers/ComplaintManagementSystem";
import { useCustomers } from "@/hooks/useCustomers";
import { Customer } from "@/types/customer";

const Customers = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [searchFilters, setSearchFilters] = useState<CustomerSearchFilters>({
    searchTerm: '',
    segment: 'all',
    nationality: 'all',
    totalBookingsMin: '',
    totalBookingsMax: '',
    totalSpentMin: '',
    totalSpentMax: '',
    lastBookingDateRange: undefined,
    registrationDateRange: undefined,
    communicationPreference: 'all',
    hasEmail: null,
    hasWhatsapp: null
  });
  
  const { customers, isLoading: customersLoading, error: customersError } = useCustomers();

  const handleCustomerAdded = (customer: any) => {
    console.log('Customer added:', customer);
    setIsAddDialogOpen(false);
  };

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false);
  };

  const applyAdvancedFilters = (customers: Customer[], filters: CustomerSearchFilters) => {
    let filtered = customers;

    // فلتر النص
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(filters.searchTerm) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.passport_number?.toLowerCase().includes(searchLower)
      );
    }

    // فلتر الشريحة
    if (filters.segment !== 'all') {
      filtered = filtered.filter(customer => {
        if (filters.segment === 'vip') {
          return customer.segment?.name === 'VIP' || customer.total_spent > 50000;
        }
        if (filters.segment === 'regular') {
          return customer.total_bookings > 1 && customer.total_spent <= 50000;
        }
        if (filters.segment === 'new') {
          return customer.total_bookings === 0;
        }
        return customer.segment_id === filters.segment;
      });
    }

    // فلتر الجنسية
    if (filters.nationality !== 'all') {
      filtered = filtered.filter(customer => customer.nationality === filters.nationality);
    }

    // فلتر عدد الحجوزات
    if (filters.totalBookingsMin) {
      filtered = filtered.filter(customer => 
        (customer.total_bookings || 0) >= parseInt(filters.totalBookingsMin)
      );
    }
    if (filters.totalBookingsMax) {
      filtered = filtered.filter(customer => 
        (customer.total_bookings || 0) <= parseInt(filters.totalBookingsMax)
      );
    }

    // فلتر إجمالي الإنفاق
    if (filters.totalSpentMin) {
      filtered = filtered.filter(customer => 
        (customer.total_spent || 0) >= parseFloat(filters.totalSpentMin)
      );
    }
    if (filters.totalSpentMax) {
      filtered = filtered.filter(customer => 
        (customer.total_spent || 0) <= parseFloat(filters.totalSpentMax)
      );
    }

    // فلتر تاريخ آخر حجز
    if (filters.lastBookingDateRange?.from && filters.lastBookingDateRange?.to) {
      filtered = filtered.filter(customer => {
        if (!customer.last_booking_date) return false;
        const bookingDate = new Date(customer.last_booking_date);
        return bookingDate >= filters.lastBookingDateRange!.from! && 
               bookingDate <= filters.lastBookingDateRange!.to!;
      });
    }

    // فلتر تاريخ التسجيل
    if (filters.registrationDateRange?.from && filters.registrationDateRange?.to) {
      filtered = filtered.filter(customer => {
        if (!customer.created_at) return false;
        const registrationDate = new Date(customer.created_at);
        return registrationDate >= filters.registrationDateRange!.from! && 
               registrationDate <= filters.registrationDateRange!.to!;
      });
    }

    // فلتر البريد الإلكتروني
    if (filters.hasEmail !== null) {
      filtered = filtered.filter(customer => 
        filters.hasEmail ? !!customer.email : !customer.email
      );
    }

    return filtered;
  };

  // Filter customers based on active tab and search/segment filters
  const getFilteredCustomers = () => {
    if (!customers) return [];
    
    let filtered = customers;
    
    // Apply segment filter
    if (activeSegment) {
      filtered = filtered.filter(customer => customer.segment_id === activeSegment);
    }
    
    // Apply advanced search filters
    filtered = applyAdvancedFilters(filtered, searchFilters);
    
    // Apply tab filter
    switch (activeTab) {
      case 'vip':
        return filtered.filter(customer => 
          customer.segment?.name === 'VIP' || customer.total_spent > 50000 || customer.total_bookings > 10
        );
      case 'new':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return filtered.filter(customer => 
          new Date(customer.created_at) > thirtyDaysAgo
        );
      case 'inactive':
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return filtered.filter(customer => 
          !customer.last_booking_date || new Date(customer.last_booking_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
      default:
        return filtered;
    }
  };

  const filteredCustomers = getFilteredCustomers();
  const { paginatedItems: paginatedCustomers, pagination } = useClientPagination(filteredCustomers, 25);

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

  const handleSearch = (filters: CustomerSearchFilters) => {
    setSearchFilters(filters);
  };

  const handleClearSearch = () => {
    setSearchFilters({
      searchTerm: '',
      segment: 'all',
      nationality: 'all',
      totalBookingsMin: '',
      totalBookingsMax: '',
      totalSpentMin: '',
      totalSpentMax: '',
      lastBookingDateRange: undefined,
      registrationDateRange: undefined,
      communicationPreference: 'all',
      hasEmail: null,
      hasWhatsapp: null
    });
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'إدارة العملاء' }
      ]} />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 sm:h-8 sm:w-8" />
          إدارة العملاء
        </h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <CustomerDataExporter 
            customers={filteredCustomers}
            selectedCustomers={selectedCustomers}
          />
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="whitespace-nowrap">
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
      </div>

      {/* إحصائيات العملاء */}
      <CustomerStats 
        totalCustomers={stats.totalCustomers}
        activeCustomers={stats.activeCustomers}
        needsFollowUp={stats.needsFollowUp}
        noCommunication={stats.noCommunication}
      />

      {/* البحث المتقدم */}
      <CustomerAdvancedSearch 
        onSearch={handleSearch}
        onClear={handleClearSearch}
      />

      {/* فلاتر تقسيم العملاء */}
      <CustomerFilters 
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto gap-2 p-1 rounded-md bg-muted/40">
          <TabsTrigger value="all" className="shrink-0">جميع العملاء</TabsTrigger>
          <TabsTrigger value="vip" className="flex items-center gap-2 shrink-0">
            <Star className="h-4 w-4" />
            VIP
          </TabsTrigger>
          <TabsTrigger value="new" className="shrink-0">عملاء جدد</TabsTrigger>
          <TabsTrigger value="inactive" className="shrink-0">غير نشطين</TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2 shrink-0">
            <TrendingUp className="h-4 w-4" />
            لوحتي
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 shrink-0">
            <BarChart3 className="h-4 w-4" />
            تحليلات
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2 shrink-0">
            <Star className="h-4 w-4" />
            الولاء
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2 shrink-0">
            <MessageCircle className="h-4 w-4" />
            الأتمتة
          </TabsTrigger>
          <TabsTrigger value="segmentation" className="flex items-center gap-2 shrink-0">
            <Brain className="h-4 w-4" />
            التقسيم الذكي
          </TabsTrigger>
          <TabsTrigger value="complaints" className="flex items-center gap-2 shrink-0">
            <AlertTriangle className="h-4 w-4" />
            الشكاوى
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <CustomerPersonalDashboard customers={filteredCustomers} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <CustomerSmartAnalytics customers={filteredCustomers} />
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <CustomerLoyaltyManager
              customers={filteredCustomers}
              selectedCustomers={selectedCustomers}
            />
            <CustomerSatisfactionTracker
              customers={filteredCustomers}
              selectedCustomers={selectedCustomers}
            />
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <AdvancedFollowUpAutomation customers={filteredCustomers} />
        </TabsContent>

        <TabsContent value="segmentation" className="space-y-4">
          <SmartCustomerSegmentation customers={filteredCustomers} />
          <PredictiveAnalytics customers={filteredCustomers} />
        </TabsContent>

        <TabsContent value="complaints" className="space-y-4">
          <ComplaintManagementSystem customers={filteredCustomers} />
        </TabsContent>

        <TabsContent value={activeTab} className="space-y-4" 
          style={{ display: ['all', 'vip', 'new', 'inactive'].includes(activeTab) ? 'block' : 'none' }}>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              عرض {pagination.from} - {pagination.to} من أصل {filteredCustomers.length} عميل
            </p>
          </div>

          {/* قائمة العملاء */}
          {viewMode === "grid" ? (
            <CustomerGrid 
              customers={paginatedCustomers}
              isLoading={customersLoading}
              error={customersError}
              activeTab={activeTab}
              onCustomerSelect={setSelectedCustomer}
              onAddNewCustomer={() => setIsAddDialogOpen(true)}
            />
          ) : (
            <CustomerTableView
              customers={paginatedCustomers}
              onCustomerSelect={setSelectedCustomer}
              selectedCustomers={selectedCustomers}
              onSelectionChange={setSelectedCustomers}
            />
          )}

          <PaginationControlsUI pagination={pagination} />

          {/* مركز التواصل المتعدد */}
          {viewMode === "table" && (
            <>
              <CustomerCommunicationHub
                customers={filteredCustomers}
                selectedCustomers={selectedCustomers}
              />
              
              {/* إدارة المتابعات */}
              <CustomerFollowUpManager
                customers={filteredCustomers}
                selectedCustomers={selectedCustomers}
              />
            </>
          )}
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
