import { useState } from "react";
import { Plus, Users, Star, Grid, Table, Archive } from "lucide-react";
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
import CustomerDataExporter from "@/components/customers/CustomerDataExporter";
import CustomerDetailsDialog from "@/components/customers/CustomerDetailsDialog";
import QuickCustomerAdd from "@/components/customers/QuickCustomerAdd";
import CustomerEditDialog from '@/components/customers/CustomerEditDialog';
import { useCustomers } from "@/hooks/useCustomers";
import { Customer } from "@/types/customer";
import { useSupabasePermissions } from "@/hooks/useSupabasePermissions";
import {
  hasCustomerCommunicationPreference,
  hasCustomerWhatsapp,
  isCustomerArchived,
  isVipCustomer,
  matchesInclusiveDateRange,
} from '@/lib/customerFilters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Customers = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Customer | null>(null);
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
  
  const {
    customers,
    isLoading: customersLoading,
    error: customersError,
    refetch,
    setCustomerArchived,
    isArchivingCustomer,
  } = useCustomers();
  const { canCreateCustomers, canEditCustomers, canDeleteCustomers, hasPermission } = useSupabasePermissions();

  const handleCustomerAdded = (customer: Customer) => {
    setIsAddDialogOpen(false);
    void refetch();
    setSelectedCustomer(customer.id);
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
          return isVipCustomer(customer);
        }
        if (filters.segment === 'regular') {
          return Number(customer.total_bookings || 0) > 0 && !isVipCustomer(customer);
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
    if (filters.lastBookingDateRange?.from || filters.lastBookingDateRange?.to) {
      filtered = filtered.filter(customer =>
        matchesInclusiveDateRange(customer.last_booking_date, filters.lastBookingDateRange)
      );
    }

    // فلتر تاريخ التسجيل
    if (filters.registrationDateRange?.from || filters.registrationDateRange?.to) {
      filtered = filtered.filter(customer =>
        matchesInclusiveDateRange(customer.created_at, filters.registrationDateRange)
      );
    }

    // فلتر البريد الإلكتروني
    if (filters.hasEmail !== null) {
      filtered = filtered.filter(customer => 
        filters.hasEmail ? !!customer.email : !customer.email
      );
    }

    if (filters.communicationPreference !== 'all') {
      filtered = filtered.filter(customer =>
        hasCustomerCommunicationPreference(
          customer,
          filters.communicationPreference as 'whatsapp' | 'email' | 'sms',
        )
      );
    }

    if (filters.hasWhatsapp !== null) {
      filtered = filtered.filter(customer =>
        filters.hasWhatsapp ? hasCustomerWhatsapp(customer) : !hasCustomerWhatsapp(customer)
      );
    }

    return filtered;
  };

  // Filter customers based on active tab and search/segment filters
  const getFilteredCustomers = () => {
    if (!customers) return [];
    
    let filtered = activeTab === 'archived'
      ? customers.filter(isCustomerArchived)
      : customers.filter((customer) => !isCustomerArchived(customer));
    
    // Apply segment filter
    if (activeSegment) {
      filtered = filtered.filter(customer => customer.segment_id === activeSegment);
    }
    
    // Apply advanced search filters
    filtered = applyAdvancedFilters(filtered, searchFilters);
    
    // Apply tab filter
    switch (activeTab) {
      case 'vip':
        return filtered.filter(isVipCustomer);
      case 'new': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return filtered.filter(customer =>
          Boolean(customer.created_at) && new Date(customer.created_at!).getTime() > thirtyDaysAgo.getTime()
        );
      }
      case 'inactive': {
        const inactiveCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        return filtered.filter(customer => 
          !customer.last_booking_date || new Date(customer.last_booking_date) < inactiveCutoff
        );
      }
      default:
        return filtered;
    }
  };

  const filteredCustomers = getFilteredCustomers();
  const { paginatedItems: paginatedCustomers, pagination } = useClientPagination(filteredCustomers, 25);

  // Calculate stats from real data
  const currentCustomers = customers?.filter((customer) => !isCustomerArchived(customer)) || [];
  const stats = {
    totalCustomers: currentCustomers.length,
    activeCustomers: currentCustomers.filter(c => c.last_booking_date &&
      new Date(c.last_booking_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length,
    needsFollowUp: currentCustomers.filter(c => Number(c.total_bookings || 0) > 0 &&
      (!c.last_booking_date || new Date(c.last_booking_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    ).length,
    noBookings: currentCustomers.filter(c => Number(c.total_bookings || 0) === 0).length,
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await setCustomerArchived({
        customerId: archiveTarget.id,
        archived: !archiveTarget.archived_at,
      });
      setSelectedCustomers((ids) => ids.filter((id) => id !== archiveTarget.id));
      if (selectedCustomer === archiveTarget.id) setSelectedCustomer(null);
      setArchiveTarget(null);
    } catch {
      // The mutation displays the permission or database error.
    }
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
          {hasPermission('customers_export') && <CustomerDataExporter
            customers={filteredCustomers}
            selectedCustomers={selectedCustomers}
          />}
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
          {canCreateCustomers() && <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                onViewCustomer={(customerId) => {
                  setIsAddDialogOpen(false);
                  setSelectedCustomer(customerId);
                }}
              />
            </DialogContent>
          </Dialog>}
        </div>
      </div>

      {/* إحصائيات العملاء */}
      <CustomerStats 
        totalCustomers={stats.totalCustomers}
        activeCustomers={stats.activeCustomers}
        needsFollowUp={stats.needsFollowUp}
        noBookings={stats.noBookings}
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
          <TabsTrigger value="archived" className="flex items-center gap-2 shrink-0">
            <Archive className="h-4 w-4" />
            المؤرشفون
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4" 
          style={{ display: ['all', 'vip', 'new', 'inactive', 'archived'].includes(activeTab) ? 'block' : 'none' }}>
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
              onAddNewCustomer={canCreateCustomers() ? () => setIsAddDialogOpen(true) : undefined}
              onRefresh={refetch}
              onCustomerUpdated={() => void refetch()}
              onCustomerArchive={canDeleteCustomers() ? setArchiveTarget : undefined}
            />
          ) : (
            <CustomerTableView
              customers={paginatedCustomers}
              onCustomerSelect={setSelectedCustomer}
              onCustomerEdit={canEditCustomers() ? setEditingCustomer : undefined}
              onCustomerArchive={canDeleteCustomers() ? setArchiveTarget : undefined}
              selectedCustomers={selectedCustomers}
              onSelectionChange={setSelectedCustomers}
            />
          )}

          <PaginationControlsUI pagination={pagination} />

        </TabsContent>
      </Tabs>

      {/* عرض تفاصيل العميل المحدد */}
      <CustomerDetailsDialog 
        selectedCustomer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />

      {editingCustomer && (
        <CustomerEditDialog
          customer={editingCustomer}
          open
          onClose={() => setEditingCustomer(null)}
          onSave={() => {
            setEditingCustomer(null);
            void refetch();
          }}
        />
      )}

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveTarget?.archived_at ? 'استعادة العميل' : 'أرشفة العميل'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.archived_at
                ? 'سيعود العميل إلى القوائم النشطة، وستظل كل حجوزاته وفواتيره مرتبطة به.'
                : 'سيختفي العميل من القوائم النشطة دون حذف أي حجوزات أو فواتير، ويمكن استعادته لاحقًا.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchivingCustomer}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={isArchivingCustomer}>
              {isArchivingCustomer
                ? 'جاري الحفظ...'
                : archiveTarget?.archived_at ? 'استعادة' : 'أرشفة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;
