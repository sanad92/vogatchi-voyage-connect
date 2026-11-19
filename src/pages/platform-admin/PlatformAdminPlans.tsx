import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package, Plus, Pencil, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import PlatformSubscriptionDiscountCodes from '@/components/platform-admin/PlatformSubscriptionDiscountCodes';
import { CUSTOM_SUBSCRIPTION_PLAN_NAME, SUBSCRIPTION_FEATURE_LABELS } from '@/lib/planFeatures';

interface Plan {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_bookings_per_month: number;
  max_storage_mb: number;
  duration_days: number | null;
  is_active: boolean;
  features: string[];
}

const empty: Partial<Plan> = {
  name: '', name_ar: '', price_monthly: 2490, price_yearly: 24900,
  max_users: 5, max_bookings_per_month: 300, max_storage_mb: 5120,
  duration_days: 30, is_active: true, features: [],
};

const customPlan: Partial<Plan> = {
  ...empty, name: CUSTOM_SUBSCRIPTION_PLAN_NAME, name_ar: 'مخصصة', price_monthly: undefined, price_yearly: undefined, is_active: false,
};
const featureLabels = Object.entries(SUBSCRIPTION_FEATURE_LABELS);
const knownFeatures = new Set(featureLabels.map(([key]) => key));

const getErrorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error ? String(error.message) : 'فشل الحفظ';

