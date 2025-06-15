
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useSuperAdminActions } from "@/hooks/useSuperAdminActions";
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Shield, 
  Eye, 
  Settings,
  Calendar,
  Activity,
  Lock,
  Unlock
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  department?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
}

interface UserSession {
  user_id: string;
  session_count: number;
  last_activity: string;
  total_login_time: number;
}

const AdvancedUserManagementTab = () => {
  const queryClient = useQueryClient();
  const { loginAsUser, resetUserPassword, createUser, updateUserProfile } = useSuperAdminActions();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [userFilter, setUserFilter] = useState({
    status: 'all',
    role: 'all',
    department: 'all',
    search: ''
  });

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    department: '',
    phone: '',
    role: 'viewer'
  });

  // جلب قائمة المستخدمين مع التفاصيل
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['advanced-users', userFilter],
    queryFn: async () => {
      let profilesQuery = supabase
        .from('profiles')
        .select('*');

      // تطبيق الفلاتر
      if (userFilter.status !== 'all') {
        profilesQuery = profilesQuery.eq('is_active', userFilter.status === 'active');
      }

      if (userFilter.department !== 'all') {
        profilesQuery = profilesQuery.eq('department', userFilter.department);
      }

      if (userFilter.search) {
        profilesQuery = profilesQuery.or(`full_name.ilike.%${userFilter.search}%,email.ilike.%${userFilter.search}%`);
      }

      const { data: profilesData, error: profilesError } = await profilesQuery.order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      // جلب أدوار المستخدمين بشكل منفصل
      const userIds = profilesData.map(profile => profile.id);
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // دمج البيانات
      const usersWithRoles = profilesData.map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'no_role'
        } as UserProfile;
      });
      
      return usersWithRoles;
    }
  });

  // جلب إحصائيات جلسات المستخدمين (محاكاة البيانات)
  const { data: userSessions } = useQuery({
    queryKey: ['user-sessions'],
    queryFn: async () => {
      // محاكاة بيانات الجلسات
      const sessions: UserSession[] = [];
      if (users) {
        users.forEach(user => {
          sessions.push({
            user_id: user.id,
            session_count: Math.floor(Math.random() * 5) + 1,
            last_activity: new Date().toISOString(),
            total_login_time: Math.floor(Math.random() * 480) + 60
          });
        });
      }
      return sessions;
    },
    enabled: !!users
  });

  // إنشاء مستخدم جديد
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const result = await createUser(userData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced-users'] });
      setIsCreateUserOpen(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        department: '',
        phone: '',
        role: 'viewer'
      });
      toast({
        title: "تم إنشاء المستخدم",
        description: "تم إنشاء المستخدم الجديد بنجاح",
      });
    }
  });

  // تعديل حالة المستخدم
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string, isActive: boolean }) => {
      const result = await updateUserProfile(userId, { is_active: isActive });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced-users'] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة المستخدم بنجاح",
      });
    }
  });

  const getDepartments = () => {
    if (!users) return [];
    const departments = [...new Set(users.map(user => user.department).filter(Boolean))];
    return departments;
  };

  const getRoles = () => {
    if (!users) return [];
    const roles = [...new Set(users.map(user => user.role).filter(Boolean))];
    return roles;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">نشط</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">معطل</Badge>
    );
  };

  const getUserSession = (userId: string) => {
    return userSessions?.find(session => session.user_id === userId);
  };

  return (
    <div className="space-y-6">
      {/* فلاتر البحث */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            فلاتر البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">البحث</Label>
              <Input
                id="search"
                placeholder="البحث بالاسم أو البريد الإلكتروني"
                value={userFilter.search}
                onChange={(e) => setUserFilter(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="status">الحالة</Label>
              <Select value={userFilter.status} onValueChange={(value) => setUserFilter(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">معطل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="role">الدور</Label>
              <Select value={userFilter.role} onValueChange={(value) => setUserFilter(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأدوار</SelectItem>
                  {getRoles().map(role => (
                    <SelectItem key={role} value={role!}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">القسم</Label>
              <Select value={userFilter.department} onValueChange={(value) => setUserFilter(prev => ({ ...prev, department: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {getDepartments().map(dept => (
                    <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* شريط الإجراءات */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة المستخدمين المتقدمة</h2>
        <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="full_name">الاسم الكامل</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="department">القسم</Label>
                <Input
                  id="department"
                  value={newUser.department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="role">الدور</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
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
                onClick={() => createUserMutation.mutate(newUser)}
                disabled={createUserMutation.isPending || !newUser.email || !newUser.password || !newUser.full_name}
                className="w-full"
              >
                إنشاء المستخدم
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* قائمة المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            قائمة المستخدمين ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">جاري تحميل المستخدمين...</div>
          ) : users && users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user) => {
                const session = getUserSession(user.id);
                return (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-medium">{user.full_name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        {getStatusBadge(user.is_active)}
                        {user.role && (
                          <Badge variant="outline">{user.role}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loginAsUser(user.id, 'إدارة متقدمة')}
                        >
                          <Eye className="h-4 w-4" />
                          دخول كمستخدم
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserStatusMutation.mutate({ 
                            userId: user.id, 
                            isActive: !user.is_active 
                          })}
                          disabled={toggleUserStatusMutation.isPending}
                        >
                          {user.is_active ? (
                            <>
                              <Lock className="h-4 w-4" />
                              تعطيل
                            </>
                          ) : (
                            <>
                              <Unlock className="h-4 w-4" />
                              تفعيل
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">القسم:</span>
                        <div>{user.department || '-'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">الهاتف:</span>
                        <div>{user.phone || '-'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">تاريخ الانضمام:</span>
                        <div>{new Date(user.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">آخر تسجيل دخول:</span>
                        <div>
                          {session ? new Date(session.last_activity).toLocaleDateString('ar-SA') : 'لم يسجل دخول'}
                        </div>
                      </div>
                    </div>
                    
                    {session && (
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {session.session_count} جلسة نشطة
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          آخر نشاط: {new Date(session.last_activity).toLocaleString('ar-SA')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-600">لم يتم العثور على مستخدمين مطابقين للفلاتر المحددة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedUserManagementTab;
