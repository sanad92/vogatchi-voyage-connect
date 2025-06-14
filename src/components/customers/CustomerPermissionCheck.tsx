
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, X } from "lucide-react";

interface CustomerPermissionCheckProps {
  userRole: string | null;
  onCancel: () => void;
}

const CustomerPermissionCheck = ({ userRole, onCancel }: CustomerPermissionCheckProps) => {
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
          <p className="text-orange-700 mb-2">ليس لديك صلاحية إضافة العملاء.</p>
          <p className="text-orange-600 text-sm">
            الأدوار المسموح لها: مدير، مدير مبيعات، أو مندوب مبيعات
          </p>
          <p className="text-gray-600 text-sm mt-2">دورك الحالي: {userRole || 'غير محدد'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerPermissionCheck;
