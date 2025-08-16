import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, User, Lock } from 'lucide-react';

const LoginWelcome = () => {
  return (
    <div className="space-y-4 mb-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">مرحباً بك في نظام فوجاتچي للإدارة</h3>
            <p className="text-sm">يمكنك تسجيل الدخول باستخدام الحسابات التجريبية التالية:</p>
            
            <div className="grid gap-3 mt-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">المدير العام (السوبر أدمن)</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">البريد:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">admin@vogatchi.com</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">كلمة المرور:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">123456</code>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">مدير الفرع</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">البريد:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">manager@vogatchi.com</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">كلمة المرور:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">123456</code>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800">مندوب مبيعات</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">البريد:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">sales@vogatchi.com</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">كلمة المرور:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">123456</code>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">موظف حجوزات</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">البريد:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">booking@vogatchi.com</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">كلمة المرور:</span>
                    <code className="bg-white px-2 py-1 rounded text-xs">123456</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>ملاحظة:</strong> هذا نظام تجريبي. كل دور له صلاحيات مختلفة - جرب الأدوار المختلفة لاكتشاف الوظائف المتاحة لكل منها.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default LoginWelcome;