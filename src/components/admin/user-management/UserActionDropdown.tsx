
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  LogIn, 
  KeyRound, 
  Edit, 
  UserX, 
  UserCheck,
  MoreHorizontal
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { User } from "@/types/userManagement";
import { toast } from "sonner";

interface UserActionDropdownProps {
  user: User;
  isLoading: boolean;
  onLoginClick: () => void;
  onEditClick: () => void;
  onPasswordClick: () => void;
  onToggleActive: () => void;
}

const UserActionDropdown = ({ 
  user, 
  isLoading, 
  onLoginClick, 
  onEditClick, 
  onPasswordClick, 
  onToggleActive 
}: UserActionDropdownProps) => {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isLoading}
          className="h-8 w-8 p-0 hover:bg-gray-100 focus:bg-gray-100 data-[state=open]:bg-gray-100"
          onClick={(e) => {
            console.log('🖱️ تم النقر على زر DropdownMenu:', {
              event: e.type,
              target: e.target,
              userId: user.id,
              timestamp: new Date().toISOString()
            });
            e.stopPropagation();
            toast.info('تم النقر على زر القائمة');
          }}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-white border shadow-lg z-50"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem 
          onClick={(e) => {
            console.log('🎯 تم النقر على: تسجيل دخول كمستخدم');
            e.preventDefault();
            e.stopPropagation();
            onLoginClick();
            toast.info('فتح نافذة تسجيل الدخول');
          }}
          className="cursor-pointer hover:bg-gray-100"
        >
          <LogIn className="h-4 w-4 mr-2" />
          تسجيل دخول كمستخدم
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => {
            console.log('🎯 تم النقر على: تعديل البيانات');
            e.preventDefault();
            e.stopPropagation();
            onEditClick();
            toast.info('فتح نافذة التعديل');
          }}
          className="cursor-pointer hover:bg-gray-100"
        >
          <Edit className="h-4 w-4 mr-2" />
          تعديل البيانات
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => {
            console.log('🎯 تم النقر على: إعادة تعيين كلمة المرور');
            e.preventDefault();
            e.stopPropagation();
            onPasswordClick();
            toast.info('فتح نافذة إعادة تعيين كلمة المرور');
          }}
          className="cursor-pointer hover:bg-gray-100"
        >
          <KeyRound className="h-4 w-4 mr-2" />
          إعادة تعيين كلمة المرور
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={(e) => {
            console.log('🎯 تم النقر على: تبديل حالة التفعيل');
            e.preventDefault();
            e.stopPropagation();
            onToggleActive();
          }}
          className={`cursor-pointer hover:bg-gray-100 ${user.is_active ? "text-red-600" : "text-green-600"}`}
        >
          {user.is_active ? (
            <>
              <UserX className="h-4 w-4 mr-2" />
              تعطيل الحساب
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-2" />
              تفعيل الحساب
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserActionDropdown;
