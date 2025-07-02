
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, X, RefreshCw, Crown } from "lucide-react";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";

interface CustomerPermissionCheckProps {
  userRole: string | null;
  onCancel: () => void;
}

const CustomerPermissionCheck = ({ userRole, onCancel }: CustomerPermissionCheckProps) => {
  const { user, profile, hasRole, isSuperAdmin } = useOptimizedAuth();
  
  console.log('🚫 عرض رسالة عدم وجود صلاحيات:', { 
    userRole,
    userEmail: user?.email,
    profileEmail: profile?.email,
    isSuperAdmin: isSuperAdmin()
  });

  const handleRefresh = () => {
    console.log('🔄 إعادة تحميل الصفحة لتحديث الصلاحيات');
    window.location.reload();
  };

  // إذا كان السوبر أدمن، فلديه صلاحية كاملة
  if (isSuperAdmin()) {
    return null; // لا نعرض هذا المكون للسوبر أدمن
  }
  
  return (
    <Card className="w-full border-orange-200 bg-orange-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg text-orange-800">ليس لديك صلاحية</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <p className="text-orange-700 mb-2">ليس لديك صلاحية إدارة العملاء.</p>
          <p className="text-orange-600 text-sm mb-2">
            الأدوار المسموح لها: سوبر أدمن، أدمن، مدير، مندوب مبيعات، خدمة عملاء، موظف حجوزات، أو محاسب
          </p>
          
          <div className="bg-orange-100 p-3 rounded mt-3 space-y-2">
            <p className="text-gray-700 text-sm font-medium">معلومات المستخدم الحالي:</p>
            <div className="text-gray-600 text-sm space-y-1">
              <p>الإيميل: {user?.email || 'غير محدد'}</p>
              <p>الاسم: {profile?.full_name || 'غير محدد'}</p>
              <p>الدور: {userRole || 'غير محدد'}</p>
              <p>الحساب مفعل: {profile?.is_active ? 'نعم' : 'لا'}</p>
            </div>
            
            <div className="mt-2 pt-2 border-t border-orange-200">
              <p className="text-xs text-gray-500 mb-1">فحص الصلاحيات:</p>
              <div className="text-xs text-gray-500 space-y-1 grid grid-cols-2 gap-1">
                <p className="flex items-center gap-1">
                  {isSuperAdmin() && <Crown className="h-3 w-3 text-yellow-500" />}
                  سوبر أدمن: {isSuperAdmin() ? '✅' : '❌'}
                </p>
                <p>أدمن: {hasRole('admin') ? '✅' : '❌'}</p>
                <p>مدير: {hasRole('manager') ? '✅' : '❌'}</p>
                <p>مبيعات: {hasRole('sales_agent') ? '✅' : '❌'}</p>
                <p>خدمة عملاء: {hasRole('customer_service') ? '✅' : '❌'}</p>
                <p>حجوزات: {hasRole('booking_agent') ? '✅' : '❌'}</p>
                <p>محاسب: {hasRole('accountant') ? '✅' : '❌'}</p>
              </div>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-3 text-orange-600 border-orange-300 hover:bg-orange-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة تحميل الصلاحيات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerPermissionCheck;
