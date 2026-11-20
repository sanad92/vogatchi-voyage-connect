import { isPilgrimageBookingType } from '@/lib/pilgrimage/operations';
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOptimizedAuth } from './useOptimizedAuth';
import { useOrgId } from './useOrgId';
import { isRecordId } from './useCustomerContext';
import { useUpdateOpsTask } from './useOpsCommandCenter';
import { resolveFlightCatalogLabel } from '@/lib/bookingServiceFields';
import type { TravelItinerary } from '@/lib/travelDocuments';

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
  status: 'open' | 'pending' | 'in_progress' | 'done' | 'completed' | 'cancelled' | 'canceled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignee_id: string | null;
  source: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function isBookingTaskCompleted(task: BookingTask) {
  return task.status === 'done' || task.status === 'completed';
}

export function isBookingTaskOpen(task: BookingTask) {
  return !isBookingTaskCompleted(task) && task.status !== 'cancelled' && task.status !== 'canceled';
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
const catalogUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function withFlightDisplayLabels<T extends NonNullable<TravelItinerary['flight']>>(flight: T, orgId: string) {
  const scope = `organization_id.is.null,organization_id.eq.${orgId}`;
  const { airline, flight_class, departure_airport, arrival_airport, return_departure_airport, return_arrival_airport } = flight;
  const airportIds = [departure_airport, arrival_airport, return_departure_airport, return_arrival_airport]
    .filter((id): id is string => Boolean(id && catalogUuid.test(id)));
  const [airlineRows, classRows, airportRows] = await Promise.all([
    airline && catalogUuid.test(airline)
      ? supabase.from('airlines').select('id, name').or(scope).eq('id', airline)
      : null,
    flight_class && catalogUuid.test(flight_class)
      ? supabase.from('flight_classes').select('id, name, name_ar').or(scope).eq('id', flight_class)
      : null,
    airportIds.length
      ? supabase.from('airports').select('id, name, iata_code').or(scope).in('id', airportIds)
      : null,
  ]);
  const failure = airlineRows?.error ?? classRows?.error ?? airportRows?.error;
  if (failure) throw failure;
  const airportLabel = (airport?: string | null) => resolveFlightCatalogLabel(airport, airportRows?.data ?? []);
  return {
    ...flight,
    airline: resolveFlightCatalogLabel(airline, airlineRows?.data ?? []),
    flight_class: resolveFlightCatalogLabel(flight_class, classRows?.data ?? []),
    departure_airport: airportLabel(departure_airport),
    arrival_airport: airportLabel(arrival_airport),
    return_departure_airport: airportLabel(return_departure_airport),
    return_arrival_airport: airportLabel(return_arrival_airport),
  };
}

export const useBookingWorkspace = (bookingId: string | undefined) => {
  const qc = useQueryClient();
  const { user } = useOptimizedAuth();
  const orgId = useOrgId();

  // 1. Core booking
  const bookingQ = useQuery({
    queryKey: ['workspace-booking', bookingId, orgId],
    enabled: Boolean(orgId && isRecordId(bookingId)),
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('bookings')
        .select('*')
        .eq('organization_id', orgId)
        .eq('id', bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const booking = bookingQ.data;
  const { mutateAsync: updateTask } = useUpdateOpsTask(booking?.organization_id);
  const pilgrimageDeparture = useQuery<{ program_id: string } | null>({
    queryKey: ['workspace-pilgrimage-departure', bookingId, booking?.organization_id],
    enabled: !!bookingId && isPilgrimageBookingType(booking?.booking_type),
    queryFn: async () => {
      const { data, error } = await anyClient.from('umrah_inventory_bookings')
        .select('program_id').eq('organization_id', booking.organization_id)
        .eq('booking_id', bookingId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const customerId = booking?.customer_id;
  const supplierId = booking?.supplier_id;

  // 2. Customer
  const customerQ = useQuery({
    queryKey: ['workspace-customer', customerId, orgId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('customers')
        .select('*')
        .eq('organization_id', orgId)
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
        .eq('organization_id', orgId)
        .eq('id', supplierId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 4. Unified service details are scoped through their verified parent booking.
  const itineraryQ = useQuery({
    queryKey: ['workspace-itinerary', bookingId, orgId],
    enabled: !!booking && booking.organization_id === orgId,
    queryFn: async () => {
      if (!bookingId || !orgId || booking?.organization_id !== orgId) return {};
      const [hotel, flight, transport, car] = await Promise.all([
        supabase.from('booking_hotel_details').select('*').eq('booking_id', bookingId).maybeSingle(),
        supabase.from('booking_flight_details').select('*').eq('booking_id', bookingId).maybeSingle(),
        supabase.from('booking_transport_details').select('*').eq('booking_id', bookingId).maybeSingle(),
        supabase.from('booking_car_details').select('*').eq('booking_id', bookingId).maybeSingle(),
      ]);
      const failure = hotel.error ?? flight.error ?? transport.error ?? car.error;
      if (failure) throw failure;
      return {
        hotel: hotel.data,
        flight: flight.data ? await withFlightDisplayLabels(flight.data, orgId) : null,
        transport: transport.data,
        car: car.data,
      };
    },
  });

  // 5. Invoices + payments
  const invoicesQ = useQuery({
    queryKey: ['workspace-invoices', bookingId],
    enabled: !!booking,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('organization_id', orgId)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ['workspace-payments', bookingId, customerId],
    enabled: !!booking,
    queryFn: async () => {
      // payment_transactions is subscription/Paymob-only (no booking_id/customer_id),
      // so booking payments come from customer_payments.
      const customerPays = await anyClient
        .from('customer_payments')
        .select('*')
        .eq('organization_id', orgId)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      const rows = ((customerPays.data ?? []) as any[]).map((p) => ({ ...p, source: 'customer_payment' }));
      return rows.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
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
        .eq('organization_id', orgId)
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
        .eq('organization_id', orgId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const tasksQ = useQuery({
    queryKey: ['workspace-tasks', bookingId],
    enabled: !!booking,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('booking_tasks')
        .select('*')
        .eq('organization_id', orgId)
        .eq('booking_id', bookingId)
        .order('due_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as BookingTask[];
    },
  });

  const timelineQ = useQuery({
    queryKey: ['workspace-timeline', bookingId],
    enabled: !!booking,
    queryFn: async () => {
      const { data, error } = await anyClient
        .from('booking_timeline_events')
        .select('*')
        .eq('organization_id', orgId)
        .eq('booking_id', bookingId)
        .order('occurred_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TimelineEvent[];
    },
  });

  // 8. Realtime: tasks + timeline
  useEffect(() => {
    if (!bookingId || !booking) return;
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
  }, [bookingId, booking?.id, orgId, qc]);

  // 9. Mutations
  const setStage = useMutation({
    mutationFn: async (stage: WorkflowStage) => {
      if (!bookingId) throw new Error('No booking');
      if (!stage || ![...WORKFLOW_STAGES, 'cancelled'].includes(stage)) {
        throw new Error('مرحلة الحجز غير صالحة');
      }
      // Route through advance_workflow RPC so the event bus emits
      // `booking.stage_changed`, which fans out to timeline + automation handlers.
      const { error } = await anyClient.rpc('advance_workflow', {
        p_booking_id: bookingId,
        p_to_stage: stage,
        p_reason: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث مرحلة الحجز');
      qc.invalidateQueries({ queryKey: ['workspace-booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['booking-workspace', bookingId] });
      qc.invalidateQueries({ queryKey: ['workflow-progress'] });
      qc.invalidateQueries({ queryKey: ['booking-automation-run', bookingId] });
      qc.invalidateQueries({ queryKey: ['booking-automation-steps', bookingId] });
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر تحديث المرحلة'),
  });

  const addTask = useMutation({
    mutationFn: async (input: Partial<BookingTask> & { title: string }) => {
      if (!bookingId || !booking?.organization_id || !user?.id) throw new Error('تعذر تحديد الحجز أو المستخدم');
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
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-tasks', bookingId] });
      qc.invalidateQueries({ queryKey: ['ops-queue', booking.organization_id] });
      qc.invalidateQueries({ queryKey: ['ops-command-center', booking.organization_id] });
      toast.success('تمت إضافة المهمة');
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر إضافة المهمة'),
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
    const activeInvoices = invoices.filter((i: any) => i.status !== 'cancelled' && i.status !== 'draft');
    const invoicePaid = activeInvoices.reduce((s: number, i: any) => s + Number(i.total_paid_amount ?? 0), 0);
    const outstanding = activeInvoices.reduce((s: number, i: any) =>
      s + Math.max(0, Number(i.remaining_amount ?? (Number(i.final_amount ?? i.total_amount ?? 0) - Number(i.total_paid_amount ?? 0)))), 0);
    const invoiced = invoicePaid + outstanding;
    const paid = payments
      .filter((p: any) => p.status === 'completed' || p.status === 'succeeded')
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const selling = Number(booking?.selling_price ?? 0);
    const cost = Number(booking?.cost_price ?? 0);
    return {
      invoiced,
      paid,
      outstanding,
      selling,
      cost,
      profit: Number(booking?.profit ?? selling - cost),
      currency: booking?.currency ?? 'EGP',
    };
  }, [booking, invoicesQ.data, paymentsQ.data]);

  return {
    booking,
    pilgrimageDeparture: pilgrimageDeparture.data,
    customer: customerQ.data,
    supplier: supplierQ.data,
    itinerary: itineraryQ.data,
    itineraryError: itineraryQ.isError,
    refreshItinerary: itineraryQ.refetch,
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
    completeTask: async (id: string) => {
      try {
        await updateTask({ id, action: 'complete' });
        toast.success('تم إنجاز المهمة');
      } catch {
        toast.error('تعذر حفظ المهمة. حدّث القائمة وراجع صلاحيتك.');
      }
    },
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
