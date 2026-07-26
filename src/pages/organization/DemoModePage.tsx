import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Beaker, RefreshCcw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DEMO_TABLES = ['customers', 'bookings', 'invoices', 'customer_payments', 'suppliers', 'quotes'] as const;

const DemoModePage = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: counts, refetch, isLoading } = useQuery({
    queryKey: ['demo-counts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const out: Record<string, number> = {};
      for (const t of DEMO_TABLES) {
        const { count } = await (supabase as any)
          .from(t).select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId).eq('is_demo', true);
        out[t] = count ?? 0;
      }
      return out;
    },
  });

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  const handleReset = async () => {
    if (!orgId) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('reset_demo_data', { _org_id: orgId });
      if (error) throw error;
      toast.success('تمت إعادة تعيين بيانات العرض التوضيحي');
      await refetch();
      qc.invalidateQueries();
      console.log('reset_demo_data result', data);
    } catch (e: any) {
      toast.error('فشل: ' + (e?.message || 'خطأ'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Beaker className="w-6 h-6" /> وضع العرض التوضيحي</h1>
        <p className="text-sm text-muted-foreground">إدارة بيانات تجريبية آمنة معزولة عن البيانات الحقيقية</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> سجلات العرض التوضيحي في مؤسستك</CardTitle>
          <CardDescription>يتم وسم كل سجل تجريبي بعلامة <code>is_demo=true</code> — إعادة التعيين تحذفه فقط دون المساس بالبيانات الحقيقية.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p>جاري التحميل…</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DEMO_TABLES.map((t) => (
                <div key={t} className="border rounded-md p-3 flex items-center justify-between">
                  <span className="text-sm">{t}</span>
                  <Badge variant={counts?.[t] ? 'default' : 'outline'}>{counts?.[t] ?? 0}</Badge>
                </div>
              ))}
            </div>
          )}
          <div className="text-sm text-muted-foreground">إجمالي السجلات التجريبية: <strong>{total}</strong></div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4" /> منطقة خطرة</CardTitle>
          <CardDescription>سيتم حذف جميع السجلات المُعلَّمة كبيانات عرض توضيحي فقط. لا تُحذف البيانات الحقيقية أبدًا.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy || total === 0}>
                <RefreshCcw className="w-4 h-4 ml-2" /> إعادة تعيين بيانات العرض التوضيحي
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد إعادة التعيين</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف <strong>{total}</strong> سجلاً تجريبيًا من مؤسستك. البيانات الحقيقية لن تتأثر. هل أنت متأكد؟
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>نعم، احذف بيانات العرض التوضيحي</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoModePage;
