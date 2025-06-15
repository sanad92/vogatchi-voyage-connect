
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { User } from "@/types/userManagement";

interface EditUserDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (formData: EditFormData) => void;
  isLoading: boolean;
  formData: EditFormData;
  onFormChange: (formData: EditFormData) => void;
}

export interface EditFormData {
  email: string;
  full_name: string;
  department: string;
  phone: string;
}

const EditUserDialog = ({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading, 
  formData, 
  onFormChange 
}: EditUserDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              value={formData.email}
              onChange={(e) => onFormChange({...formData, email: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editFullName">الاسم الكامل</Label>
            <Input
              id="editFullName"
              value={formData.full_name}
              onChange={(e) => onFormChange({...formData, full_name: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editDepartment">القسم</Label>
            <Input
              id="editDepartment"
              value={formData.department}
              onChange={(e) => onFormChange({...formData, department: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editPhone">رقم الهاتف</Label>
            <Input
              id="editPhone"
              value={formData.phone}
              onChange={(e) => onFormChange({...formData, phone: e.target.value})}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button onClick={() => onConfirm(formData)} disabled={isLoading}>
              {isLoading ? 'جاري التحميل...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
