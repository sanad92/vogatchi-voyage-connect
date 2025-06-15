
import React, { useState } from "react";
import CustomerCard from "./CustomerCard";
import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { Customer } from "@/types/customer";

interface CustomerGridProps {
  customers: Customer[];
  isLoading: boolean;
  error: any;
  activeTab: string;
  onCustomerSelect: (customerId: string) => void;
  onAddNewCustomer: () => void;
}

const CustomerGrid = ({ 
  customers, 
  isLoading, 
  error, 
  activeTab, 
  onCustomerSelect, 
  onAddNewCustomer 
}: CustomerGridProps) => {
  const { refetch } = useCustomers();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);

  // تحديث البيانات المحلية عند تغيير البيانات الواردة
  React.useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    // تحديث البيانات المحلية فوراً
    setLocalCustomers(prevCustomers => 
      prevCustomers.map(customer => 
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      )
    );
    
    // إعادة تحميل البيانات من الخادم للتأكد من التحديث
    handleRefresh();
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
    } catch (error) {
      console.error('خطأ في إعادة تحميل البيانات:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">خطأ في تحميل العملاء: {error.message}</p>
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

  if (!localCustomers || localCustomers.length === 0) {
    return (
      <div className="text-center py-12">
        <UserPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {activeTab === 'all' ? 'لا توجد عملاء بعد' : `لا توجد عملاء في فئة "${activeTab}"`}
        </h3>
        <p className="text-gray-500 mb-6">
          {activeTab === 'all' ? 'ابدأ بإضافة عميلك الأول' : 'جرب البحث في فئة أخرى أو أضف عميل جديد'}
        </p>
        <Button onClick={onAddNewCustomer}>
          <UserPlus className="h-4 w-4 mr-2" />
          إضافة عميل جديد
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {localCustomers.length} عميل
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {localCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onSelect={() => onCustomerSelect(customer.id)}
            onCustomerUpdated={handleCustomerUpdated}
          />
        ))}
      </div>
    </div>
  );
};

export default CustomerGrid;
