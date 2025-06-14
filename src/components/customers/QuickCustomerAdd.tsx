
import { useAuth } from "@/hooks/useAuth";
import CustomerPermissionCheck from "./CustomerPermissionCheck";
import CustomerForm from "./CustomerForm";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  address?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
}

interface QuickCustomerAddProps {
  onCustomerAdded: (customer: Customer) => void;
  onCancel: () => void;
  initialData?: Partial<CustomerData>;
}

const QuickCustomerAdd = ({ onCustomerAdded, onCancel, initialData }: QuickCustomerAddProps) => {
  const { userRole, hasRole } = useAuth();

  // التحقق من الصلاحيات
  const canAddCustomers = hasRole('admin') || hasRole('manager') || hasRole('sales_agent') || hasRole('super_admin');

  // عرض رسالة عدم وجود صلاحيات
  if (!canAddCustomers) {
    return (
      <CustomerPermissionCheck 
        userRole={userRole}
        onCancel={onCancel}
      />
    );
  }

  return (
    <CustomerForm 
      onCustomerAdded={onCustomerAdded}
      onCancel={onCancel}
      initialData={initialData}
    />
  );
};

export default QuickCustomerAdd;
