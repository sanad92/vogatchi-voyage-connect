
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogIn } from "lucide-react";
import { User } from "@/types/userManagement";

interface LoginAsUserDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
}

const LoginAsUserDialog = ({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading, 
  reason, 
  onReasonChange 
}: LoginAsUserDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="مثال: مساعدة المستخدم في حل مشكلة تقنية"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button onClick={() => onConfirm(reason)} disabled={isLoading}>
              {isLoading ? 'جاري التحميل...' : 'تسجيل الدخول'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginAsUserDialog;
