import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/useOrgId';
import { supabase } from '@/integrations/supabase/client';

export type DefaultEmployeeRole = 'manager' | 'agent' | 'viewer';

export const isEditableRoleDefault = (permission: string) => !/^(admin|system)_/.test(permission)
  && !['team_manage_roles', 'manage_user_roles', 'team_invite', 'create_users',
    'edit_users', 'manage_system_settings', 'manage_backups'].includes(permission);

export function useOrganizationRoleDefaults(baseRole: DefaultEmployeeRole) {
  const orgId = useOrgId();
  const client = useQueryClient();
  const queryKey = ['organization-role-defaults', orgId, baseRole];
  const query = useQuery({
    queryKey,
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase.from('organization_role_permission_defaults')
        .select('permission_key, granted').eq('organization_id', orgId!).eq('base_role', baseRole);
      if (error) throw error;
      return new Map(data.map(row => [row.permission_key, row.granted]));
    },
  });

  const save = useMutation({
    mutationFn: async ({ permission, granted }: { permission: string; granted: boolean | null }) => {
      if (!orgId) throw new Error('تعذّر تحديد المؤسسة');
      const table = supabase.from('organization_role_permission_defaults');
      const response = granted === null
        ? await table.delete().eq('organization_id', orgId).eq('base_role', baseRole).eq('permission_key', permission).select('permission_key')
        : await table.upsert({
          organization_id: orgId, base_role: baseRole, permission_key: permission, granted,
        }, { onConflict: 'organization_id,base_role,permission_key' }).select('permission_key');
      if (response.error) throw response.error;
      if (response.data.length !== 1) throw new Error('تعذّر تأكيد حفظ التغيير');
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: ['my-company-permission-profile', orgId] }),
      ]);
      toast.success('تم حفظ الصلاحية الافتراضية');
    },
    onError: () => toast.error('تعذّر حفظ الصلاحية الافتراضية'),
  });

  return { ...query, save: save.mutate, saving: save.isPending };
}
