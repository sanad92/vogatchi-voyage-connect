
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { UserPlus } from "lucide-react";
import { NewUser, UserRole } from "@/types/userManagement";

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateUserDialog = ({ isOpen, onOpenChange }: CreateUserDialogProps) => {
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = useState<NewUser>({
    email: "",
    full_name: "",
    phone: "",
    department: "",
    role: "viewer"
  });

  const createUserRequestMutation = useMutation({
    mutationFn: async (userData: NewUser) => {
      const { error } = await supabase
        .from('user_creation_requests')
        .insert({
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone,
          department: userData.department,
          requested_role: userData.role,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال الطلب",
        description: "تم إنشاء طلب المستخدم الجديد بنجاح",
      });
      onOpenChange(false);
      setNewUser({ email: "", full_name: "", phone: "", department: "", role: "viewer" });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          مستخدم جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input
              id="full_name"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="department">القسم</Label>
            <Input
              id="department"
              value={newUser.department}
              onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="role">الدور</Label>
            <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">أدمن</SelectItem>
                <SelectItem value="manager">مدير</SelectItem>
                <SelectItem value="sales_agent">مندوب مبيعات</SelectItem>
                <SelectItem value="accountant">محاسب</SelectItem>
                <SelectItem value="viewer">مشاهد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => createUserRequestMutation.mutate(newUser)}
            disabled={createUserRequestMutation.isPending}
            className="w-full"
          >
            إنشاء طلب المستخدم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
