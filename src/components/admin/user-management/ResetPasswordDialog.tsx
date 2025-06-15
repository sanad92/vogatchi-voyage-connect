
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { User } from "@/types/userManagement";

interface ResetPasswordDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isLoading: boolean;
  newPassword: string;
  onPasswordChange: (password: string) => void;
}

const ResetPasswordDialog = ({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading, 
  newPassword, 
  onPasswordChange 
}: ResetPasswordDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="أدخل كلمة المرور الجديدة"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button onClick={() => onConfirm(newPassword)} disabled={isLoading}>
              {isLoading ? 'جاري التحميل...' : 'إعادة تعيين'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
