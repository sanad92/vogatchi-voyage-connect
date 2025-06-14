
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { UserPlus, Edit, Trash2, CheckCircle, XCircle, Search } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  department: string;
  is_active: boolean;
  created_at: string;
  role?: string;
}

const UserManagementTab = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    phone: "",
    department: "",
    role: "viewer"
  });

  // جلب جميع المستخدمين مع أدوارهم
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `);
      
      if (error) throw error;
      
      return data.map(user => ({
        ...user,
        role: user.user_roles?.[0]?.role || 'no_role'
      })) as User[];
    }
  });

  // إنشاء طلب مستخدم جديد
  const createUserRequestMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
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
      setIsCreateDialogOpen(false);
      setNewUser({ email: "", full_name: "", phone: "", department: "", role: "viewer" });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });

  // تفعيل/إلغاء تفعيل مستخدم
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

  // تحديث دور المستخدم
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // حذف الدور الحالي
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
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });

  const filteredUsers = users?.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل المستخدمين...</div>;
  }

  return (
    <div className="space-y-6">
      {/* شريط البحث والإجراءات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
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
      </div>

      {/* جدول المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
              {filteredUsers.map((user) => (
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
                      onValueChange={(value) => updateUserRoleMutation.mutate({ userId: user.id, role: value })}
                    >
                      <SelectTrigger className="w-auto">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {getRoleLabel(user.role)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementTab;
