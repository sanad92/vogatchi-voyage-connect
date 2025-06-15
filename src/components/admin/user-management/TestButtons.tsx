
import React from "react";
import { Button } from "@/components/ui/button";
import { TestTube } from "lucide-react";
import { User } from "@/types/userManagement";
import { toast } from "sonner";

interface TestButtonsProps {
  user: User;
  showTestMode: boolean;
  onToggleTestMode: () => void;
  onTestButton: () => void;
  onTestLogin: () => void;
  onShowPassword: () => void;
  onShowEdit: () => void;
  onToggleActive: () => void;
}

const TestButtons = ({ 
  user, 
  showTestMode, 
  onToggleTestMode, 
  onTestButton, 
  onTestLogin, 
  onShowPassword, 
  onShowEdit, 
  onToggleActive 
}: TestButtonsProps) => {
  return (
    <>
      {/* أزرار الاختبار المباشر */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onTestButton}
        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
        title="اختبار النقر المباشر"
      >
        <TestTube className="h-4 w-4" />
      </Button>

      {/* زر اختبار تسجيل الدخول المباشر */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onTestLogin}
        className="h-8 px-2 text-green-600 hover:bg-green-50 text-xs"
        title="اختبار تسجيل الدخول المباشر"
      >
        اختبار
      </Button>

      {/* زر تبديل وضع الاختبار */}
      <Button
        variant={showTestMode ? "default" : "outline"}
        size="sm"
        onClick={onToggleTestMode}
        className="h-8 px-2 text-xs"
      >
        {showTestMode ? 'إخفاء الاختبار' : 'إظهار الاختبار'}
      </Button>

      {/* أزرار الاختبار الإضافية (تظهر فقط في وضع الاختبار) */}
      {showTestMode && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowPassword}
            className="h-8 px-2 text-xs text-orange-600 hover:bg-orange-50"
          >
            كلمة المرور
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowEdit}
            className="h-8 px-2 text-xs text-purple-600 hover:bg-purple-50"
          >
            تعديل
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleActive}
            className="h-8 px-2 text-xs text-red-600 hover:bg-red-50"
          >
            تفعيل/تعطيل
          </Button>
        </div>
      )}
    </>
  );
};

export default TestButtons;
