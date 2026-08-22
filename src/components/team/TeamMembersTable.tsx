import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, UserMinus, Power, Crown, Shield, Briefcase, UserCheck, Eye, LogOut, type LucideIcon } from 'lucide-react';
import { useTeamManagement, TeamMember } from '@/hooks/useTeamManagement';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import type { OrgRole } from '@/lib/accessControl';
import { useSopDepartmentMembers, useUpsertDepartmentMember, useRemoveDepartmentMember } from '@/hooks/useSop';
import { DEPARTMENT_LABELS, SopDepartment } from '@/lib/sop';
import OffboardMemberDialog from './OffboardMemberDialog';

const ROLE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  owner: { label: 'مالك', icon: Crown, color: 'text-amber-600' },
  admin: { label: 'مدير', icon: Shield, color: 'text-blue-600' },
  manager: { label: 'مشرف', icon: Briefcase, color: 'text-green-600' },
  agent: { label: 'موظف', icon: UserCheck, color: 'text-purple-600' },
  viewer: { label: 'مشاهد', icon: Eye, color: 'text-muted-foreground' },
};

interface Props {
  currentUserId?: string;
  canManage: boolean;
}

const TeamMembersTable = ({ currentUserId, canManage }: Props) => {
  const { members, isLoading, updateRole, toggleActive, removeMember } = useTeamManagement();
  const { userRole } = useOptimizedAuth();
  const { data: deptMembers = [] } = useSopDepartmentMembers();
  const addDepartment = useUpsertDepartmentMember();
  const removeDepartment = useRemoveDepartmentMember();
  const deptsByUser = deptMembers.reduce<Record<string, SopDepartment[]>>((acc, d) => {
    (acc[d.user_id] ||= []).push(d.department);
    return acc;
  }, {});

  const [offboarding, setOffboarding] = useState<TeamMember | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!members.length) {
    return <div className="text-center py-12 text-muted-foreground">لا يوجد أعضاء في الفريق بعد.</div>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العضو</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right hidden md:table-cell">المنصب / القسم</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right w-[60px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const meta = ROLE_META[m.role] || ROLE_META.viewer;
              const RoleIcon = meta.icon;
              const isMe = m.user_id === currentUserId;
              const isOwnerRow = m.role === 'owner';
              const editable = canManage
                && !isMe
                && !isOwnerRow
                && (m.role !== 'admin' || userRole === 'owner');

              return (
                <TableRow key={m.membership_id} className={!m.is_active ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center ${meta.color} flex-shrink-0`}>
                        <RoleIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{m.full_name || 'بدون اسم'}</span>
                          {isMe && <Badge variant="secondary" className="text-[10px] h-4">أنت</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        {m.phone && <p className="text-xs text-muted-foreground" dir="ltr">{m.phone}</p>}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {editable ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => updateRole.mutate({ membershipId: m.membership_id, newRole: v as OrgRole })}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_META)
                            .filter(([k]) => k !== 'owner' && (k !== 'admin' || userRole === 'owner'))
                            .map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <RoleIcon className={`w-3 h-3 ${meta.color}`} />
                        {meta.label}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-1">
                      {(() => {
                        const mine = deptsByUser[m.user_id] || [];
                        const summary = mine.length
                          ? mine.map((d) => DEPARTMENT_LABELS[d]).join('، ')
                          : 'غير موزع';
                        if (!canManage) {
                          return <Badge variant="outline" className="text-xs">{summary}</Badge>;
                        }
                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-44 justify-between font-normal">
                                <span className="truncate">{summary}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {(Object.keys(DEPARTMENT_LABELS) as SopDepartment[]).map((d) => (
                                <DropdownMenuCheckboxItem
                                  key={d}
                                  checked={mine.includes(d)}
                                  disabled={addDepartment.isPending || removeDepartment.isPending}
                                  onSelect={(e) => e.preventDefault()}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      addDepartment.mutate({ user_id: m.user_id, department: d, is_available: true });
                                    } else {
                                      removeDepartment.mutate({ user_id: m.user_id, department: d });
                                    }
                                  }}
                                >
                                  {DEPARTMENT_LABELS[d]}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">
                        {m.employee?.position || 'بدون منصب'}
                      </p>
                    </div>
                  </TableCell>


                  <TableCell>
                    <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-xs">
                      {m.is_active ? 'نشط' : 'موقوف'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {editable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleActive.mutate({ membershipId: m.membership_id, isActive: !m.is_active })}>
                            <Power className="w-4 h-4 ml-2" /> {m.is_active ? 'إيقاف' : 'تفعيل'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {m.is_active && (
                            <DropdownMenuItem onClick={() => setOffboarding(m)}>
                              <LogOut className="w-4 h-4 ml-2" /> إنهاء خدمة وتحرير المقعد
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmRemove(m)}>
                            <UserMinus className="w-4 h-4 ml-2" /> إزالة من المؤسسة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <OffboardMemberDialog member={offboarding} onClose={() => setOffboarding(null)} />

      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إزالة العضو</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إزالة <strong>{confirmRemove?.full_name || confirmRemove?.email}</strong>؟ سيفقد الوصول لبيانات المؤسسة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmRemove) removeMember.mutate(confirmRemove.membership_id);
                setConfirmRemove(null);
              }}
            >
              إزالة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamMembersTable;
