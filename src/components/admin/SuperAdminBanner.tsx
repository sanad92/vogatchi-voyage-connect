
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import { useSuperAdminActions } from "@/hooks/useSuperAdminActions";

const SuperAdminBanner = () => {
  const { endImpersonation, isLoading } = useSuperAdminActions();
  
  // Check if we're in impersonation mode
  const isImpersonating = localStorage.getItem('admin_impersonation_session');
  
  if (!isImpersonating) return null;

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
          onClick={endImpersonation}
          disabled={isLoading}
          className="ml-4"
        >
          <LogOut className="h-4 w-4 mr-1" />
          العودة للسوبر أدمن
        </Button>
      </div>
    </div>
  );
};

export default SuperAdminBanner;
