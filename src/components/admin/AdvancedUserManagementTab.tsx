
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
import { toast } from "@/components/ui/use-toast";
import { useSuperAdminActions } from "@/hooks/useSuperAdminActions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { 
  Users, UserPlus, Eye, Settings, Calendar, Activity, Lock, Unlock
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  department?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  role?: string;
}

const AdvancedUserManagementTab = () => {
  const queryClient = useQueryClient();
  const { loginAsUser, resetUserPassword, createUser, updateUserProfile } = useSuperAdminActions();
  const { organizationId } = useOrganization();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
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

  // Fetch users with roles from organization_members
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['advanced-users', userFilter, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      let profilesQuery = supabase.from('profiles').select('*');
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

      // Get roles from organization_members
      const userIds = profilesData.map(p => p.id);
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('user_id', userIds);

      const usersWithRoles = profilesData.map(profile => {
        const member = membersData?.find(m => m.user_id === profile.id);
        return {
          ...profile,
          role: member?.role || 'no_role'
        } as UserProfile;
      });
      
      return usersWithRoles;
    },
    enabled: !!organizationId,
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const result = await createUser(userData);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced-users'] });
      setIsCreateUserOpen(false);
      setNewUser({ email: '', password: '', full_name: '', department: '', phone: '', role: 'viewer' });
      toast({ title: "تم إنشاء المستخدم", description: "تم إنشاء المستخدم الجديد بنجاح" });
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string, isActive: boolean }) => {
      const result = await updateUserProfile(userId, { is_active: isActive });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced-users'] });
      toast({ title: "تم التحديث", description: "تم تحديث حالة المستخدم بنجاح" });
    }
  });

  const getRoleBadge = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'مالك', admin: 'أدمن', manager: 'مدير', agent: 'وكيل', viewer: 'مشاهد'
    };
    return <Badge variant="outline">{labels[role] || role}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
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
              <Label>البحث</Label>
              <Input placeholder="البحث بالاسم أو البريد" value={userFilter.search}
                onChange={(e) => setUserFilter(prev => ({ ...prev, search: e.target.value }))} />
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={userFilter.status} onValueChange={(v) => setUserFilter(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">معطل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الدور</Label>
              <Select value={userFilter.role} onValueChange={(v) => setUserFilter(prev => ({ ...prev, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="owner">مالك</SelectItem>
                  <SelectItem value="admin">أدمن</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="agent">وكيل</SelectItem>
                  <SelectItem value="viewer">مشاهد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة المستخدمين</h2>
        <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إنشاء مستخدم جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>البريد الإلكتروني</Label><Input type="email" value={newUser.email}
                onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>كلمة المرور</Label><Input type="password" value={newUser.password}
                onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} /></div>
              <div><Label>الاسم الكامل</Label><Input value={newUser.full_name}
                onChange={(e) => setNewUser(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div><Label>القسم</Label><Input value={newUser.department}
                onChange={(e) => setNewUser(p => ({ ...p, department: e.target.value }))} /></div>
              <div>
                <Label>الدور</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">أدمن</SelectItem>
                    <SelectItem value="manager">مدير</SelectItem>
                    <SelectItem value="agent">وكيل</SelectItem>
                    <SelectItem value="viewer">مشاهد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createUserMutation.mutate(newUser)}
                disabled={createUserMutation.isPending || !newUser.email || !newUser.password || !newUser.full_name}
                className="w-full">إنشاء المستخدم</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users list */}
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
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {user.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                      {user.role && getRoleBadge(user.role)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => loginAsUser(user.id, 'إدارة')}>
                        <Eye className="h-4 w-4" /> دخول كمستخدم
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => toggleUserStatusMutation.mutate({ userId: user.id, isActive: !user.is_active })}
                        disabled={toggleUserStatusMutation.isPending}>
                        {user.is_active ? <><Lock className="h-4 w-4" /> تعطيل</> : <><Unlock className="h-4 w-4" /> تفعيل</>}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">القسم:</span> {user.department || '-'}</div>
                    <div><span className="text-muted-foreground">الهاتف:</span> {user.phone || '-'}</div>
                    <div><span className="text-muted-foreground">تاريخ الانضمام:</span> {new Date(user.created_at).toLocaleDateString('ar-SA')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedUserManagementTab;
