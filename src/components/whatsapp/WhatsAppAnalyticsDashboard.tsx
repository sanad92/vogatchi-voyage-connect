import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart3, MessageSquare, Users, AlertTriangle, TrendingUp, Download, Megaphone, Workflow, Loader2, Clock,
} from 'lucide-react';
import { useWhatsAppAnalytics } from '@/hooks/useWhatsAppAnalytics';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const exportCSV = (rows: any[], filename: string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
};

export const WhatsAppAnalyticsDashboard: React.FC = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useWhatsAppAnalytics({ days });

  if (isLoading || !data) {
    return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  const { kpis, timeSeries, statusDist, priorityDist, peakHours, leaderboard, broadcastStats, autoStats } = data;

  const kpiCards = [
    { label: 'إجمالي المحادثات', value: kpis.total_conversations, icon: MessageSquare, color: 'text-blue-500' },
    { label: 'محادثات نشطة', value: kpis.active_conversations, icon: Users, color: 'text-green-500' },
    { label: 'إجمالي الرسائل', value: kpis.total_messages, icon: TrendingUp, color: 'text-purple-500' },
    { label: 'خرق SLA', value: `${kpis.sla_breach_count} (${kpis.sla_breach_rate}%)`, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> تحليلات WhatsApp
          </h2>
          <p className="text-muted-foreground mt-1">مقاييس شاملة لأداء الفريق والمحادثات</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="60">آخر 60 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportCSV(leaderboard, `wa-agents-${format(new Date(), 'yyyy-MM-dd')}.csv`)}>
            <Download className="w-4 h-4 ml-1" /> تصدير CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className={`w-8 h-8 ${k.color}`} />
              <div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-bold">{k.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time Series */}
      <Card>
        <CardHeader><CardTitle>حركة الرسائل والمحادثات اليومية</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="inbound" name="واردة" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
              <Area type="monotone" dataKey="outbound" name="صادرة" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Area type="monotone" dataKey="conversations" name="محادثات جديدة" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>توزيع حالة المحادثات</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /> <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>توزيع الأولوية</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={priorityDist}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" /> <YAxis /> <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Peak hours */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4" /> ساعات الذروة</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis /> <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agent leaderboard */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> أداء الموظفين</CardTitle></CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">لا يوجد نشاط للموظفين في هذه الفترة</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الرسائل المُرسلة</TableHead>
                  <TableHead>المحادثات</TableHead>
                  <TableHead>متوسط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.slice(0, 10).map((a, i) => (
                  <TableRow key={a.agent_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={i === 0 ? 'default' : 'outline'}>#{i + 1}</Badge>
                        {a.name}
                      </div>
                    </TableCell>
                    <TableCell>{a.messages_sent}</TableCell>
                    <TableCell>{a.conversations_handled}</TableCell>
                    <TableCell>
                      {a.conversations_handled > 0
                        ? Math.round(a.messages_sent / a.conversations_handled)
                        : 0} رسالة/محادثة
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Broadcast + Automation stats */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="w-4 h-4" /> الحملات</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-muted-foreground">إجمالي الحملات</div><div className="text-xl font-bold">{broadcastStats.total}</div></div>
            <div><div className="text-muted-foreground">المستلمون</div><div className="text-xl font-bold">{broadcastStats.total_recipients}</div></div>
            <div><div className="text-muted-foreground">أُرسل بنجاح</div><div className="text-xl font-bold text-green-600">{broadcastStats.sent}</div></div>
            <div><div className="text-muted-foreground">فشل</div><div className="text-xl font-bold text-red-600">{broadcastStats.failed}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Workflow className="w-4 h-4" /> الأتمتة</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-muted-foreground">التنفيذات</div><div className="text-xl font-bold">{autoStats.total}</div></div>
            <div><div className="text-muted-foreground">نجحت</div><div className="text-xl font-bold text-green-600">{autoStats.success}</div></div>
            <div><div className="text-muted-foreground">فشلت</div><div className="text-xl font-bold text-red-600">{autoStats.failed}</div></div>
            <div><div className="text-muted-foreground">تخطّت</div><div className="text-xl font-bold text-muted-foreground">{autoStats.skipped}</div></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
