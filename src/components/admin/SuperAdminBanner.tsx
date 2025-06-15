
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, Loader2 } from "lucide-react";
import { useSuperAdminActions } from "@/hooks/useSuperAdminActions";

const SuperAdminBanner = () => {
  const { endImpersonation, isLoading } = useSuperAdminActions();
  
  // Check if we're in impersonation mode
  const isImpersonating = localStorage.getItem('admin_impersonation_session');
  
  console.log('🎯 SuperAdminBanner - حالة التحميل:', isLoading);
  console.log('🎯 SuperAdminBanner - وضع التنكر:', !!isImpersonating);
  
  if (!isImpersonating) {
    console.log('🚫 SuperAdminBanner - لا يوجد وضع تنكر، إخفاء البانر');
    return null;
  }

  const handleEndImpersonation = async () => {
    console.log('🎯 SuperAdminBanner - النقر على زر إنهاء التنكر');
    
    try {
      const result = await endImpersonation();
      console.log('🎯 SuperAdminBanner - نتيجة إنهاء التنكر:', result);
    } catch (error) {
      console.error('🎯 SuperAdminBanner - خطأ في إنهاء التنكر:', error);
    }
  };

  return (
    <div className="bg-red-600 text-white px-4 py-2 text-center relative">
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          أنت تتصفح النظام كمستخدم آخر - وضع السوبر أدمن
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleEndImpersonation}
          disabled={isLoading}
          className="ml-4 min-w-[140px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              جاري الإنهاء...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-1" />
              العودة للسوبر أدمن
            </>
          )}
        </Button>
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-red-700 bg-opacity-50 flex items-center justify-center">
          <div className="text-sm">جاري إنهاء جلسة تسجيل الدخول...</div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminBanner;
