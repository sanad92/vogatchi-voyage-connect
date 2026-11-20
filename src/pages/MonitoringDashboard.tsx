import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertTriangle, Bug, Gauge, Globe, Shield,
  CheckCircle2, XCircle, Clock, Search,
  RefreshCw, Loader2, TrendingUp, TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getMonitoringReadState } from '@/lib/monitoringReadState';

const severityConfig: Record<string, { color: string; icon: any }> = {
  warning: { color: 'text-yellow-600 bg-yellow-100', icon: AlertTriangle },
  error: { color: 'text-red-600 bg-red-100', icon: Bug },
  critical: { color: 'text-red-800 bg-red-200', icon: XCircle },
};

const MonitoringDashboard = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('errors');

  // Error logs
  const errorsRead = useQuery({
    queryKey: ['monitoring-errors', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Performance logs
  const perfRead = useQuery({
    queryKey: ['monitoring-performance', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_logs')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // API logs
  const apiRead = useQuery({
    queryKey: ['monitoring-api', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_logs')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Audit logs
  const auditRead = useQuery({
    queryKey: ['monitoring-audit', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // Resolve error mutation
  const resolveMutation = useMutation({
    mutationFn: async (errorId: string) => {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', errorId)
        .eq('organization_id', orgId!)
        .select('id').single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تعليم الخطأ كمحلول');
      queryClient.invalidateQueries({ queryKey: ['monitoring-errors', orgId] });
    },
    onError: () => toast.error('تعذّر تحديث حالة الخطأ'),
  });

  const refreshAll = async () => {
    if (!orgId) return;
    const results = await Promise.all([errorsRead.refetch(), perfRead.refetch(), apiRead.refetch(), auditRead.refetch()]);
    if (results.some(result => result.isError)) toast.error('تعذّر تحديث بعض سجلات المراقبة');
    else toast.success('تم تحديث البيانات');
  };

  const errors = errorsRead.data ?? [];
  const perfLogs = perfRead.data ?? [];
  const apiLogs = apiRead.data ?? [];
  const auditLogs = auditRead.data ?? [];
  const loadTimes = perfLogs.flatMap(row => row.load_time_ms == null ? [] : [row.load_time_ms]);
  const apiStatuses = apiLogs.flatMap(row => row.status_code == null ? [] : [row.status_code]);
  const unresolvedErrors = errors.filter(row => !row.resolved).length;
  const criticalErrors = errors.filter(row => row.severity === 'critical' && !row.resolved).length;
  const avgLoadTime = loadTimes.length ? Math.round(loadTimes.reduce((sum, duration) => sum + duration, 0) / loadTimes.length) : 0;
  const failedApis = apiStatuses.filter(status => status >= 400).length;
  const queryState = (read: { status: 'error' | 'pending' | 'success'; data?: unknown[] }) =>
    getMonitoringReadState(read.status, read.data?.length ?? 0);
  const refreshing = [errorsRead, perfRead, apiRead, auditRead].some(read => read.isFetching);

  const filterBySearch = (items: any[], fields: string[]) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) =>
      fields.some((f) => String(item[f] || '').toLowerCase().includes(term))
    );
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">مراقبة النظام</h1>
          <p className="text-muted-foreground mt-1">تتبع الأخطاء والأداء وسجل العمليات</p>
        </div>
        <Button variant="outline" onClick={() => void refreshAll()} disabled={!orgId || refreshing}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="أخطاء غير محلولة" state={queryState(errorsRead)} value={unresolvedErrors}
          icon={unresolvedErrors > 0 ? <Bug className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
          tone={unresolvedErrors > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}>
          {criticalErrors > 0 && <Badge variant="destructive" className="mt-2">{criticalErrors} حرجة</Badge>}
        </MetricCard>

        <MetricCard title="متوسط وقت التحميل" state={getMonitoringReadState(perfRead.status, loadTimes.length)}
          value={avgLoadTime} suffix=" ms" icon={<Gauge className="h-6 w-6" />}
          tone={avgLoadTime >= 3000 ? 'bg-red-100 text-red-600' : avgLoadTime >= 1500 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}>
          <div className="flex items-center gap-1 mt-2 text-sm">
            {avgLoadTime < 1500 ? (
              <><TrendingUp className="h-3 w-3 text-green-600" /><span className="text-green-600">ممتاز</span></>
            ) : avgLoadTime < 3000 ? (
              <><Clock className="h-3 w-3 text-yellow-600" /><span className="text-yellow-600">مقبول</span></>
            ) : (
              <><TrendingDown className="h-3 w-3 text-red-600" /><span className="text-red-600">بطيء</span></>
            )}
          </div>
        </MetricCard>

        <MetricCard title="طلبات API فاشلة" state={getMonitoringReadState(apiRead.status, apiStatuses.length)}
          value={failedApis} icon={<Globe className="h-6 w-6" />}
          tone={failedApis > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'} />

        <MetricCard title="سجلات التدقيق" state={queryState(auditRead)} value={auditLogs.length}
          icon={<Shield className="h-6 w-6" />} tone="bg-primary/10 text-primary" />
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="errors" className="gap-1.5">
            <Bug className="h-4 w-4" />
            الأخطاء
            {unresolvedErrors > 0 && <Badge variant="destructive" className="mr-1 h-5 px-1.5 text-xs">{unresolvedErrors}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <Gauge className="h-4 w-4" />
            الأداء
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5">
            <Globe className="h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Shield className="h-4 w-4" />
            التدقيق
          </TabsTrigger>
        </TabsList>

        {/* Errors Tab */}
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سجل الأخطاء</CardTitle>
            </CardHeader>
            <CardContent>
              {errorsRead.isError ? (
                <LogReadError retry={() => void errorsRead.refetch()} />
              ) : errorsRead.isPending ? (
                <div role="status" className="flex justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" /> جارٍ التحميل
                </div>
              ) : (
                <div className="space-y-3">
                  {filterBySearch(errors, ['error_message', 'component_name', 'url']).map((err: any) => {
                    const config = severityConfig[err.severity] || severityConfig.error;
                    const SevIcon = config.icon;
                    return (
                      <div key={err.id} className={`border border-border rounded-lg p-4 ${err.resolved ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                              <SevIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm truncate">{err.error_message}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">{err.error_type}</Badge>
                                {err.component_name && <Badge variant="secondary" className="text-xs">{err.component_name}</Badge>}
                                <span className="text-xs text-muted-foreground">
                                  {err.created_at ? format(new Date(err.created_at), 'dd/MM HH:mm', { locale: ar }) : ''}
                                </span>
                              </div>
                              {err.url && <p className="text-xs text-muted-foreground mt-1 truncate">{err.url}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {err.resolved ? (
                              <Badge className="bg-green-100 text-green-700">محلول</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resolveMutation.mutate(err.id)}
                                disabled={resolveMutation.isPending}
                              >
                                <CheckCircle2 className="h-3 w-3 ml-1" />
                                حل
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {errors.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bug className="h-10 w-10 mx-auto mb-2" />
                      لا توجد سجلات أخطاء
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سجل الأداء</CardTitle>
            </CardHeader>
            <CardContent>
              {perfRead.isError ? (
                <LogReadError retry={() => void perfRead.refetch()} />
              ) : perfRead.isPending ? (
                <div role="status" className="flex justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" /> جارٍ التحميل
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-right py-3 px-3 text-muted-foreground font-medium">الصفحة</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">التحميل</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">TTFB</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">FCP</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">LCP</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterBySearch(perfLogs, ['page_url']).map((p: any) => (
                        <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                          <td className="py-3 px-3 font-mono text-xs">{p.page_url}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={p.load_time_ms < 1500 ? 'default' : p.load_time_ms < 3000 ? 'secondary' : 'destructive'}>
                              {p.load_time_ms == null ? '—' : `${p.load_time_ms}ms`}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center text-foreground">{p.ttfb_ms ?? '-'}ms</td>
                          <td className="py-3 px-3 text-center text-foreground">{p.fcp_ms ?? '-'}ms</td>
                          <td className="py-3 px-3 text-center text-foreground">{p.lcp_ms ?? '-'}ms</td>
                          <td className="py-3 px-3 text-center text-muted-foreground text-xs">
                            {p.created_at ? format(new Date(p.created_at), 'dd/MM HH:mm') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {perfLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">لا توجد بيانات أداء بعد</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سجل طلبات API</CardTitle>
            </CardHeader>
            <CardContent>
              {apiRead.isError ? (
                <LogReadError retry={() => void apiRead.refetch()} />
              ) : apiRead.isPending ? (
                <div role="status" className="flex justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" /> جارٍ التحميل
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-right py-3 px-3 text-muted-foreground font-medium">الدالة</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">الطريقة</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">الحالة</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">الاستجابة</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterBySearch(apiLogs, ['function_name', 'error_message']).map((a: any) => (
                        <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                          <td className="py-3 px-3 font-mono text-xs">{a.function_name}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant="outline">{a.method}</Badge>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={a.status_code < 400 ? 'default' : 'destructive'}>
                              {a.status_code || '—'}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center text-foreground">{a.response_time_ms ?? '-'}ms</td>
                          <td className="py-3 px-3 text-center text-muted-foreground text-xs">
                            {a.created_at ? format(new Date(a.created_at), 'dd/MM HH:mm') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {apiLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">لا توجد سجلات API بعد</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سجل التدقيق</CardTitle>
            </CardHeader>
            <CardContent>
              {auditRead.isError ? (
                <LogReadError retry={() => void auditRead.refetch()} />
              ) : auditRead.isPending ? (
                <div role="status" className="flex justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" /> جارٍ التحميل
                </div>
              ) : (
                <div className="space-y-3">
                  {filterBySearch(auditLogs, ['action', 'target_table']).map((log: any) => (
                    <div key={log.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{log.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {log.target_table && <Badge variant="outline" className="text-xs">{log.target_table}</Badge>}
                              <span className="text-xs text-muted-foreground">
                                {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar }) : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-x-auto text-muted-foreground">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">لا توجد سجلات تدقيق بعد</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function MetricCard({ title, state, value, suffix, icon, tone, children }: {
  title: string;
  state: ReturnType<typeof getMonitoringReadState>;
  value: number;
  suffix?: string;
  icon: ReactNode;
  tone: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        {state === 'ready' ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-foreground">
                {value}{suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
              </p>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${tone}`}>{icon}</div>
            </div>
            {children}
          </>
        ) : state === 'error' ? (
          <p role="alert" className="text-sm text-destructive mt-2">تعذّر تحميل المؤشر</p>
        ) : state === 'loading' ? (
          <p role="status" className="text-sm text-muted-foreground mt-2">جارٍ التحميل</p>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">لا توجد بيانات</p>
        )}
      </CardContent>
    </Card>
  );
}

function LogReadError({ retry }: { retry: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <p role="alert" className="text-sm text-destructive">تعذّر تحميل السجل.</p>
      <Button variant="outline" size="sm" onClick={retry}>إعادة المحاولة</Button>
    </div>
  );
}

export default MonitoringDashboard;
