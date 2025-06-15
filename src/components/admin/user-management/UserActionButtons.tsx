
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

  console.log('🎛️ UserActionButtons rendered for user:', user.email, 'Loading:', isLoading);

  const handleLoginAsUser = async () => {
    console.log('🔐 بدء تسجيل دخول كمستخدم:', user.email);
    try {
      const result = await loginAsUser(user.id, loginReason);
      if (result.success) {
        setShowLoginDialog(false);
        setLoginReason('');
        console.log('✅ تم تسجيل الدخول بنجاح');
      } else {
        console.error('❌ فشل تسجيل الدخول:', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    console.log('🔑 بدء إعادة تعيين كلمة مرور المستخدم:', user.email);
    try {
      const result = await resetUserPassword(user.id, newPassword);
      if (result.success) {
        setShowPasswordDialog(false);
        setNewPassword('');
        onUpdate();
        console.log('✅ تم إعادة تعيين كلمة المرور بنجاح');
      } else {
        console.error('❌ فشل إعادة تعيين كلمة المرور:', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
      toast.error('حدث خطأ أثناء إعادة تعيين كلمة المرور');
    }
  };

  const handleToggleActive = async () => {
    console.log('⚡ تبديل حالة تفعيل المستخدم:', user.email, 'من', user.is_active, 'إلى', !user.is_active);
    try {
      const result = await updateUserProfile(user.id, {
        is_active: !user.is_active
      });
      if (result.success) {
        onUpdate();
        console.log('✅ تم تحديث حالة التفعيل بنجاح');
      } else {
        console.error('❌ فشل تحديث حالة التفعيل:', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة التفعيل:', error);
      toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  const handleUpdateProfile = async () => {
    console.log('📝 بدء تحديث ملف المستخدم:', user.email, editForm);
    try {
      const result = await updateUserProfile(user.id, editForm);
      if (result.success) {
        setShowEditDialog(false);
        onUpdate();
        console.log('✅ تم تحديث ملف المستخدم بنجاح');
      } else {
        console.error('❌ فشل تحديث ملف المستخدم:', result.error);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث ملف المستخدم:', error);
      toast.error('حدث خطأ أثناء تحديث ملف المستخدم');
    }
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    console.log('🖱️ تم النقر على القائمة المنسدلة للمستخدم:', user.email);
    e.stopPropagation();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            onClick={handleDropdownClick}
            className="data-[state=open]:bg-muted"
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
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔐 تم اختيار تسجيل دخول كمستخدم');
              setShowLoginDialog(true);
            }}
          >
            <LogIn className="h-4 w-4 mr-2" />
            تسجيل دخول كمستخدم
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              console.log('📝 تم اختيار تعديل البيانات');
              setShowEditDialog(true);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            تعديل البيانات
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔑 تم اختيار إعادة تعيين كلمة المرور');
              setShowPasswordDialog(true);
            }}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            إعادة تعيين كلمة المرور
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              console.log('⚡ تم اختيار تبديل حالة التفعيل');
              handleToggleActive();
            }}
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
    </>
  );
};

export default UserActionButtons;
