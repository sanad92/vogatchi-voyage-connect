
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useSuperAdminActions } from "@/hooks/useSuperAdminActions";

interface CreateUserDialogEnhancedProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateUserDialogEnhanced = ({ isOpen, onOpenChange, onSuccess }: CreateUserDialogEnhancedProps) => {
  const { createUser, isLoading } = useSuperAdminActions();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    department: '',
    phone: '',
    role: 'viewer'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.full_name) {
      return;
    }

    const result = await createUser(formData);
    if (result.success) {
      setFormData({
        email: '',
        password: '',
        full_name: '',
        department: '',
        phone: '',
        role: 'viewer'
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({...formData, password});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            إنشاء مستخدم جديد (محسن)
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                placeholder="user@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
                placeholder="الاسم الكامل"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور *</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                placeholder="كلمة المرور"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={generatePassword}
                size="sm"
              >
                توليد
              </Button>
            </div>
            {formData.password && (
              <p className="text-xs text-gray-600">
                كلمة المرور: <code className="bg-gray-100 px-1 rounded">{formData.password}</code>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">القسم</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الحجوزات">الحجوزات</SelectItem>
                  <SelectItem value="المبيعات">المبيعات</SelectItem>
                  <SelectItem value="خدمة العملاء">خدمة العملاء</SelectItem>
                  <SelectItem value="المحاسبة">المحاسبة</SelectItem>
                  <SelectItem value="الإدارة">الإدارة</SelectItem>
                  <SelectItem value="تقنية المعلومات">تقنية المعلومات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+966xxxxxxxxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">الدور *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">سوبر أدمن</SelectItem>
                <SelectItem value="admin">أدمن</SelectItem>
                <SelectItem value="manager">مدير</SelectItem>
                <SelectItem value="sales_agent">مندوب مبيعات</SelectItem>
                <SelectItem value="accountant">محاسب</SelectItem>
                <SelectItem value="viewer">مشاهد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ملاحظة:</strong> سيتم إنشاء المستخدم مباشرة وتفعيل حسابه. تأكد من إرسال كلمة المرور للمستخدم بطريقة آمنة.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialogEnhanced;
