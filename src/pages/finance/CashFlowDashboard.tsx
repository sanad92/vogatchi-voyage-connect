import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useCashFlow } from '@/hooks/finance/useFinanceRpcs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CashFlowDashboard() {
  usePageTitle('التدفقات النقدية');
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(first.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const { data = [], isLoading } = useCashFlow(from, to);

  const totals = data.reduce((a, r) => ({
    incoming: a.incoming + Number(r.incoming || 0),
    outgoing: a.outgoing + Number(r.outgoing || 0),
    net: a.net + Number(r.net || 0),
  }), { incoming: 0, outgoing: 0, net: 0 });

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <PageHeader icon={TrendingUp} title="التدفقات النقدية" description="الوارد والصادر وصافي التدفق النقدي" />

      <Card>
        <CardContent className="pt-6 flex items-end gap-3 flex-wrap">
          <div><Label>من</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>إلى</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-1"><ArrowDownRight className="h-4 w-4 text-emerald-600" />الوارد</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{totals.incoming.toLocaleString('ar-EG')}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-1"><ArrowUpRight className="h-4 w-4 text-destructive" />الصادر</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{totals.outgoing.toLocaleString('ar-EG')}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">صافي التدفق</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{totals.net.toLocaleString('ar-EG')}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">حركة يومية</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">جارٍ التحميل…</div> :
            data.length === 0 ? <div className="py-8 text-center text-muted-foreground">لا توجد بيانات</div> :
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="incoming" stroke="#10b981" name="وارد" />
                  <Line type="monotone" dataKey="outgoing" stroke="#ef4444" name="صادر" />
                  <Line type="monotone" dataKey="net" stroke="#3b82f6" name="صافي" />
                </LineChart>
              </ResponsiveContainer>
            </div>}
        </CardContent>
      </Card>
    </div>
  );
}
