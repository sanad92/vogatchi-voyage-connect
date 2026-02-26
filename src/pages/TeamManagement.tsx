import { useState } from 'react';
import { useOrgMembers, OrgMember } from '@/hooks/useOrgMembers';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import InvitationManager from '@/components/invitations/InvitationManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, UserMinus, Shield, Crown, UserCheck, Eye, Briefcase } from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'مالك', icon: Crown, color: 'text-amber-600' },
  admin: { label: 'مدير', icon: Shield, color: 'text-blue-600' },
  manager: { label: 'مشرف', icon: Briefcase, color: 'text-green-600' },
  agent: { label: 'موظف', icon: UserCheck, color: 'text-purple-600' },
  viewer: { label: 'مشاهد', icon: Eye, color: 'text-muted-foreground' },
};

const TeamManagement = () => {
  const { members, isLoading, updateRole, removeMember, isOwner, currentUserRole } = useOrgMembers();
  const { user, hasRole } = useOptimizedAuth();
  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null);

  const canManageMembers = isOwner || hasRole('admin');
  const canChangeRoles = isOwner || hasRole('admin');

  const handleRoleChange = (memberId: string, newRole: string) => {
    updateRole.mutate({ memberId, newRole });
  };

  const confirmRemove = () => {
    if (memberToRemove) {
      removeMember.mutate(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  return (
    <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            إدارة الفريق
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            إدارة أعضاء المؤسسة والدعوات والصلاحيات
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {members.length} عضو
        </Badge>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="members">الأعضاء</TabsTrigger>
          <TabsTrigger value="invitations">الدعوات</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">أعضاء المؤسسة</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-3 text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا يوجد أعضاء</div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
                    const RoleIcon = roleConfig.icon;
                    const isCurrentUser = member.user_id === user?.id;
                    const isMemberOwner = member.role === 'owner';

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${roleConfig.color}`}>
                            <RoleIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate">
                                {member.profile?.full_name || 'بدون اسم'}
                              </span>
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-xs">أنت</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.profile?.email || '—'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mr-2">
                          {canChangeRoles && !isCurrentUser && !isMemberOwner ? (
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleRoleChange(member.id, v)}
                              disabled={updateRole.isPending}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_CONFIG)
                                  .filter(([key]) => key !== 'owner') // Can't assign owner
                                  .map(([value, config]) => (
                                    <SelectItem key={value} value={value}>
                                      {config.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {roleConfig.label}
                            </Badge>
                          )}

                          {canManageMembers && !isCurrentUser && !isMemberOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMemberToRemove(member)}
                              className="text-destructive hover:text-destructive"
                              title="إزالة العضو"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          {canManageMembers ? (
            <InvitationManager />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                ليس لديك صلاحية لإدارة الدعوات
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إزالة العضو</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إزالة <strong>{memberToRemove?.profile?.full_name || memberToRemove?.profile?.email}</strong> من المؤسسة؟
              لن يتمكن من الوصول للبيانات بعد الإزالة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              إزالة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamManagement;
