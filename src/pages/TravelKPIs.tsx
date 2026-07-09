import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plane, TrendingUp, Percent, DollarSign, XCircle, Clock } from 'lucide-react';

const fmt = (n: number, d = 2) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n || 0));

const today = new Date();
const firstOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

export default function TravelKPIs() {
  const orgId = useOrgId();
  const [start, setStart] = useState(firstOfYear);
  const [end, setEnd] = useState(todayStr);

  const bookings = useQuery({
    queryKey: ['kpi-bookings', orgId, start, end],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from('bookings')
        .select('id, booking_type, status, selling_price, cost_price, currency, start_date, end_date, created_at, confirmed_at, customer_id')
        .eq('organization_id', orgId)
        .gte('start_date', start)
        .lte('start_date', end);
      return data || [];
    },
  });

  const kpis = useMemo(() => {
    const rows = bookings.data || [];
    const confirmed = rows.filter((b: any) => ['confirmed', 'completed', 'paid'].includes((b.status || '').toLowerCase()));
    const cancelled = rows.filter((b: any) => (b.status || '').toLowerCase() === 'cancelled');
    const revenue = confirmed.reduce((s: number, b: any) => s + Number(b.selling_price || 0), 0);
    const cost = confirmed.reduce((s: number, b: any) => s + Number(b.cost_price || 0), 0);
    const grossProfit = revenue - cost;
    const takeRate = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const cancellationRate = rows.length > 0 ? (cancelled.length / rows.length) * 100 : 0;

    // Hotel-specific: ADR = revenue / room nights
    const hotels = confirmed.filter((b: any) => b.booking_type === 'hotel');
    const hotelRevenue = hotels.reduce((s: number, b: any) => s + Number(b.selling_price || 0), 0);
    const roomNights = hotels.reduce((s: number, b: any) => {
      const sd = new Date(b.start_date); const ed = new Date(b.end_date || b.start_date);
      const nights = Math.max(1, Math.ceil((ed.getTime() - sd.getTime()) / 86400000));
      return s + nights;
    }, 0);
    const adr = roomNights > 0 ? hotelRevenue / roomNights : 0;

    // Lead time avg (days from created to start)
    const leadTimes = confirmed.map((b: any) => {
      const c = new Date(b.created_at); const s = new Date(b.start_date);
      return Math.max(0, Math.floor((s.getTime() - c.getTime()) / 86400000));
    });
    const avgLeadTime = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

    // By type
    const byType: Record<string, { count: number; revenue: number; profit: number }> = {};
    confirmed.forEach((b: any) => {
      const t = b.booking_type || 'other';
      if (!byType[t]) byType[t] = { count: 0, revenue: 0, profit: 0 };
      byType[t].count += 1;
      byType[t].revenue += Number(b.selling_price || 0);
      byType[t].profit += Number(b.selling_price || 0) - Number(b.cost_price || 0);
    });

    // Repeat customers
    const custCounts: Record<string, number> = {};
    confirmed.forEach((b: any) => { if (b.customer_id) custCounts[b.customer_id] = (custCounts[b.customer_id] || 0) + 1; });
    const totalCust = Object.keys(custCounts).length;
    const repeatCust = Object.values(custCounts).filter(v => v > 1).length;
    const repeatRate = totalCust > 0 ? (repeatCust / totalCust) * 100 : 0;

    return {
      total: rows.length, confirmed: confirmed.length, cancelled: cancelled.length,
      revenue, cost, grossProfit, takeRate, cancellationRate,
      adr, roomNights, avgLeadTime, byType, repeatRate, totalCust,
    };
  }, [bookings.data]);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Plane className="h-8 w-8 text-primary" />
          مؤشرات الأداء السياحية
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          مؤشرات خاصة بصناعة السفر: نسبة العمولة (Take-Rate)، متوسط الليلة (ADR)، معدل الإلغاء، ومدة التأكيد.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div className="space-y-1"><Label>إلى تاريخ</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={DollarSign} label="إجمالي الإيرادات المؤكدة" value={fmt(kpis.revenue)} />
        <KPI icon={TrendingUp} label="الربح الإجمالي" value={fmt(kpis.grossProfit)} tone="good" />
        <KPI icon={Percent} label="Take-Rate %" value={`${fmt(kpis.takeRate, 1)}%`} tone="good" />
        <KPI icon={XCircle} label="معدل الإلغاء %" value={`${fmt(kpis.cancellationRate, 1)}%`} tone={kpis.cancellationRate > 15 ? 'bad' : 'warn'} />
        <KPI icon={Plane} label="ADR (متوسط الليلة)" value={fmt(kpis.adr)} />
        <KPI icon={Plane} label="عدد ليالٍ فندقية" value={String(kpis.roomNights)} />
        <KPI icon={Clock} label="متوسط مدة التأكيد (يوم)" value={fmt(kpis.avgLeadTime, 0)} />
        <KPI icon={Percent} label="عملاء متكررون %" value={`${fmt(kpis.repeatRate, 1)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">الأداء حسب نوع الحجز</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>النوع</TableHead>
                <TableHead className="text-left">العدد</TableHead>
                <TableHead className="text-left">الإيرادات</TableHead>
                <TableHead className="text-left">الربح</TableHead>
                <TableHead className="text-left">الهامش %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(kpis.byType).map(([type, v]) => {
                const margin = v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0;
                return (
                  <TableRow key={type}>
                    <TableCell className="font-medium">{type}</TableCell>
                    <TableCell className="text-left font-mono">{v.count}</TableCell>
                    <TableCell className="text-left font-mono">{fmt(v.revenue)}</TableCell>
                    <TableCell className={`text-left font-mono ${v.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(v.profit)}</TableCell>
                    <TableCell className="text-left font-mono">{fmt(margin, 1)}%</TableCell>
                  </TableRow>
                );
              })}
              {Object.keys(kpis.byType).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">لا توجد بيانات ضمن الفترة.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const KPI = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) => {
  const color = tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : '';
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" />{label}</div>
      <div className={`text-lg font-bold font-mono mt-1 ${color}`}>{value}</div>
    </div>
  );
};
