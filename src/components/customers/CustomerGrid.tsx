
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerCard from "./CustomerCard";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_bookings?: number;
  total_spent?: number;
  loyalty_points?: number;
  last_booking_date?: string;
  segment_id?: string;
}

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
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">جاري تحميل بيانات العملاء...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">حدث خطأ في تحميل بيانات العملاء</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">لا توجد عملاء</h3>
        <p className="text-gray-600 mb-4">
          {activeTab === 'all' ? 'لم يتم العثور على أي عملاء' :
           activeTab === 'vip' ? 'لا توجد عملاء VIP حالياً' :
           activeTab === 'new' ? 'لا توجد عملاء جدد في آخر 30 يوم' :
           'لا توجد عملاء غير نشطين'}
        </p>
        <Button onClick={onAddNewCustomer}>
          <Plus className="h-4 w-4 mr-2" />
          إضافة عميل جديد
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {customers.map((customer) => (
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
          onSelect={() => onCustomerSelect(customer.id)}
        />
      ))}
    </div>
  );
};

export default CustomerGrid;
