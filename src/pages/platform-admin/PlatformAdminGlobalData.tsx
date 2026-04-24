import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Plane, Building2, Loader2, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';

const PlatformAdminGlobalData = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: stats, refetch } = useQuery({
    queryKey: ['global-data-stats'],
    queryFn: async () => {
      const [airportsAll, airportsGlobal, airlinesAll, airlinesGlobal] = await Promise.all([
        supabase.from('airports').select('id', { count: 'exact', head: true }),
        supabase.from('airports').select('id', { count: 'exact', head: true }).eq('is_global', true),
        supabase.from('airlines').select('id', { count: 'exact', head: true }),
        supabase.from('airlines').select('id', { count: 'exact', head: true }).eq('is_global', true),
      ]);
      return {
        airportsTotal: airportsAll.count ?? 0,
        airportsGlobal: airportsGlobal.count ?? 0,
        airlinesTotal: airlinesAll.count ?? 0,
        airlinesGlobal: airlinesGlobal.count ?? 0,
      };
    },
  });

  const runImport = async (target: 'airports' | 'airlines' | 'all') => {
    setLoading(target);
    try {
      const { data, error } = await supabase.functions.invoke('seed-global-travel-data', {
        body: { target },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل الاستيراد');

      let msg = '✅ تم الاستيراد بنجاح:\n';
      if (data.airports) msg += `• المطارات: ${data.airports.inserted}/${data.airports.total}\n`;
      if (data.airlines) msg += `• شركات الطيران: ${data.airlines.inserted}/${data.airlines.total}`;
      toast.success(msg);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['airports'] });
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
    } catch (err: any) {
      console.error(err);
      toast.error(`فشل: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            البيانات العالمية للسفر
          </h1>
          <p className="text-muted-foreground mt-1">
            بيانات مرجعية مشتركة لكل المؤسسات (مطارات + شركات طيران من مصادر مفتوحة)
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث الإحصائيات
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المطارات</CardTitle>
            <Plane className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.airportsTotal.toLocaleString('ar-EG') ?? '—'}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">
                <Globe className="h-3 w-3 ml-1" />
                عالمي: {stats?.airportsGlobal.toLocaleString('ar-EG') ?? '—'}
              </Badge>
              <Badge variant="outline">
                مؤسسات: {((stats?.airportsTotal ?? 0) - (stats?.airportsGlobal ?? 0)).toLocaleString('ar-EG')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">شركات الطيران</CardTitle>
            <Building2 className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.airlinesTotal.toLocaleString('ar-EG') ?? '—'}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">
                <Globe className="h-3 w-3 ml-1" />
                عالمي: {stats?.airlinesGlobal.toLocaleString('ar-EG') ?? '—'}
              </Badge>
              <Badge variant="outline">
                مؤسسات: {((stats?.airlinesTotal ?? 0) - (stats?.airlinesGlobal ?? 0)).toLocaleString('ar-EG')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            استيراد / تحديث البيانات
          </CardTitle>
          <CardDescription>
            البيانات تُجلب من مصادر مفتوحة عالية الجودة. التشغيل آمن ولا يحدث تكرار (Upsert على IATA code).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              size="lg"
              onClick={() => runImport('airports')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'airports' ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Plane className="h-4 w-4 ml-2" />
              )}
              استيراد المطارات (~9,500)
            </Button>

            <Button
              size="lg"
              onClick={() => runImport('airlines')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'airlines' ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4 ml-2" />
              )}
              استيراد شركات الطيران (~1,200)
            </Button>

            <Button
              size="lg"
              variant="default"
              onClick={() => runImport('all')}
              disabled={loading !== null}
              className="w-full bg-gradient-to-r from-primary to-primary/80"
            >
              {loading === 'all' ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 ml-2" />
              )}
              استيراد الكل
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
            <p>📡 <strong>مصادر البيانات:</strong></p>
            <ul className="list-disc pr-5 space-y-0.5">
              <li>المطارات: <a href="https://ourairports.com" target="_blank" rel="noreferrer" className="underline">OurAirports.com</a> (مفتوح، تحديث يومي)</li>
              <li>شركات الطيران: <a href="https://openflights.org" target="_blank" rel="noreferrer" className="underline">OpenFlights.org</a> (مفتوح)</li>
            </ul>
            <p className="pt-2">⏱️ قد يستغرق الاستيراد الكامل من 30 ثانية إلى دقيقة.</p>
            <p>🛡️ البيانات العالمية مقروءة فقط لأعضاء المؤسسات (لا يمكن تعديلها أو حذفها).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAdminGlobalData;
