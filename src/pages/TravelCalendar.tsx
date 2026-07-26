import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft, ChevronRight, Plane, Hotel, Receipt, FileCheck, ListTodo,
  PlaneLanding, PlaneTakeoff, CreditCard, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EventKind =
  | 'arrival' | 'departure' | 'checkin' | 'checkout'
  | 'flight' | 'visa_deadline' | 'customer_payment' | 'supplier_payment' | 'task' | 'reminder';

interface CalEvent {
  id: string;
  kind: EventKind;
  date: string; // YYYY-MM-DD
  title: string;
  href?: string;
  amount?: number;
  currency?: string;
}

const KIND_META: Record<EventKind, { label: string; icon: any; color: string }> = {
  arrival:          { label: 'وصول',         icon: PlaneLanding, color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200' },
  departure:        { label: 'مغادرة',       icon: PlaneTakeoff, color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200' },
  checkin:          { label: 'تسجيل دخول',   icon: Hotel,        color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200' },
  checkout:         { label: 'تسجيل خروج',   icon: Hotel,        color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200' },
  flight:           { label: 'رحلة',          icon: Plane,        color: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200' },
  visa_deadline:    { label: 'موعد تأشيرة',  icon: FileCheck,    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200' },
  customer_payment: { label: 'دفعة عميل',    icon: CreditCard,   color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-200' },
  supplier_payment: { label: 'دفعة مورّد',   icon: Building2,    color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200' },
  task:             { label: 'مهمة',          icon: ListTodo,     color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/40 dark:text-slate-200' },
  reminder:         { label: 'تذكير',         icon: Receipt,      color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200' },
};

const DAY_NAMES = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayIndexFromJS = (jsDay: number) => (jsDay + 1) % 7;

const TravelCalendar = () => {
  const orgId = useOrgId();
  const navigate = useNavigate();
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [cursor, setCursor] = useState(new Date());
  const [filters, setFilters] = useState<Set<EventKind>>(new Set(Object.keys(KIND_META) as EventKind[]));

  const range = useMemo(() => {
    const start = new Date(cursor); const end = new Date(cursor);
    if (view === 'month') { start.setDate(1); end.setMonth(end.getMonth() + 1); end.setDate(0); }
    else if (view === 'week') { const off = dayIndexFromJS(start.getDay()); start.setDate(start.getDate() - off); end.setTime(start.getTime()); end.setDate(end.getDate() + 6); }
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    return { start, end };
  }, [cursor, view]);

  const { data: events = [] } = useQuery({
    queryKey: ['travel-calendar', orgId, toISO(range.start), toISO(range.end)],
    enabled: !!orgId,
    queryFn: async () => {
      const out: CalEvent[] = [];
      const from = toISO(range.start); const to = toISO(range.end);

      const [bookings, invoices, payments, poRes, tasks] = await Promise.all([
        (supabase as any).from('bookings').select('id, booking_reference, customer_name, check_in_date, check_out_date, travel_date, return_date, booking_type').eq('organization_id', orgId).or(`check_in_date.gte.${from},travel_date.gte.${from}`).limit(500),
        (supabase as any).from('invoices').select('id, invoice_number, customer_name, due_date, total_amount, currency, booking_id').eq('organization_id', orgId).gte('due_date', from).lte('due_date', to).limit(500),
        (supabase as any).from('customer_payments').select('id, amount, currency, payment_date, booking_id, customer_id').eq('organization_id', orgId).gte('payment_date', from).lte('payment_date', to).limit(500),
        (supabase as any).from('supplier_payment_orders').select('id, amount, currency, due_date, supplier_id, booking_id, status').eq('organization_id', orgId).gte('due_date', from).lte('due_date', to).limit(500),
        (supabase as any).from('booking_tasks').select('id, title, due_date, booking_id, status').eq('organization_id', orgId).gte('due_date', from).lte('due_date', to).limit(500),
      ]);

      (bookings.data ?? []).forEach((b: any) => {
        const ref = b.booking_reference || b.id.slice(0,8);
        const name = b.customer_name || 'عميل';
        const href = `/bookings/${b.id}/workspace`;
        if (b.check_in_date && b.check_in_date >= from && b.check_in_date <= to)
          out.push({ id: `ci-${b.id}`, kind: 'checkin', date: b.check_in_date, title: `${name} — ${ref}`, href });
        if (b.check_out_date && b.check_out_date >= from && b.check_out_date <= to)
          out.push({ id: `co-${b.id}`, kind: 'checkout', date: b.check_out_date, title: `${name} — ${ref}`, href });
        if (b.travel_date && b.travel_date >= from && b.travel_date <= to)
          out.push({ id: `tr-${b.id}`, kind: b.booking_type === 'flight' ? 'flight' : 'departure', date: b.travel_date, title: `${name} — ${ref}`, href });
        if (b.return_date && b.return_date >= from && b.return_date <= to)
          out.push({ id: `rt-${b.id}`, kind: 'arrival', date: b.return_date, title: `${name} — ${ref}`, href });
      });

      (invoices.data ?? []).forEach((i: any) => {
        out.push({
          id: `inv-${i.id}`, kind: 'reminder', date: i.due_date,
          title: `فاتورة ${i.invoice_number} — ${i.customer_name || ''}`,
          amount: Number(i.total_amount || 0), currency: i.currency,
          href: i.booking_id ? `/bookings/${i.booking_id}/workspace` : `/invoices`,
        });
      });

      (payments.data ?? []).forEach((p: any) => {
        out.push({
          id: `pay-${p.id}`, kind: 'customer_payment', date: p.payment_date,
          title: `دفعة عميل`, amount: Number(p.amount || 0), currency: p.currency,
          href: p.booking_id ? `/bookings/${p.booking_id}/workspace` : `/bank-accounts`,
        });
      });

      (poRes.data ?? []).forEach((p: any) => {
        out.push({
          id: `spo-${p.id}`, kind: 'supplier_payment', date: p.due_date,
          title: `أمر دفع مورّد (${p.status || ''})`, amount: Number(p.amount || 0), currency: p.currency,
          href: p.booking_id ? `/bookings/${p.booking_id}/workspace` : `/suppliers`,
        });
      });

      (tasks.data ?? []).forEach((t: any) => {
        out.push({
          id: `task-${t.id}`, kind: 'task', date: t.due_date,
          title: t.title,
          href: t.booking_id ? `/bookings/${t.booking_id}/workspace` : `/operations/queue`,
        });
      });

      return out;
    },
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (!filters.has(e.kind)) continue;
      if (!e.date) continue;
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events, filters]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    if (view === 'day') { arr.push(new Date(cursor)); return arr; }
    if (view === 'week') {
      const start = new Date(cursor); start.setDate(start.getDate() - dayIndexFromJS(start.getDay()));
      for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); arr.push(d); }
      return arr;
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOff = dayIndexFromJS(first.getDay());
    const gridStart = new Date(first); gridStart.setDate(1 - startOff);
    for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); arr.push(d); }
    return arr;
  }, [cursor, view]);

  const shift = (dir: 1 | -1) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const toggleFilter = (k: EventKind) => {
    const next = new Set(filters);
    if (next.has(k)) next.delete(k); else next.add(k);
    setFilters(next);
  };

  const today = toISO(new Date());

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">تقويم السفر الموحّد</h1>
          <p className="text-sm text-muted-foreground">الوصولات، المغادرات، الفواتير، المدفوعات وأوامر الدفع في مكان واحد</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronRight className="w-4 h-4" /></Button>
          <div className="min-w-[140px] text-center font-medium">
            {view === 'month' ? `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}` : toISO(cursor)}
          </div>
          <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>اليوم</Button>
          <Tabs value={view} onValueChange={(v: any) => setView(v)}>
            <TabsList>
              <TabsTrigger value="day">يوم</TabsTrigger>
              <TabsTrigger value="week">أسبوع</TabsTrigger>
              <TabsTrigger value="month">شهر</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND_META) as EventKind[]).map((k) => {
          const M = KIND_META[k]; const Icon = M.icon;
          const active = filters.has(k);
          return (
            <button key={k}
              onClick={() => toggleFilter(k)}
              className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border', active ? M.color : 'bg-muted/30 text-muted-foreground border-transparent line-through')}>
              <Icon className="w-3 h-3" /> {M.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-3">
          {view === 'month' && (
            <>
              <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-2">
                {DAY_NAMES.map((n) => <div key={n} className="p-1">{n}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, idx) => {
                  const iso = toISO(d);
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const isToday = iso === today;
                  const dayEvents = eventsByDay.get(iso) ?? [];
                  return (
                    <div key={idx} className={cn('min-h-[110px] border rounded-md p-1.5 text-xs', !inMonth && 'bg-muted/30 opacity-60', isToday && 'ring-2 ring-primary')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('font-medium', isToday && 'text-primary')}>{d.getDate()}</span>
                        {dayEvents.length > 0 && <Badge variant="outline" className="h-4 text-[10px]">{dayEvents.length}</Badge>}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 4).map((e) => {
                          const M = KIND_META[e.kind];
                          return (
                            <button key={e.id} onClick={() => e.href && navigate(e.href)}
                              className={cn('w-full text-right truncate px-1.5 py-0.5 rounded border text-[10px]', M.color)}
                              title={e.title}>
                              {e.title}
                            </button>
                          );
                        })}
                        {dayEvents.length > 4 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 4} أخرى</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {(view === 'week' || view === 'day') && (
            <div className={cn('grid gap-2', view === 'week' ? 'grid-cols-7' : 'grid-cols-1')}>
              {days.map((d) => {
                const iso = toISO(d);
                const dayEvents = eventsByDay.get(iso) ?? [];
                const isToday = iso === today;
                return (
                  <div key={iso} className={cn('border rounded-md p-2 min-h-[200px]', isToday && 'ring-2 ring-primary')}>
                    <div className="text-sm font-medium mb-2">{DAY_NAMES[dayIndexFromJS(d.getDay())]} {d.getDate()}</div>
                    <div className="space-y-1">
                      {dayEvents.length === 0 && <div className="text-xs text-muted-foreground">لا توجد أحداث</div>}
                      {dayEvents.map((e) => {
                        const M = KIND_META[e.kind]; const Icon = M.icon;
                        return (
                          <button key={e.id} onClick={() => e.href && navigate(e.href)}
                            className={cn('w-full text-right px-2 py-1.5 rounded border text-xs flex items-center gap-1.5', M.color)}>
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate flex-1">{e.title}</span>
                            {e.amount != null && <span className="text-[10px] opacity-80">{e.amount.toLocaleString()} {e.currency || ''}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TravelCalendar;
