
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

  

  // التحقق من توفر الوظائف
  

  const handleLoginAsUser = async () => {
    
    
    if (!loginAsUser) {
      console.error('❌ وظيفة loginAsUser غير متوفرة');
      toast.error('خطأ: وظيفة تسجيل الدخول غير متوفرة');
      return;
    }

    try {
      
      
      const result = await loginAsUser(user.id, loginReason);
      
      
      if (result.success) {
        setShowLoginDialog(false);
        setLoginReason('');
        
      } else {
        console.error('❌ فشل تسجيل الدخول:');
        toast.error(result.error || 'فشل في تسجيل الدخول');
      }
    } catch (error) {
      console.error('💥 خطأ في تسجيل الدخول:');
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    }
  };

  const handleResetPassword = async () => {
    
    
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
      
      
      const result = await resetUserPassword(user.id, newPassword);
      
      
      if (result.success) {
        setShowPasswordDialog(false);
        setNewPassword('');
        onUpdate();
        
      } else {
        console.error('❌ فشل إعادة تعيين كلمة المرور:');
        toast.error(result.error || 'فشل في إعادة تعيين كلمة المرور');
      }
    } catch (error) {
      console.error('💥 خطأ في إعادة تعيين كلمة المرور:');
      toast.error('حدث خطأ أثناء إعادة تعيين كلمة المرور');
    }
  };

  const handleToggleActive = async () => {
    
    
    if (!updateUserProfile) {
      console.error('❌ وظيفة updateUserProfile غير متوفرة');
      toast.error('خطأ: وظيفة تحديث المستخدم غير متوفرة');
      return;
    }

    try {
      
      
      const result = await updateUserProfile(user.id, {
        is_active: !user.is_active
      });
      
      
      if (result.success) {
        onUpdate();
        
        toast.success(`تم ${!user.is_active ? 'تفعيل' : 'تعطيل'} المستخدم بنجاح`);
      } else {
        console.error('❌ فشل تحديث حالة التفعيل:');
        toast.error(result.error || 'فشل في تحديث حالة المستخدم');
      }
    } catch (error) {
      console.error('💥 خطأ في تحديث حالة التفعيل:');
      toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  const handleUpdateProfile = async () => {
    
    
    if (!updateUserProfile) {
      console.error('❌ وظيفة updateUserProfile غير متوفرة');
      toast.error('خطأ: وظيفة تحديث المستخدم غير متوفرة');
      return;
    }

    try {
      
      
      const result = await updateUserProfile(user.id, editForm);
      
      
      if (result.success) {
        setShowEditDialog(false);
        onUpdate();
        
      } else {
        console.error('❌ فشل تحديث ملف المستخدم:');
        toast.error(result.error || 'فشل في تحديث ملف المستخدم');
      }
    } catch (error) {
      console.error('💥 خطأ في تحديث ملف المستخدم:');
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
