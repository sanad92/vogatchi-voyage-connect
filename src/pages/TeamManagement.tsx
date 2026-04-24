import { useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Users, Mail, Settings2 } from 'lucide-react';
import TeamMembersTable from '@/components/team/TeamMembersTable';
import AddTeamMemberWizard from '@/components/team/AddTeamMemberWizard';
import InvitationManager from '@/components/invitations/InvitationManager';
import UnifiedUserEmployeeManagement from '@/components/admin/UnifiedUserEmployeeManagement';

const TeamManagement = () => {
  const { user, hasRole } = useOptimizedAuth();
  const { isOwner } = useOrgMembers();
  const { members } = useTeamManagement();
  const [wizardOpen, setWizardOpen] = useState(false);

  const canManage = isOwner || hasRole('admin');
  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            فريق العمل
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة موحدة للأعضاء، الأدوار، الدعوات، وربط الموظفين في مكان واحد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{activeCount} / {members.length} عضو نشط</Badge>
          {canManage && (
            <Button onClick={() => setWizardOpen(true)}>
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة عضو
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 ml-1" /> الأعضاء
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Mail className="w-4 h-4 ml-1" /> الدعوات
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="advanced">
              <Settings2 className="w-4 h-4 ml-1" /> الإدارة المتقدمة
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">أعضاء المؤسسة</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamMembersTable currentUserId={user?.id} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          {canManage ? (
            <InvitationManager />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                ليس لديك صلاحية لإدارة الدعوات
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {canManage && (
          <TabsContent value="advanced" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  الإدارة المتقدمة للمستخدمين والموظفين
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  ربط المستخدمين بسجلات الموظفين، تعديل بيانات HR، وإدارة الحسابات غير المرتبطة
                </p>
              </CardHeader>
              <CardContent>
                <UnifiedUserEmployeeManagement />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AddTeamMemberWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
};

export default TeamManagement;
