import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Unified Booking Workspace data layer (Phase 1 foundation).
 *
 * Aggregates everything a consultant needs for one booking:
 * booking + customer + supplier + itinerary details + invoices +
 * payments + WhatsApp conversation + notes + tasks + timeline.
 *
 * All writes are RLS-scoped by organization_id. Realtime keeps the
 * timeline and tasks in sync while the workspace is open.
 */

export type WorkflowStage =
  | 'lead'
  | 'qualified'
  | 'quoted'
  | 'confirmed'
  | 'paid'
  | 'operations'
  | 'traveling'
  | 'completed'
  | 'post_travel'
  | 'cancelled';

export const WORKFLOW_STAGES: WorkflowStage[] = [
  'lead',
  'qualified',
  'quoted',
  'confirmed',
  'paid',
  'operations',
  'traveling',
  'completed',
  'post_travel',
];

export interface BookingTask {
  id: string;
  organization_id: string;
  booking_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignee_id: string | null;
  source: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  organization_id: string;
  booking_id: string;
  kind: string;
  actor_id: string | null;
  actor_label: string | null;
  summary: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

const anyClient = supabase as any;

export const useBookingWorkspace = (bookingId: string | undefined) => {
  const qc = useQueryClient();

  // 1. Core booking
  const bookingQ = useQuery({
    queryKey: ['workspace-booking', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const booking = bookingQ.data;
  const customerId = booking?.customer_id;
  const supplierId = booking?.supplier_id;

  // 2. Customer
  const customerQ = useQuery({
    queryKey: ['workspace-customer', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 3. Supplier
  const supplierQ = useQuery({
    queryKey: ['workspace-supplier', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 4. Itinerary — hotel / flight / transport / car (linked by booking_id when present)
  const itineraryQ = useQuery({
    queryKey: ['workspace-itinerary', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const [hotel, flight, transport, car] = await Promise.all([
        anyClient.from('booking_hotel_details').select('*').eq('booking_id', bookingId).maybeSingle(),
        anyClient.from('booking_flight_details').select('*').eq('booking_id', bookingId).maybeSingle(),
        anyClient.from('booking_transport_details').select('*').eq('booking_id', bookingId).maybeSingle(),
        anyClient.from('booking_car_details').select('*').eq('booking_id', bookingId).maybeSingle(),
      ]);
      return {
        hotel: hotel.data ?? null,
        flight: flight.data ?? null,
        transport: transport.data ?? null,
        car: car.data ?? null,
      };
    },
  });

  // 5. Invoices + payments
  const invoicesQ = useQuery({
    queryKey: ['workspace-invoices', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ['workspace-payments', bookingId, customerId],
    enabled: !!bookingId,
    queryFn: async () => {
      const q = anyClient
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      const { data, error } = await q.or(
        `booking_id.eq.${bookingId}${customerId ? `,customer_id.eq.${customerId}` : ''}`,
      );
      if (error) return [];
      return data ?? [];
    },
  });

  // 6. WhatsApp conversation (by customer)
  const conversationQ = useQuery({
    queryKey: ['workspace-conversation', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await anyClient
        .from('whatsapp_conversations')
        .select('*')
        .eq('customer_id', customerId)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  // 7. Notes + tasks + timeline
  const notesQ = useQuery({
    queryKey: ['workspace-notes', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await anyClient
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const tasksQ = useQuery({
    queryKey: ['workspace-tasks', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('booking_tasks')
        .select('*')
        .eq('booking_id', bookingId)
        .order('due_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as BookingTask[];
    },
  });

  const timelineQ = useQuery({
    queryKey: ['workspace-timeline', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('booking_timeline_events')
        .select('*')
        .eq('booking_id', bookingId)
        .order('occurred_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TimelineEvent[];
    },
  });

  // 8. Realtime: tasks + timeline
  useEffect(() => {
    if (!bookingId) return;
    const ch = supabase
      .channel(`workspace-${bookingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_tasks', filter: `booking_id=eq.${bookingId}` },
        () => qc.invalidateQueries({ queryKey: ['workspace-tasks', bookingId] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_timeline_events', filter: `booking_id=eq.${bookingId}` },
        () => qc.invalidateQueries({ queryKey: ['workspace-timeline', bookingId] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        () => qc.invalidateQueries({ queryKey: ['workspace-booking', bookingId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [bookingId, qc]);

  // 9. Mutations
  const setStage = useMutation({
    mutationFn: async (stage: WorkflowStage) => {
      if (!bookingId) throw new Error('No booking');
      const { error } = await anyClient
        .from('bookings')
        .update({ workflow_stage: stage })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث مرحلة الحجز');
      qc.invalidateQueries({ queryKey: ['workspace-booking', bookingId] });
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر تحديث المرحلة'),
  });

  const addTask = useMutation({
    mutationFn: async (input: Partial<BookingTask> & { title: string }) => {
      if (!bookingId || !booking?.organization_id) throw new Error('No booking');
      const { error } = await anyClient.from('booking_tasks').insert({
        booking_id: bookingId,
        organization_id: booking.organization_id,
        source: input.source ?? 'manual',
        priority: input.priority ?? 'normal',
        status: input.status ?? 'open',
        title: input.title,
        description: input.description ?? null,
        due_at: input.due_at ?? null,
        assignee_id: input.assignee_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('تمت إضافة المهمة'),
    onError: (e: any) => toast.error(e?.message || 'تعذر إضافة المهمة'),
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await anyClient
        .from('booking_tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر إغلاق المهمة'),
  });

  const logEvent = useMutation({
    mutationFn: async (input: { kind: string; summary?: string; payload?: Record<string, unknown> }) => {
      if (!bookingId || !booking?.organization_id) throw new Error('No booking');
      const { error } = await anyClient.from('booking_timeline_events').insert({
        booking_id: bookingId,
        organization_id: booking.organization_id,
        kind: input.kind,
        summary: input.summary ?? null,
        payload: input.payload ?? {},
      });
      if (error) throw error;
    },
  });

  // 10. Derived: profit & balance
  const financials = useMemo(() => {
    const invoices = invoicesQ.data ?? [];
    const payments = paymentsQ.data ?? [];
    const invoiced = invoices.reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
    const paid = payments
      .filter((p: any) => p.status === 'completed' || p.status === 'succeeded')
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const selling = Number(booking?.selling_price ?? 0);
    const cost = Number(booking?.cost_price ?? 0);
    return {
      invoiced,
      paid,
      outstanding: Math.max(0, invoiced - paid),
      selling,
      cost,
      profit: Number(booking?.profit ?? selling - cost),
      currency: booking?.currency ?? 'EGP',
    };
  }, [booking, invoicesQ.data, paymentsQ.data]);

  return {
    booking,
    customer: customerQ.data,
    supplier: supplierQ.data,
    itinerary: itineraryQ.data,
    invoices: invoicesQ.data ?? [],
    payments: paymentsQ.data ?? [],
    conversation: conversationQ.data,
    notes: notesQ.data ?? [],
    tasks: tasksQ.data ?? [],
    timeline: timelineQ.data ?? [],
    financials,
    isLoading:
      bookingQ.isLoading ||
      customerQ.isLoading ||
      itineraryQ.isLoading ||
      invoicesQ.isLoading ||
      tasksQ.isLoading,
    setStage: (s: WorkflowStage) => setStage.mutateAsync(s),
    addTask: (t: Partial<BookingTask> & { title: string }) => addTask.mutateAsync(t),
    completeTask: (id: string) => completeTask.mutateAsync(id),
    logEvent: (input: { kind: string; summary?: string; payload?: Record<string, unknown> }) =>
      logEvent.mutateAsync(input),
    refetch: () => {
      bookingQ.refetch();
      itineraryQ.refetch();
      invoicesQ.refetch();
      paymentsQ.refetch();
      tasksQ.refetch();
      timelineQ.refetch();
    },
  };
};
