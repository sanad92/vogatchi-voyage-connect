
import CustomerCard from "./CustomerCard";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
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

  const handleCustomerUpdated = () => {
    // إعادة تحميل قائمة العملاء عند التحديث
    refetch();
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
        <Button onClick={() => window.location.reload()} variant="outline">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {customers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onSelect={() => onCustomerSelect(customer.id)}
          onCustomerUpdated={handleCustomerUpdated}
        />
      ))}
    </div>
  );
};

export default CustomerGrid;
