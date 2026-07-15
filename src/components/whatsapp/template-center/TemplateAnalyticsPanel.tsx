import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Send, CheckCheck, Eye } from 'lucide-react';
import { useWhatsAppTemplateCenter } from '@/hooks/useWhatsAppTemplateCenter';

export const TemplateAnalyticsPanel: React.FC = () => {
  const { analytics, templates } = useWhatsAppTemplateCenter();

  const totals = useMemo(() => {
    return analytics.reduce(
      (acc: any, r: any) => {
        acc.sent += r.sent_count || 0;
        acc.delivered += r.delivered_count || 0;
        acc.read += r.read_count || 0;
        acc.failed += r.failed_count || 0;
        return acc;
      },
      { sent: 0, delivered: 0, read: 0, failed: 0 },
    );
  }, [analytics]);

  const topTemplates = useMemo(() => {
    const map = new Map<string, number>();
    analytics.forEach((r: any) => {
      const k = `${r.template_name}|${r.template_language || ''}`;
      map.set(k, (map.get(k) || 0) + (r.sent_count || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => ({ name: k.split('|')[0], sent: v }));
  }, [analytics]);

  const stat = (label: string, val: number, icon: any, color: string) => {
    const Icon = icon;
    return (
      <div className="p-4 rounded-lg border bg-card">
        <div className={`inline-flex p-2 rounded-md ${color} mb-2`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-2xl font-bold">{val.toLocaleString('ar-EG')}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    );
  };

  const deliveryRate = totals.sent ? Math.round((totals.delivered / totals.sent) * 100) : 0;
  const readRate = totals.delivered ? Math.round((totals.read / totals.delivered) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          تحليلات القوالب — آخر 30 يوم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stat('مُرسَل', totals.sent, Send, 'bg-blue-500/10 text-blue-600')}
          {stat('مُستَلَم', totals.delivered, CheckCheck, 'bg-emerald-500/10 text-emerald-600')}
          {stat('مقروء', totals.read, Eye, 'bg-violet-500/10 text-violet-600')}
          {stat('فاشل', totals.failed, TrendingUp, 'bg-red-500/10 text-red-600')}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground">معدل التسليم</div>
            <div className="text-xl font-semibold">{deliveryRate}%</div>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground">معدل القراءة</div>
            <div className="text-xl font-semibold">{readRate}%</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">أعلى القوالب استخداماً</h4>
          {topTemplates.length ? (
            <div className="space-y-2">
              {topTemplates.map((t, i) => {
                const max = topTemplates[0].sent || 1;
                const pct = Math.round((t.sent / max) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{t.name}</span>
                      <span className="text-muted-foreground">{t.sent}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">
              لا توجد بيانات بعد — سترى الإحصائيات بعد إرسال أول قالب.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
