import { Badge } from '@/components/ui/badge';
import { Hotel, Plane, Car, Truck, User, MapPin, Calendar, UserCheck, Gauge } from 'lucide-react';
import type { Workspace } from './types';
import {
  STAGE_LABELS,
  PAYMENT_LABELS,
  PROFIT_LABELS,
  type PaymentStatus,
  type ProfitHealth,
} from '@/lib/bookingWorkflow';

const typeInfo: Record<string, { label: string; icon: React.ElementType }> = {
  hotel: { label: 'حجز فندق', icon: Hotel },
  flight: { label: 'حجز طيران', icon: Plane },
  car_rental: { label: 'تأجير سيارات', icon: Car },
  transport: { label: 'نقل', icon: Truck },
};

interface Props {
  workspace: Workspace;
  paymentStatus: PaymentStatus;
  profitHealth: ProfitHealth;
}

const stageTone = (s?: string): string => {
  if (!s) return 'bg-muted text-foreground';
  if (s === 'completed' || s === 'post_travel') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (s === 'cancelled') return 'bg-destructive/10 text-destructive';
  if (s === 'paid' || s === 'traveling') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
  if (s === 'confirmed') return 'bg-primary/10 text-primary';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
};

const paymentTone = (p: PaymentStatus) =>
  p === 'paid'
    ? 'bg-emerald-100 text-emerald-800'
    : p === 'partial'
      ? 'bg-amber-100 text-amber-800'
      : p === 'refunded'
        ? 'bg-muted text-muted-foreground'
        : 'bg-destructive/10 text-destructive';

const profitTone = (h: ProfitHealth) =>
  h === 'healthy' ? 'bg-emerald-100 text-emerald-800' : h === 'thin' ? 'bg-amber-100 text-amber-800' : 'bg-destructive/10 text-destructive';

const computeSLA = (workspace: Workspace): { color: string; label: string } => {
  const openTasks = workspace.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const now = Date.now();
  const overdue = openTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now).length;
  const travelStart = workspace.booking?.start_date ? new Date(workspace.booking.start_date).getTime() : null;
  const daysToTravel = travelStart ? Math.floor((travelStart - now) / 86400000) : null;

  if (overdue > 0) return { color: 'bg-destructive text-destructive-foreground', label: `${overdue} متأخرة` };
  if (daysToTravel !== null && daysToTravel >= 0 && daysToTravel < 3) return { color: 'bg-amber-500 text-white', label: `${daysToTravel} أيام للسفر` };
  return { color: 'bg-emerald-500 text-white', label: 'ضمن الموعد' };
};

const destinationOf = (workspace: Workspace): string => {
  const it = workspace.itinerary;
  if (it?.hotel?.city || it?.hotel?.destination) return it.hotel.city || it.hotel.destination;
  if (it?.flight?.arrival_city || it?.flight?.destination) return it.flight.arrival_city || it.flight.destination;
  if (it?.transport?.destination) return it.transport.destination;
  return workspace.booking?.destination || '—';
};

export const WorkspaceExecutiveHeader = ({ workspace, paymentStatus, profitHealth }: Props) => {
  const b = workspace.booking;
  const ti = typeInfo[b?.booking_type as string] || typeInfo.hotel;
  const TypeIcon = ti.icon;
  const stage = b?.workflow_stage as string | undefined;
  const sla = computeSLA(workspace);
  const dest = destinationOf(workspace);
  const dates =
    b?.start_date
      ? `${b.start_date}${b.end_date ? ' → ' + b.end_date : ''}`
      : '—';

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
          <TypeIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold leading-tight">
            {b?.booking_number || 'حجز'}
          </h1>
          <p className="text-xs text-muted-foreground">{ti.label}</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge className={stageTone(stage)}>{STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage || '—'}</Badge>
          <Badge variant="outline">{b?.status || '—'}</Badge>
          <Badge className={paymentTone(paymentStatus)}>{PAYMENT_LABELS[paymentStatus]}</Badge>
          <Badge className={profitTone(profitHealth)}>{PROFIT_LABELS[profitHealth]}</Badge>
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground border-t pt-3">
        <Meta icon={User} label="العميل" value={workspace.customer?.name || b?.customer_name || '—'} />
        <Meta icon={MapPin} label="الوجهة" value={dest} />
        <Meta icon={Calendar} label="التواريخ" value={dates} />
        <Meta icon={UserCheck} label="الاستشاري" value={b?.assigned_to_name || b?.created_by_name || '—'} />
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3 w-3" />
          <span>SLA:</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sla.color}`}>{sla.label}</span>
        </div>
      </div>
    </div>
  );
};

const Meta = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <Icon className="h-3 w-3" />
    <span>{label}:</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);
