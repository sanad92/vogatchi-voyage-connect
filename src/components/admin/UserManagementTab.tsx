
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, UserCheck, UserX, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserSearch from "./user-management/UserSearch";
import CreateUserDialog from "./user-management/CreateUserDialog";
import UserTable from "./user-management/UserTable";
import UserStatsCards from "./user-management/UserStatsCards";
import { User } from "@/types/userManagement";

const UserManagementTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // جلب جميع المستخدمين مع أدوارهم
  const { data: users, isLoading, refetch } = useQuery({
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
        role: (user.user_roles as any)?.[0]?.role || 'no_role'
      })) as User[];
    }
  });

  // فلترة المستخدمين
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || (user.role || 'no_role') === selectedRole;
    
    return matchesSearch && matchesRole;
  }) || [];

  // احصائيات المستخدمين
  const userStats = {
    total: users?.length || 0,
    active: users?.filter(u => u.is_active).length || 0,
    inactive: users?.filter(u => !u.is_active).length || 0,
    noRole: users?.filter(u => !u.role || u.role === 'no_role').length || 0
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المستخدمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* احصائيات المستخدمين */}
      <UserStatsCards stats={userStats} />

      {/* شريط البحث والإجراءات */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <UserSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          
          {/* فلتر حسب الدور */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الأدوار</option>
            <option value="super_admin">سوبر أدمن</option>
            <option value="admin">أدمن</option>
            <option value="manager">مدير</option>
            <option value="sales_agent">مندوب مبيعات</option>
            <option value="accountant">محاسب</option>
            <option value="viewer">مشاهد</option>
            <option value="no_role">بدون دور</option>
          </select>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                إضافة مستخدم جديد
              </DialogTitle>
            </DialogHeader>
            <CreateUserDialog 
              isOpen={isCreateDialogOpen} 
              onOpenChange={setIsCreateDialogOpen}
              onSuccess={() => {
                refetch();
                setIsCreateDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* جدول المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              قائمة المستخدمين ({filteredUsers.length} من {users?.length || 0})
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span>{userStats.active} نشط</span>
              <UserX className="h-4 w-4 text-red-600" />
              <span>{userStats.inactive} معطل</span>
              <Shield className="h-4 w-4 text-orange-600" />
              <span>{userStats.noRole} بدون دور</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد مستخدمين</h3>
              <p className="text-gray-600">لم يتم العثور على مستخدمين يطابقون البحث الحالي</p>
            </div>
          ) : (
            <UserTable users={filteredUsers} onUpdate={() => refetch()} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementTab;
