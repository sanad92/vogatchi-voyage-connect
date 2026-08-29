
import { useState } from "react";
import CustomerCard from "./CustomerCard";
import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw } from "lucide-react";
import { Customer } from "@/types/customer";

interface CustomerGridProps {
  customers: Customer[];
  isLoading: boolean;
  error: Error | null;
  activeTab: string;
  onCustomerSelect: (customerId: string) => void;
  onAddNewCustomer?: () => void;
  onRefresh: () => Promise<unknown>;
  onCustomerUpdated: () => void;
  onCustomerArchive?: (customer: Customer) => void;
}

const CustomerGrid = ({ 
  customers, 
  isLoading, 
  error, 
  activeTab, 
  onCustomerSelect,
  onAddNewCustomer,
  onRefresh,
  onCustomerUpdated,
  onCustomerArchive,
}: CustomerGridProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCustomerUpdated = () => onCustomerUpdated();

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
    } catch {
      // The query error state renders the retry message.
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">خطأ في تحميل العملاء: {error.message}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            إعادة المحاولة
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            إعادة تحميل الصفحة
          </Button>
        </div>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-12">
        <UserPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {activeTab === 'all'
            ? 'لا يوجد عملاء بعد'
            : activeTab === 'archived'
              ? 'لا يوجد عملاء مؤرشفون'
              : 'لا يوجد عملاء في هذه الفئة'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {activeTab === 'all' ? 'ابدأ بإضافة عميلك الأول' : 'جرّب البحث في فئة أخرى.'}
        </p>
        {onAddNewCustomer && <Button onClick={onAddNewCustomer}>
          <UserPlus className="h-4 w-4 mr-2" />
          إضافة عميل جديد
        </Button>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {customers.length} عميل
        </p>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {customers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onSelect={() => onCustomerSelect(customer.id)}
            onCustomerUpdated={handleCustomerUpdated}
            onArchive={onCustomerArchive}
          />
        ))}
      </div>
    </div>
  );
};

export default CustomerGrid;
