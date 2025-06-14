
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
  const { userRole, hasRole, loading, user, profile } = useAuth();

  console.log('🧩 QuickCustomerAdd - معلومات تشخيصية مفصلة:', {
    loading,
    user: {
      exists: !!user,
      email: user?.email,
      id: user?.id
    },
    profile: {
      exists: !!profile,
      email: profile?.email,
      fullName: profile?.full_name,
      isActive: profile?.is_active
    },
    userRole,
    permissionChecks: {
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

  // التحقق من وجود المستخدم
  if (!user) {
    console.log('❌ لا يوجد مستخدم مسجل');
    return (
      <div className="text-center p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">يجب تسجيل الدخول أولاً</p>
      </div>
    );
  }

  // التحقق من وجود الملف الشخصي
  if (!profile) {
    console.log('❌ لا يوجد ملف شخصي للمستخدم');
    return (
      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-600">حسابك قيد المراجعة أو غير مكتمل</p>
      </div>
    );
  }

  // التحقق من تفعيل الحساب
  if (!profile.is_active) {
    console.log('❌ حساب المستخدم غير مفعل');
    return (
      <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded">
        <p className="text-orange-600">حسابك غير مفعل حالياً</p>
      </div>
    );
  }

  // التحقق من وجود دور
  if (!userRole) {
    console.log('❌ لا يوجد دور محدد للمستخدم');
    return (
      <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded">
        <p className="text-purple-600">لم يتم تعيين دور لحسابك بعد</p>
        <p className="text-sm text-purple-500 mt-2">
          المستخدم: {profile.email} | الاسم: {profile.full_name}
        </p>
      </div>
    );
  }

  // التحقق من الصلاحيات - السماح للأدوار المخولة بإضافة العملاء
  const canAddCustomers = hasRole('super_admin') || hasRole('admin') || hasRole('manager') || hasRole('sales_agent');
  
  console.log('🔐 نتيجة فحص صلاحية إضافة العملاء:', {
    canAddCustomers,
    userRole,
    userEmail: user.email,
    detailedChecks: {
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
