
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle } from "lucide-react";
import { User, UserRole } from "@/types/userManagement";

interface UserTableProps {
  users: User[];
}

const UserTable = ({ users }: UserTableProps) => {
  const queryClient = useQueryClient();

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة المستخدم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث دور المستخدم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-orange-100 text-orange-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'sales_agent': return 'bg-green-100 text-green-800';
      case 'accountant': return 'bg-purple-100 text-purple-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'أدمن';
      case 'manager': return 'مدير';
      case 'sales_agent': return 'مندوب مبيعات';
      case 'accountant': return 'محاسب';
      case 'viewer': return 'مشاهد';
      default: return 'بدون دور';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>المستخدم</TableHead>
          <TableHead>القسم</TableHead>
          <TableHead>الدور</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead>تاريخ الإنشاء</TableHead>
          <TableHead>الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div>
                <div className="font-medium">{user.full_name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
                {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
              </div>
            </TableCell>
            <TableCell>{user.department || '-'}</TableCell>
            <TableCell>
              <Select
                value={user.role}
                onValueChange={(value: UserRole) => updateUserRoleMutation.mutate({ userId: user.id, role: value })}
              >
                <SelectTrigger className="w-auto">
                  <Badge className={getRoleBadgeColor(user.role || 'no_role')}>
                    {getRoleLabel(user.role || 'no_role')}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">أدمن</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="sales_agent">مندوب مبيعات</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                  <SelectItem value="viewer">مشاهد</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {user.is_active ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={user.is_active ? "text-green-600" : "text-red-600"}>
                  {user.is_active ? "نشط" : "معطل"}
                </span>
              </div>
            </TableCell>
            <TableCell>
              {new Date(user.created_at).toLocaleDateString('ar-EG')}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant={user.is_active ? "destructive" : "default"}
                onClick={() => toggleUserStatusMutation.mutate({ 
                  userId: user.id, 
                  isActive: !user.is_active 
                })}
              >
                {user.is_active ? "تعطيل" : "تفعيل"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UserTable;
