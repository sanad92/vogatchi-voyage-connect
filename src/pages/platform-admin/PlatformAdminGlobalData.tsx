import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Globe, Plane, Building2, Loader2, RefreshCw, Database, Hotel, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const HOTELS_FILE = 'tbo-hotels.csv';

const PlatformAdminGlobalData = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [hotelProgress, setHotelProgress] = useState<{ done: number; total: number; inserted: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: stats, refetch } = useQuery({
    queryKey: ['global-data-stats'],
    queryFn: async () => {
      const [airportsAll, airportsGlobal, airlinesAll, airlinesGlobal, hotelsAll, hotelsGlobal] = await Promise.all([
        supabase.from('airports').select('id', { count: 'exact', head: true }),
        supabase.from('airports').select('id', { count: 'exact', head: true }).eq('is_global', true),
        supabase.from('airlines').select('id', { count: 'exact', head: true }),
        supabase.from('airlines').select('id', { count: 'exact', head: true }).eq('is_global', true),
        supabase.from('hotels').select('id', { count: 'exact', head: true }),
        supabase.from('hotels').select('id', { count: 'exact', head: true }).eq('is_global', true),
      ]);
      return {
        airportsTotal: airportsAll.count ?? 0,
        airportsGlobal: airportsGlobal.count ?? 0,
        airlinesTotal: airlinesAll.count ?? 0,
        airlinesGlobal: airlinesGlobal.count ?? 0,
        hotelsTotal: hotelsAll.count ?? 0,
        hotelsGlobal: hotelsGlobal.count ?? 0,
      };
    },
  });

  // Travel data import (existing)
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

  // Hotels: upload CSV to storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('الملف يجب أن يكون بصيغة CSV');
      return;
    }
    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from('hotel-imports')
        .upload(HOTELS_FILE, file, { upsert: true, contentType: 'text/csv' });
      if (error) throw error;
      toast.success(`✅ تم رفع الملف (${(file.size / 1024 / 1024).toFixed(1)} MB). يمكنك الآن بدء الاستيراد.`);
    } catch (err: any) {
      toast.error(`فشل الرفع: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Hotels: run chunked import
  const runHotelsImport = async (reset = false) => {
    setLoading('hotels');
    setHotelProgress({ done: 0, total: 0, inserted: 0 });
    try {
      if (reset) {
        const { data, error } = await supabase.functions.invoke('seed-global-hotels', {
          body: { reset: true },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشل الحذف');
        toast.success('🗑️ تم حذف الفنادق العالمية القديمة');
      }

      let offset = 0;
      let totalInserted = 0;
      let totalRows = 0;
      let safetyCounter = 0;
      const MAX_ITERATIONS = 500; // safety cap

      while (safetyCounter < MAX_ITERATIONS) {
        safetyCounter++;
        const { data, error } = await supabase.functions.invoke('seed-global-hotels', {
          body: { file_path: HOTELS_FILE, offset, limit: 5000 },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشل الاستيراد');

        totalInserted += data.inserted ?? 0;
        totalRows = data.total_rows ?? totalRows;
        offset = data.next_offset ?? offset;
        setHotelProgress({ done: offset, total: totalRows, inserted: totalInserted });

        if (data.done) break;
      }

      toast.success(`✅ تم استيراد ${totalInserted.toLocaleString('ar-EG')} فندق من إجمالي ${totalRows.toLocaleString('ar-EG')}`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['hotels-combobox-global'] });
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
            بيانات مرجعية مشتركة لكل المؤسسات (مطارات + شركات طيران + فنادق)
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المطارات</CardTitle>
            <Plane className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.airportsTotal.toLocaleString('ar-EG') ?? '—'}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary"><Globe className="h-3 w-3 ml-1" />عالمي: {stats?.airportsGlobal.toLocaleString('ar-EG') ?? '—'}</Badge>
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
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary"><Globe className="h-3 w-3 ml-1" />عالمي: {stats?.airlinesGlobal.toLocaleString('ar-EG') ?? '—'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الفنادق</CardTitle>
            <Hotel className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.hotelsTotal.toLocaleString('ar-EG') ?? '—'}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary"><Globe className="h-3 w-3 ml-1" />عالمي: {stats?.hotelsGlobal.toLocaleString('ar-EG') ?? '—'}</Badge>
              <Badge variant="outline">مؤسسات: {((stats?.hotelsTotal ?? 0) - (stats?.hotelsGlobal ?? 0)).toLocaleString('ar-EG')}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Travel data import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            مطارات وشركات طيران
          </CardTitle>
          <CardDescription>
            بيانات OurAirports + OpenFlights — تشغيل آمن بدون تكرار
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button size="lg" onClick={() => runImport('airports')} disabled={loading !== null}>
              {loading === 'airports' ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Plane className="h-4 w-4 ml-2" />}
              استيراد المطارات
            </Button>
            <Button size="lg" onClick={() => runImport('airlines')} disabled={loading !== null}>
              {loading === 'airlines' ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Building2 className="h-4 w-4 ml-2" />}
              استيراد شركات الطيران
            </Button>
            <Button size="lg" onClick={() => runImport('all')} disabled={loading !== null}
              className="bg-gradient-to-r from-primary to-primary/80">
              {loading === 'all' ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Globe className="h-4 w-4 ml-2" />}
              استيراد الكل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hotels import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-amber-500" />
            الفنادق العالمية (TBO Dataset)
          </CardTitle>
          <CardDescription>
            ارفع ملف CSV من Kaggle (raj713335/tbo-hotels-dataset) ثم اضغط استيراد. يتم على دفعات 5000 فندق.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold">الخطوة 1: رفع ملف CSV</div>
            <div className="flex gap-2 items-center flex-wrap">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                disabled={uploading || loading !== null}
                className="max-w-md"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            <div className="text-xs text-muted-foreground">
              نزّل الملف من <a href="https://www.kaggle.com/datasets/raj713335/tbo-hotels-dataset" target="_blank" rel="noreferrer" className="underline text-primary">Kaggle</a> وارفعه هنا. الحجم المتوقع ~200MB.
            </div>
          </div>

          <div className="bg-muted/40 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold">الخطوة 2: تشغيل الاستيراد</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                size="lg"
                onClick={() => runHotelsImport(false)}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'hotels' ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Upload className="h-4 w-4 ml-2" />}
                بدء الاستيراد
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  if (confirm('سيتم حذف كل الفنادق العالمية ثم إعادة الاستيراد. متابعة؟')) {
                    runHotelsImport(true);
                  }
                }}
                disabled={loading !== null}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف وإعادة الاستيراد
              </Button>
            </div>

            {hotelProgress && hotelProgress.total > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{hotelProgress.done.toLocaleString('ar-EG')} / {hotelProgress.total.toLocaleString('ar-EG')}</span>
                  <span>{Math.round((hotelProgress.done / hotelProgress.total) * 100)}%</span>
                </div>
                <Progress value={(hotelProgress.done / hotelProgress.total) * 100} />
                <div className="text-xs text-muted-foreground">
                  تم إدراج {hotelProgress.inserted.toLocaleString('ar-EG')} فندق جديد حتى الآن...
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>📋 <strong>الأعمدة المتوقعة في CSV:</strong> HotelName, HotelCode, CityName, CountryName, CountryCode, HotelRating, Address, Latitude, Longitude</p>
            <p>⏱️ الاستيراد الكامل (~1M فندق) قد يستغرق 5-15 دقيقة. لا تغلق الصفحة.</p>
            <p>🛡️ الفنادق العالمية مقروءة فقط لأعضاء المؤسسات.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAdminGlobalData;
