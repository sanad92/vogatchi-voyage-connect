import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Loader2, Trash2 } from 'lucide-react';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import AddTeamMemberWizard from '@/components/team/AddTeamMemberWizard';

const ROLE_LABELS: Record<string, string> = {
  owner: 'مالك',
  admin: 'مدير',
  manager: 'مشرف',
  agent: 'موظف',
  viewer: 'مشاهد',
};

const CS_ROLES = ['agent', 'manager', 'admin', 'owner'];

export const WhatsAppEmployeeManagement: React.FC = () => {
  const { members, isLoading, updateRole, removeMember, isOwner } = useOrgMembers();
  const { hasRole } = useOptimizedAuth();
  const [wizardOpen, setWizardOpen] = useState(false);

  const canManage = isOwner || hasRole('admin');
  const staff = members.filter((m) => CS_ROLES.includes(m.role));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            إدارة الموظفين
          </h2>
          <p className="text-muted-foreground mt-1">
            إدارة موظفي خدمة العملاء وصلاحياتهم في WhatsApp Business
          </p>
        </div>

        {canManage && (
          <Button className="flex items-center gap-2" onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4" />
            إضافة موظف
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            الموظفون ({staff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">لا يوجد موظفون</h3>
              <p className="text-muted-foreground mb-4">
                ابدأ بإضافة موظفين لخدمة العملاء
              </p>
              {canManage && (
                <Button onClick={() => setWizardOpen(true)}>
                  إضافة موظف جديد
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.profile?.full_name || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{m.profile?.email || '—'}</TableCell>
                    <TableCell className="text-sm">{m.profile?.phone || '—'}</TableCell>
                    <TableCell>
                      {canManage && m.role !== 'owner' ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) =>
                            updateRole.mutate({ memberId: m.id, newRole: v })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['agent', 'manager', 'admin'].map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{ROLE_LABELS[m.role] || m.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage && m.role !== 'owner' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('هل تريد إزالة هذا الموظف؟')) {
                              removeMember.mutate(m.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddTeamMemberWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
};
