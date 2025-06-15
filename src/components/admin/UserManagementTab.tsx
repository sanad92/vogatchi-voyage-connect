
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, UserCheck, UserX, Shield, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserSearch from "./user-management/UserSearch";
import CreateUserDialogEnhanced from "./user-management/CreateUserDialogEnhanced";
import UserTable from "./user-management/UserTable";
import UserStatsCards from "./user-management/UserStatsCards";
import { User } from "@/types/userManagement";
import { toast } from "sonner";

const UserManagementTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // جلب جميع المستخدمين مع أدوارهم
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      console.log('🔄 جاري جلب المستخدمين...');
      
      try {
        // جلب جميع الملفات الشخصية
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('❌ خطأ في جلب الملفات الشخصية:', profilesError);
          throw profilesError;
        }

        console.log('✅ تم جلب الملفات الشخصية:', profiles?.length || 0);

        // جلب جميع الأدوار
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');
        
        if (rolesError) {
          console.error('❌ خطأ في جلب الأدوار:', rolesError);
          throw rolesError;
        }

        console.log('✅ تم جلب الأدوار:', userRoles?.length || 0);

        // دمج البيانات
        const usersWithRoles = profiles?.map(profile => {
          const userRole = userRoles?.find(role => role.user_id === profile.id);
          return {
            ...profile,
            role: userRole?.role || 'no_role'
          };
        }) || [];

        console.log('✅ المستخدمون النهائيون:', usersWithRoles.length);
        console.log('📊 تفاصيل المستخدمين:', usersWithRoles);
        
        return usersWithRoles as User[];
      } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        toast.error('حدث خطأ في جلب بيانات المستخدمين');
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // فلترة المستخدمين
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  console.log('📈 إحصائيات المستخدمين:', userStats);

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

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-gray-600 mb-4">حدث خطأ أثناء جلب بيانات المستخدمين</p>
          <Button onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
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
            <option value="all">جميع الأدوار ({users?.length || 0})</option>
            <option value="super_admin">سوبر أدمن</option>
            <option value="admin">أدمن</option>
            <option value="manager">مدير</option>
            <option value="sales_agent">مندوب مبيعات</option>
            <option value="accountant">محاسب</option>
            <option value="viewer">مشاهد</option>
            <option value="no_role">بدون دور ({userStats.noRole})</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إنشاء مستخدم جديد
              </Button>
            </DialogTrigger>
            <CreateUserDialogEnhanced 
              isOpen={isCreateDialogOpen} 
              onOpenChange={setIsCreateDialogOpen}
              onSuccess={() => {
                refetch();
                toast.success('تم إنشاء المستخدم بنجاح');
              }}
            />
          </Dialog>
        </div>
      </div>

      {/* معلومات التصحيح */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>
              [تصحيح] إجمالي البيانات المجلبة: {users?.length || 0} | 
              مفلترة: {filteredUsers.length} | 
              نشطة: {userStats.active} | 
              معطلة: {userStats.inactive} | 
              بدون أدوار: {userStats.noRole}
            </span>
          </div>
        </div>
      )}

      {/* جدول المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              إدارة المستخدمين ({filteredUsers.length} من {users?.length || 0})
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span>{userStats.active} نشط</span>
              </div>
              <div className="flex items-center gap-1">
                <UserX className="h-4 w-4 text-red-600" />
                <span>{userStats.inactive} معطل</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-orange-600" />
                <span>{userStats.noRole} بدون دور</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {users?.length === 0 ? 'لا يوجد مستخدمين' : 'لا توجد نتائج'}
              </h3>
              <p className="text-gray-600">
                {users?.length === 0 
                  ? 'لم يتم إنشاء أي مستخدمين بعد'
                  : 'لم يتم العثور على مستخدمين يطابقون البحث الحالي'
                }
              </p>
              {users?.length === 0 && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-4"
                >
                  إنشاء أول مستخدم
                </Button>
              )}
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
