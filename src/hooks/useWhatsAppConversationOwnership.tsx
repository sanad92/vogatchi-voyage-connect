import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from './useOptimizedAuth';
import { useSupabasePermissions } from './useSupabasePermissions';
import { toast } from 'sonner';

export type OwnershipStatus =
  | 'loading'
  | 'owned'
  | 'unassigned'
  | 'assigned_to_other'
  | 'no_employee_link'
  | 'no_permission'
  | 'error';

/**
 * Resolves whether the current user is allowed to send on a WhatsApp conversation.
 * The messaging service requires the conversation to be assigned to the sender's
 * own employee record (managers/admins are exempt), so every composer must be able
 * to claim the conversation or request an assignment before sending.
 */
export const useWhatsAppConversationOwnership = (conversationId?: string | null) => {
  const { user } = useOptimizedAuth() as any;
  const { hasPermission } = useSupabasePermissions();
  const qc = useQueryClient();

  const isManager = hasPermission('whatsapp_admin');
  const canWork =
    hasPermission('whatsapp_view') && (isManager || hasPermission('customer_service_edit'));

  const conversationQuery = useQuery({
    queryKey: ['wa-ownership-conversation', conversationId],
    enabled: !!conversationId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, organization_id, assigned_to, status, assigned_employee:employees(full_name)')
        .eq('id', conversationId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const orgId = conversationQuery.data?.organization_id as string | undefined;

  const employeeQuery = useQuery({
    queryKey: ['wa-ownership-employee', orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('linked_employee_id')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!profile?.linked_employee_id) return null;
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('id', profile.linked_employee_id)
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .maybeSingle();
      if (employeeError) throw employeeError;
      return employee;
    },
  });

  const isLoading = conversationQuery.isLoading || employeeQuery.isLoading;
  const conversation = conversationQuery.data;
  const employee = employeeQuery.data;
  const assignedTo = conversation?.assigned_to as string | null | undefined;

  const status: OwnershipStatus = useMemo(() => {
    if (!conversationId) return 'loading';
    if (conversationQuery.isError || employeeQuery.isError) return 'error';
    if (isLoading) return 'loading';
    if (!canWork) return 'no_permission';
    if (employee && assignedTo && assignedTo === employee.id) return 'owned';
    if (!assignedTo) return employee ? 'unassigned' : 'no_employee_link';
    return 'assigned_to_other';
  }, [
    conversationId,
    conversationQuery.isError,
    employeeQuery.isError,
    isLoading,
    canWork,
    employee,
    assignedTo,
  ]);

  // Managers/admins may send regardless of assignment (server rule mirrors this).
  const canSend = status === 'owned' || (isManager && canWork && status !== 'loading' && status !== 'error');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['wa-ownership-conversation', conversationId] });
    qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    qc.invalidateQueries({ queryKey: ['whatsapp-conversation-detail'] });
    qc.invalidateQueries({ queryKey: ['whatsapp-conversation', conversationId] });
    qc.invalidateQueries({ queryKey: ['customer-whatsapp'] });
  };

  const claim = useMutation({
    mutationFn: async () => {
      if (!orgId || !conversationId) throw new Error('المحادثة غير متاحة');
      if (!canWork) throw new Error('لا تملك صلاحية العمل على محادثات واتساب');
      if (!employee) throw new Error('اربط حسابك بملف موظف نشط في المؤسسة أولاً');
      const { data, error } = await (supabase as any).rpc('wa_claim_conversation', {
        _org_id: orgId,
        _conversation_id: conversationId,
      });
      if (error) throw error;
      if (!data) throw new Error('المحادثة لم تعد متاحة');
      return data as string;
    },
    onSuccess: () => toast.success('تم استلام المحادثة — يمكنك الإرسال الآن'),
    onError: (e: any) => toast.error(e?.message || 'تعذر استلام المحادثة'),
    onSettled: invalidate,
  });

  const takeOver = useMutation({
    mutationFn: async () => {
      if (!orgId || !conversationId) throw new Error('المحادثة غير متاحة');
      if (!isManager) throw new Error('تحويل المحادثات المسندة يتطلب صلاحية إشراف واتساب');
      if (!employee) throw new Error('اربط حسابك بملف موظف نشط في المؤسسة أولاً');
      const previous = assignedTo ?? null;
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({
          assigned_to: employee.id,
          status: 'active',
          auto_assigned: false,
          assignment_reason: 'manager_takeover',
        })
        .eq('id', conversationId)
        .eq('organization_id', orgId);
      if (error) throw error;
      await supabase.from('conversation_assignments_history').insert({
        conversation_id: conversationId,
        organization_id: orgId,
        action: 'assigned',
        to_user_id: user?.id ?? null,
        performed_by: user?.id ?? null,
        reason: 'manager_takeover',
        metadata: { employee_id: employee.id, previous_employee_id: previous },
      } as any);
    },
    onSuccess: () => toast.success('تم تحويل المحادثة إليك'),
    onError: (e: any) => toast.error(e?.message || 'تعذر تحويل المحادثة'),
    onSettled: invalidate,
  });

  const requestAssignment = useMutation({
    mutationFn: async (reason?: string) => {
      if (!orgId || !conversationId) throw new Error('المحادثة غير متاحة');
      const { error } = await supabase.from('conversation_assignments_history').insert({
        conversation_id: conversationId,
        organization_id: orgId,
        action: 'transfer_requested',
        from_user_id: null,
        to_user_id: user?.id ?? null,
        performed_by: user?.id ?? null,
        reason: reason || 'طلب إسناد المحادثة',
        metadata: { requested_employee_id: employee?.id ?? null },
      } as any);
      if (error) throw error;
    },
    onSuccess: () => toast.success('تم إرسال طلب الإسناد للمشرف'),
    onError: (e: any) => toast.error(e?.message || 'تعذر إرسال طلب الإسناد'),
    onSettled: invalidate,
  });

  return {
    status,
    canSend,
    isManager,
    canWork,
    isLoading,
    employee,
    organizationId: orgId,
    assignedEmployeeName: (conversation?.assigned_employee?.full_name as string | undefined) || null,
    claim,
    takeOver,
    requestAssignment,
    refetch: () => {
      void conversationQuery.refetch();
      void employeeQuery.refetch();
    },
  };
};

