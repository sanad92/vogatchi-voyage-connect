
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, Edit3, Trash2, Shield, Eye } from "lucide-react";
import { User, UserRole } from "@/types/userManagement";

interface UserTableProps {
  users: User[];
  onUpdate: () => void;
}

// Valid database roles (excluding no_role)
type DatabaseUserRole = Exclude<UserRole, "no_role">;

const UserTable = ({ users, onUpdate }: UserTableProps) => {
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
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: DatabaseUserRole }) => {
      // حذف الدور القديم إن وجد
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // إضافة الدور الجديد
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
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // حذف المستخدم من auth.users (سيحذف تلقائياً من profiles و user_roles)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم بنجاح",
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'admin': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales_agent': return 'bg-green-100 text-green-800 border-green-200';
      case 'accountant': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'no_role': 
      default: return 'bg-red-50 text-red-600 border-red-200';
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
      case 'no_role':
      default: return 'بدون دور';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="h-3 w-3" />;
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'manager': return <Edit3 className="h-3 w-3" />;
      case 'viewer': return <Eye className="h-3 w-3" />;
      default: return null;
    }
  };

  const handleRoleChange = (userId: string, newRole: string, currentRole: string | undefined) => {
    // Don't allow changing to no_role, and only update if it's a valid database role and different
    if (newRole !== 'no_role' && newRole !== currentRole) {
      updateUserRoleMutation.mutate({ userId, role: newRole as DatabaseUserRole });
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المستخدم</TableHead>
            <TableHead>القسم</TableHead>
            <TableHead>الدور</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>تاريخ الإنشاء</TableHead>
            <TableHead className="text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  {user.phone && (
                    <div className="text-sm text-gray-500">{user.phone}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{user.department || '-'}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Select
                    value={user.role || 'no_role'}
                    onValueChange={(value: string) => handleRoleChange(user.id, value, user.role)}
                    disabled={updateUserRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-auto border-0 p-0 h-auto">
                      <Badge 
                        className={`${getRoleBadgeColor(user.role || 'no_role')} flex items-center gap-1`}
                        variant="outline"
                      >
                        {getRoleIcon(user.role || 'no_role')}
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
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {user.is_active ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${user.is_active ? "text-green-600" : "text-red-600"}`}>
                    {user.is_active ? "نشط" : "معطل"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString('ar-EG')}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 justify-center">
                  <Button
                    size="sm"
                    variant={user.is_active ? "destructive" : "default"}
                    onClick={() => toggleUserStatusMutation.mutate({ 
                      userId: user.id, 
                      isActive: !user.is_active 
                    })}
                    disabled={toggleUserStatusMutation.isPending}
                    className="h-8 px-3"
                  >
                    {user.is_active ? "تعطيل" : "تفعيل"}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 px-3"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف المستخدم "{user.full_name}"؟
                          هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بيانات المستخدم.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
