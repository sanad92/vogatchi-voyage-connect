
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  LogIn, 
  KeyRound, 
  Edit, 
  Trash2, 
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
import { useSuperAdminActions } from "@/hooks/useSuperAdminActions";
import { User } from "@/types/userManagement";
import { toast } from "sonner";

interface UserActionButtonsProps {
  user: User;
  onUpdate: () => void;
}

const UserActionButtons = ({ user, onUpdate }: UserActionButtonsProps) => {
  console.log('🔄 UserActionButtons تم تحميل المكون للمستخدم:', user.email);
  
  const { loginAsUser, resetUserPassword, updateUserProfile, isLoading } = useSuperAdminActions();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loginReason, setLoginReason] = useState('');
  const [editForm, setEditForm] = useState({
    email: user.email,
    full_name: user.full_name,
    department: user.department || '',
    phone: user.phone || ''
  });

  console.log('📊 حالة المكون:', {
    isLoading,
    showPasswordDialog,
    showLoginDialog,
    showEditDialog,
    userId: user.id,
    userEmail: user.email
  });

  // التحقق من توفر الوظائف
  console.log('🔧 فحص الوظائف المتوفرة:', {
    loginAsUser: typeof loginAsUser,
    resetUserPassword: typeof resetUserPassword,
    updateUserProfile: typeof updateUserProfile,
    isLoading: typeof isLoading
  });

  const handleLoginAsUser = async () => {
    console.log('🚀 بدء عملية تسجيل الدخول كمستخدم:', user.email);
    
    if (!loginAsUser) {
      console.error('❌ وظيفة loginAsUser غير متوفرة');
      toast.error('خطأ: وظيفة تسجيل الدخول غير متوفرة');
      return;
    }

    try {
      console.log('📝 إرسال طلب تسجيل الدخول مع البيانات:', {
        userId: user.id,
        reason: loginReason
      });
      
      const result = await loginAsUser(user.id, loginReason);
      console.log('📋 نتيجة تسجيل الدخول:', result);
      
      if (result.success) {
        setShowLoginDialog(false);
        setLoginReason('');
        console.log('✅ تم تسجيل الدخول بنجاح');
      } else {
        console.error('❌ فشل تسجيل الدخول:', result.error);
        toast.error(result.error || 'فشل في تسجيل الدخول');
      }
    } catch (error) {
      console.error('💥 خطأ في تسجيل الدخول:', error);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    }
  };

  const handleResetPassword = async () => {
    console.log('🔑 بدء عملية إعادة تعيين كلمة المرور للمستخدم:', user.email);
    
    if (!newPassword.trim()) {
      console.warn('⚠️ كلمة المرور فارغة');
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    if (!resetUserPassword) {
      console.error('❌ وظيفة resetUserPassword غير متوفرة');
      toast.error('خطأ: وظيفة إعادة تعيين كلمة المرور غير متوفرة');
      return;
    }

    try {
      console.log('📝 إرسال طلب إعادة تعيين كلمة المرور:', {
        userId: user.id,
        passwordLength: newPassword.length
      });
      
      const result = await resetUserPassword(user.id, newPassword);
      console.log('📋 نتيجة إعادة تعيين كلمة المرور:', result);
      
      if (result.success) {
        setShowPasswordDialog(false);
        setNewPassword('');
        onUpdate();
        console.log('✅ تم إعادة تعيين كلمة المرور بنجاح');
      } else {
        console.error('❌ فشل إعادة تعيين كلمة المرور:', result.error);
        toast.error(result.error || 'فشل في إعادة تعيين كلمة المرور');
      }
    } catch (error) {
      console.error('💥 خطأ في إعادة تعيين كلمة المرور:', error);
      toast.error('حدث خطأ أثناء إعادة تعيين كلمة المرور');
    }
  };

  const handleToggleActive = async () => {
    console.log('🔄 بدء عملية تبديل حالة التفعيل للمستخدم:', user.email, 'من', user.is_active, 'إلى', !user.is_active);
    
    if (!updateUserProfile) {
      console.error('❌ وظيفة updateUserProfile غير متوفرة');
      toast.error('خطأ: وظيفة تحديث المستخدم غير متوفرة');
      return;
    }

    try {
      console.log('📝 إرسال طلب تحديث حالة التفعيل:', {
        userId: user.id,
        newActiveState: !user.is_active
      });
      
      const result = await updateUserProfile(user.id, {
        is_active: !user.is_active
      });
      console.log('📋 نتيجة تحديث حالة التفعيل:', result);
      
      if (result.success) {
        onUpdate();
        console.log('✅ تم تحديث حالة التفعيل بنجاح');
        toast.success(`تم ${!user.is_active ? 'تفعيل' : 'تعطيل'} المستخدم بنجاح`);
      } else {
        console.error('❌ فشل تحديث حالة التفعيل:', result.error);
        toast.error(result.error || 'فشل في تحديث حالة المستخدم');
      }
    } catch (error) {
      console.error('💥 خطأ في تحديث حالة التفعيل:', error);
      toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  const handleUpdateProfile = async () => {
    console.log('📝 بدء عملية تحديث ملف المستخدم:', user.email, editForm);
    
    if (!updateUserProfile) {
      console.error('❌ وظيفة updateUserProfile غير متوفرة');
      toast.error('خطأ: وظيفة تحديث المستخدم غير متوفرة');
      return;
    }

    try {
      console.log('📝 إرسال طلب تحديث ملف المستخدم:', {
        userId: user.id,
        updates: editForm
      });
      
      const result = await updateUserProfile(user.id, editForm);
      console.log('📋 نتيجة تحديث ملف المستخدم:', result);
      
      if (result.success) {
        setShowEditDialog(false);
        onUpdate();
        console.log('✅ تم تحديث ملف المستخدم بنجاح');
      } else {
        console.error('❌ فشل تحديث ملف المستخدم:', result.error);
        toast.error(result.error || 'فشل في تحديث ملف المستخدم');
      }
    } catch (error) {
      console.error('💥 خطأ في تحديث ملف المستخدم:', error);
      toast.error('حدث خطأ أثناء تحديث ملف المستخدم');
    }
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    console.log('🖱️ تم النقر على زر القائمة المنسدلة للمستخدم:', user.email);
    console.log('🔍 تفاصيل الحدث:', {
      type: e.type,
      target: e.target,
      currentTarget: e.currentTarget,
      button: e.button,
      buttons: e.buttons
    });
    e.stopPropagation();
  };

  const handleDropdownItemClick = (action: string, e: React.MouseEvent) => {
    console.log('🎯 تم النقر على عنصر في القائمة المنسدلة:', action, 'للمستخدم:', user.email);
    e.stopPropagation();
    e.preventDefault();
    
    switch (action) {
      case 'login':
        console.log('🔐 فتح نافذة تسجيل الدخول');
        setShowLoginDialog(true);
        break;
      case 'edit':
        console.log('📝 فتح نافذة التعديل');
        setShowEditDialog(true);
        break;
      case 'password':
        console.log('🔑 فتح نافذة إعادة تعيين كلمة المرور');
        setShowPasswordDialog(true);
        break;
      case 'toggle-active':
        console.log('⚡ تنفيذ تبديل حالة التفعيل');
        handleToggleActive();
        break;
      default:
        console.warn('❓ إجراء غير معروف:', action);
    }
  };

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            onClick={handleDropdownClick}
            className="data-[state=open]:bg-muted h-8 w-8 p-0"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={(e) => handleDropdownItemClick('login', e)}
          >
            <LogIn className="h-4 w-4 mr-2" />
            تسجيل دخول كمستخدم
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={(e) => handleDropdownItemClick('edit', e)}
          >
            <Edit className="h-4 w-4 mr-2" />
            تعديل البيانات
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={(e) => handleDropdownItemClick('password', e)}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            إعادة تعيين كلمة المرور
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={(e) => handleDropdownItemClick('toggle-active', e)}
            className={user.is_active ? "text-red-600" : "text-green-600"}
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

      {/* Login As User Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              تسجيل دخول كـ {user.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>تحذير:</strong> ستقوم بتسجيل الدخول كهذا المستخدم وسيتم تسجيل هذه العملية في سجل النظام.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">سبب تسجيل الدخول (اختياري)</Label>
              <Textarea
                id="reason"
                value={loginReason}
                onChange={(e) => setLoginReason(e.target.value)}
                placeholder="مثال: مساعدة المستخدم في حل مشكلة تقنية"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleLoginAsUser} disabled={isLoading}>
                {isLoading ? 'جاري التحميل...' : 'تسجيل الدخول'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              إعادة تعيين كلمة المرور لـ <strong>{user.full_name}</strong>
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleResetPassword} disabled={isLoading}>
                {isLoading ? 'جاري التحميل...' : 'إعادة تعيين'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              تعديل بيانات المستخدم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEmail">البريد الإلكتروني</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editFullName">الاسم الكامل</Label>
              <Input
                id="editFullName"
                value={editForm.full_name}
                onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editDepartment">القسم</Label>
              <Input
                id="editDepartment"
                value={editForm.department}
                onChange={(e) => setEditForm({...editForm, department: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editPhone">رقم الهاتف</Label>
              <Input
                id="editPhone"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleUpdateProfile} disabled={isLoading}>
                {isLoading ? 'جاري التحميل...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserActionButtons;
