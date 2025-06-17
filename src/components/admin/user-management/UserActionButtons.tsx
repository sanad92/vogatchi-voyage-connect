
import React, { useState } from "react";
import { useSuperAdminActions } from "@/hooks/useSuperAdminActions";
import { User } from "@/types/userManagement";
import { toast } from "sonner";
import UserActionDropdown from "./UserActionDropdown";
import LoginAsUserDialog from "./LoginAsUserDialog";
import ResetPasswordDialog from "./ResetPasswordDialog";
import EditUserDialog, { EditFormData } from "./EditUserDialog";

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
  const [editForm, setEditForm] = useState<EditFormData>({
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

  return (
    <div className="flex items-center gap-2">
      <UserActionDropdown
        user={user}
        isLoading={isLoading}
        onLoginClick={() => setShowLoginDialog(true)}
        onEditClick={() => setShowEditDialog(true)}
        onPasswordClick={() => setShowPasswordDialog(true)}
        onToggleActive={handleToggleActive}
      />

      <LoginAsUserDialog
        user={user}
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onConfirm={handleLoginAsUser}
        isLoading={isLoading}
        reason={loginReason}
        onReasonChange={setLoginReason}
      />

      <ResetPasswordDialog
        user={user}
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={handleResetPassword}
        isLoading={isLoading}
        newPassword={newPassword}
        onPasswordChange={setNewPassword}
      />

      <EditUserDialog
        user={user}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onConfirm={handleUpdateProfile}
        isLoading={isLoading}
        formData={editForm}
        onFormChange={setEditForm}
      />
    </div>
  );
};

export default UserActionButtons;
