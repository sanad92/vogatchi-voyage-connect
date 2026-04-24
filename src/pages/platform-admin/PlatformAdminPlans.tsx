import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

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
  features: any;
}

const empty: Partial<Plan> = {
  name: '', name_ar: '', price_monthly: 0, price_yearly: 0,
  max_users: 5, max_bookings_per_month: 100, max_storage_mb: 500,
  duration_days: 30, is_active: true, features: [],
};

const PlatformAdminPlans = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);

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

  const save = useMutation({
    mutationFn: async (p: Partial<Plan>) => {
      const payload = {
        name: p.name!, name_ar: p.name_ar!,
        price_monthly: p.price_monthly ?? 0,
        price_yearly: p.price_yearly ?? 0,
        max_users: p.max_users ?? 5,
        max_bookings_per_month: p.max_bookings_per_month ?? 100,
        max_storage_mb: p.max_storage_mb ?? 500,
        duration_days: p.duration_days ?? 30,
        is_active: p.is_active ?? true,
        features: p.features ?? [],
      };
      if (p.id) {
        const { error } = await supabase.from('subscription_plans').update(payload).eq('id', p.id);
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
    },
    onError: (e: any) => toast.error(e?.message ?? 'فشل الحفظ'),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-amber-600" /> خطط الاشتراك
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة الخطط المتاحة للمؤسسات: الأسعار والحدود والميزات
          </p>
        </div>
        <Button onClick={() => setEditing(empty)} className="bg-gradient-to-r from-amber-500 to-orange-600">
          <Plus className="h-4 w-4 mr-2" /> إضافة خطة
        </Button>
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
                    <TableCell>{p.price_monthly} ر.س</TableCell>
                    <TableCell>{p.price_yearly} ر.س</TableCell>
                    <TableCell>{p.max_users}</TableCell>
                    <TableCell>{p.max_bookings_per_month}</TableCell>
                    <TableCell>{p.duration_days ?? '—'} يوم</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>
                        {p.is_active ? 'نشطة' : 'معطلة'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
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

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'تعديل خطة' : 'إضافة خطة جديدة'}</DialogTitle>
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
                <Label>السعر الشهري (ر.س)</Label>
                <Input type="number" value={editing.price_monthly ?? 0} onChange={e => setEditing({ ...editing, price_monthly: +e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>السعر السنوي (ر.س)</Label>
                <Input type="number" value={editing.price_yearly ?? 0} onChange={e => setEditing({ ...editing, price_yearly: +e.target.value })} />
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
              <div className="col-span-2 flex items-center gap-2 pt-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label>الخطة نشطة</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
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