export type WhatsAppConversationOwnership = ReturnType<typeof useWhatsAppConversationOwnership>;

/**
 * Phone-based helper for surfaces that send without an open conversation view
 * (template suggestion panels, customer chat first message). It makes sure a
 * conversation row exists and is assigned to the caller before sending, which is
 * what the messaging service requires.
 */
export const useEnsureWhatsAppOwnership = () => {
  const { user } = useOptimizedAuth() as any;
  const { hasPermission } = useSupabasePermissions();
  const isManager = hasPermission('whatsapp_admin');
  const canWork =
    hasPermission('whatsapp_view') && (isManager || hasPermission('customer_service_edit'));

  /** Returns the conversation id when the caller may send, otherwise throws with an Arabic reason. */
  const ensureOwned = async (params: {
    organizationId?: string | null;
    phone?: string | null;
    customerId?: string | null;
    conversationId?: string | null;
  }): Promise<string | null> => {
    const { organizationId, phone, customerId } = params;
    if (!canWork) throw new Error('لا تملك صلاحية إرسال رسائل واتساب');
    if (!organizationId) throw new Error('المؤسسة غير محددة');

    let conversationId = params.conversationId ?? null;
    let assignedTo: string | null = null;

    if (conversationId) {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, assigned_to')
        .eq('id', conversationId)
        .maybeSingle();
      if (error) throw error;
      assignedTo = (data?.assigned_to as string | null) ?? null;
    } else {
      if (!phone) throw new Error('لا يوجد رقم واتساب لهذا العميل');
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, assigned_to')
        .eq('organization_id', organizationId)
        .eq('phone_number', phone)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        conversationId = data.id as string;
        assignedTo = (data.assigned_to as string | null) ?? null;
      }
    }

    if (isManager) return conversationId;

    const { data: profile } = await supabase
      .from('profiles')
      .select('linked_employee_id')
      .eq('id', user?.id)
      .maybeSingle();
    const employeeId = profile?.linked_employee_id as string | null | undefined;
    if (!employeeId) {
      throw new Error('حسابك غير مرتبط بملف موظف — اطلب من المشرف ربط حسابك قبل الإرسال');
    }
    if (assignedTo && assignedTo === employeeId) return conversationId;
    if (assignedTo && assignedTo !== employeeId) {
      throw new Error('المحادثة مسندة لموظف آخر — اطلب تحويلها إليك قبل الإرسال');
    }

    // Unassigned (or brand new contact): create when needed, then claim atomically.
    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          organization_id: organizationId,
          phone_number: phone!,
          customer_id: customerId ?? null,
          status: 'active',
          priority: 'normal',
          assigned_to: employeeId,
          last_message_at: new Date().toISOString(),
        } as any)
        .select('id')
        .single();
      if (createError) throw createError;
      return created.id as string;
    }

    const { data: claimed, error: claimError } = await (supabase as any).rpc('wa_claim_conversation', {
      _org_id: organizationId,
      _conversation_id: conversationId,
    });
    if (claimError) throw claimError;
    if (!claimed) throw new Error('تعذر استلام المحادثة — قد تكون أُسندت لموظف آخر');
    return conversationId;
  };

  return { ensureOwned, canWork, isManager };
};
