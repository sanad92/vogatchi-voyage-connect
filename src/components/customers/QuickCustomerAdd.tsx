
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
  const { userRole, hasRole, loading } = useAuth();

  console.log('🧩 QuickCustomerAdd - حالة المستخدم:', {
    userRole,
    loading,
    hasRole: {
      super_admin: hasRole('super_admin'),
      admin: hasRole('admin'),
      manager: hasRole('manager'),
      sales_agent: hasRole('sales_agent')
    }
  });

  // عرض تحميل أثناء فحص الصلاحيات
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mr-2 text-gray-600">جاري التحقق من الصلاحيات...</p>
      </div>
    );
  }

  // التحقق من الصلاحيات - السماح للأدوار المخولة بإضافة العملاء
  const canAddCustomers = hasRole('super_admin') || hasRole('admin') || hasRole('manager') || hasRole('sales_agent');
  
  console.log('🔐 نتيجة فحص صلاحية إضافة العملاء:', {
    canAddCustomers,
    userRole,
    checks: {
      super_admin: hasRole('super_admin'),
      admin: hasRole('admin'),
      manager: hasRole('manager'),
      sales_agent: hasRole('sales_agent')
    }
  });

  // عرض رسالة عدم وجود صلاحيات
  if (!canAddCustomers) {
    console.log('❌ المستخدم ليس لديه صلاحية إضافة العملاء');
    return (
      <CustomerPermissionCheck 
        userRole={userRole}
        onCancel={onCancel}
      />
    );
  }

  console.log('✅ المستخدم لديه صلاحية إضافة العملاء');
  return (
    <CustomerForm 
      onCustomerAdded={onCustomerAdded}
      onCancel={onCancel}
      initialData={initialData}
    />
  );
};

export default QuickCustomerAdd;