const PlatformAdminPlans = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const selectedFeatures = Array.isArray(editing?.features) ? editing.features.filter(feature => typeof feature === 'string') : [];
  const allFeatures = selectedFeatures.includes('all_features');
  const setFeature = (key: string, checked: boolean) => {
    setEditing(plan => {
      if (!plan) return plan;
      const features = Array.isArray(plan.features) ? plan.features.filter(feature => typeof feature === 'string') : [];
      return { ...plan, features: checked ? [...new Set([...features, key])] : features.filter(feature => feature !== key) };
    });
  };

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans-admin'],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });
  const originalFeatures = plans.find(plan => plan.id === editing?.id)?.features;
  const featureOptions = [
    ...featureLabels,
    ...[...new Set([...selectedFeatures, ...(Array.isArray(originalFeatures) ? originalFeatures : [])])]
      .filter(key => typeof key === 'string' && key !== 'all_features' && !knownFeatures.has(key))
      .map(key => [key, key]),
  ];

  const save = useMutation({
    mutationFn: async (p: Partial<Plan>) => {
      const name = p.name?.trim();
      const nameAr = p.name_ar?.trim();
      if (!name || !nameAr) throw new Error('أدخل اسم الخطة بالعربية والإنجليزية.');
      if ((p.is_active ?? true) && ((p.price_monthly ?? 0) <= 0 || (p.price_yearly ?? 0) <= 0)) {
        throw new Error('لا يمكن تفعيل خطة مجانية. أدخل سعرًا شهريًا وسنويًا أكبر من صفر.');
      }
      const payload = {
        name, name_ar: nameAr,
        price_monthly: p.price_monthly ?? 0,
        price_yearly: p.price_yearly ?? 0,
        max_users: p.max_users ?? 5,
        max_bookings_per_month: p.max_bookings_per_month ?? 100,
        max_storage_mb: p.max_storage_mb ?? 500,
        duration_days: p.duration_days ?? 30,
        is_active: p.is_active ?? true,
        features: Array.isArray(p.features) ? [...new Set(p.features.filter(feature => typeof feature === 'string'))] : [],
      };
      if (p.id) {
        const { error } = await supabase.from('subscription_plans').update(payload).eq('id', p.id).select('id').single();
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscription_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('تم حفظ الخطة');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
      qc.invalidateQueries({ queryKey: ['platform-subs-plans'] });
      qc.invalidateQueries({ queryKey: ['pricing-plans'] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-amber-600" /> خطط الاشتراك
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة الخطط المتاحة للمؤسسات: الأسعار والحدود والميزات
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(customPlan)}>
            <SlidersHorizontal aria-hidden="true" /> إضافة خطة مخصصة
          </Button>
          <Button onClick={() => setEditing(empty)} className="bg-gradient-to-r from-amber-500 to-orange-600">
            <Plus aria-hidden="true" /> إضافة خطة
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">جميع الخطط ({plans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الخطة</TableHead>
                  <TableHead>الشهري</TableHead>
                  <TableHead>السنوي</TableHead>
                  <TableHead>المستخدمين</TableHead>
                  <TableHead>الحجوزات/شهر</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name_ar}</div>
                      <div className="text-xs text-muted-foreground">{p.name}</div>
                    </TableCell>
                    <TableCell>{p.price_monthly.toLocaleString('ar-EG')} ج.م</TableCell>
                    <TableCell>{p.price_yearly.toLocaleString('ar-EG')} ج.م</TableCell>
                    <TableCell>{p.max_users}</TableCell>
                    <TableCell>{p.max_bookings_per_month}</TableCell>
                    <TableCell>{p.duration_days ?? '—'} يوم</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>
                        {p.is_active ? 'نشطة' : 'معطلة'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" aria-label={`تعديل خطة ${p.name_ar || p.name}`} onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PlatformSubscriptionDiscountCodes />

      <Dialog open={!!editing} onOpenChange={o => !o && !save.isPending && setEditing(null)}>
        <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'تعديل خطة' : 'إضافة خطة جديدة'}</DialogTitle>
            <DialogDescription>حدد الأسعار وحدود الاستخدام والموديولات المتاحة في الخطة.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label>الاسم بالإنجليزية</Label>
                <Input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label>الاسم بالعربية</Label>
                <Input value={editing.name_ar ?? ''} onChange={e => setEditing({ ...editing, name_ar: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>السعر الشهري (ج.م)</Label>
                <Input type="number" min={0} step="0.01" value={editing.price_monthly ?? ''} onChange={e => setEditing({ ...editing, price_monthly: e.target.value === '' ? undefined : +e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>السعر السنوي (ج.م)</Label>
                <Input type="number" min={0} step="0.01" value={editing.price_yearly ?? ''} onChange={e => setEditing({ ...editing, price_yearly: e.target.value === '' ? undefined : +e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الحد الأقصى للمستخدمين</Label>
                <Input type="number" value={editing.max_users ?? 5} onChange={e => setEditing({ ...editing, max_users: +e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الحجوزات/شهر</Label>
                <Input type="number" value={editing.max_bookings_per_month ?? 100} onChange={e => setEditing({ ...editing, max_bookings_per_month: +e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>التخزين (MB)</Label>
                <Input type="number" value={editing.max_storage_mb ?? 500} onChange={e => setEditing({ ...editing, max_storage_mb: +e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>المدة (أيام)</Label>
                <Input type="number" value={editing.duration_days ?? 30} onChange={e => setEditing({ ...editing, duration_days: +e.target.value })} />
              </div>
              <fieldset className="col-span-2 space-y-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">موديولات الخطة</legend>
                <Label className="flex cursor-pointer items-center gap-2 rounded-md bg-muted/60 p-2">
                  <Checkbox checked={allFeatures} onCheckedChange={checked => setFeature('all_features', checked === true)} />
                  كل الموديولات
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {featureOptions.map(([key, label]) => (
                    <Label key={key} className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
                      <Checkbox checked={allFeatures || selectedFeatures.includes(key)} disabled={allFeatures}
                        onCheckedChange={checked => setFeature(key, checked === true)} />
                      <span data-no-translate={key === label ? true : undefined}>{label}</span>
                    </Label>
                  ))}
                </div>
              </fieldset>
              <div className="col-span-2 flex flex-wrap items-center gap-2 pt-2">
                <Switch id="plan-active" checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label htmlFor="plan-active">عرض الخطة في صفحة الأسعار</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={save.isPending} onClick={() => setEditing(null)}>إلغاء</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600">
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformAdminPlans;
