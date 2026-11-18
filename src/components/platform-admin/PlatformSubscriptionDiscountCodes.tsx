import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, TicketPercent } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const queryKey = ['platform-subscription-discount-codes'];
const emptyForm = { code: '', percent: '25', duration: '12', expiresAt: '', organizationId: 'all' };
type Discount = Tables<'subscription_discount_codes'>;

const errorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error ? String(error.message) : 'تعذر حفظ كود الخصم';

export default function PlatformSubscriptionDiscountCodes() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const coupons = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_discount_codes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const organizations = useQuery({
    queryKey: ['platform-discount-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });
  const organizationNames = new Map(organizations.data?.map(({ id, name }) => [id, name]));

  const create = useMutation({
    mutationFn: async (coupon: TablesInsert<'subscription_discount_codes'>) => {
      const { error } = await supabase.from('subscription_discount_codes').insert(coupon);
      if (error) throw error;
    },
    onSuccess: async () => {
      setOpen(false);
      setForm(emptyForm);
      toast.success('تم إنشاء كود الخصم');
      await client.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const toggle = useMutation({
    mutationFn: async (coupon: Discount) => {
      const { error } = await supabase.from('subscription_discount_codes')
        .update({ is_active: !coupon.is_active }).eq('id', coupon.id).select('id').single();
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('تم تحديث حالة الكود');
      await client.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <TicketPercent className="h-5 w-5 text-primary" aria-hidden="true" /> أكواد خصم الاشتراك
        </CardTitle>
        <Button size="sm" onClick={() => { setForm(emptyForm); setOpen(true); }}>
          <Plus aria-hidden="true" /> إضافة كود خصم
        </Button>
      </CardHeader>
      <CardContent>
        {coupons.isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل الأكواد…</p>}
        {coupons.isError && <p role="alert" className="text-sm text-destructive">تعذر تحميل أكواد الخصم.</p>}
        {coupons.data?.length === 0 && <p className="text-sm text-muted-foreground">مفيش أكواد خصم لسه.</p>}
        {!!coupons.data?.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الخصم</TableHead>
                <TableHead>المدة بالشهور</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>آخر موعد للتفعيل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.data.map((coupon) => {
                const expired = coupon.expires_at !== null && Date.parse(coupon.expires_at) <= Date.now();
                return (
                  <TableRow key={coupon.id}>
                    <TableCell><bdi data-no-translate>{coupon.code}</bdi></TableCell>
                    <TableCell><bdi>{coupon.percent}%</bdi></TableCell>
                    <TableCell>{coupon.duration_months}</TableCell>
                    <TableCell>{coupon.organization_id ? organizationNames.get(coupon.organization_id) ?? 'شركة محددة' : 'كل الشركات'}</TableCell>
                    <TableCell>{coupon.expires_at ? new Date(coupon.expires_at).toLocaleString('ar-EG') : 'مفتوح'}</TableCell>
                    <TableCell>{expired ? 'منتهي' : coupon.is_active ? 'متاح' : 'موقوف'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" disabled={toggle.isPending || expired} onClick={() => toggle.mutate(coupon)}>
                        {coupon.is_active ? 'إيقاف' : 'إتاحة'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={(next) => { if (!create.isPending) setOpen(next); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة كود خصم</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            create.mutate({
              code: form.code.trim().toUpperCase(),
              percent: Number(form.percent),
              duration_months: Number(form.duration),
              expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
              organization_id: form.organizationId === 'all' ? null : form.organizationId,
            });
          }}>
            <div className="space-y-2">
              <Label htmlFor="discount-code-admin">الكود</Label>
              <Input id="discount-code-admin" dir="ltr" required maxLength={32} pattern="[A-Z0-9][A-Z0-9_\-]{2,31}"
                value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="discount-percent">نسبة الخصم (%)</Label>
                <Input id="discount-percent" type="number" required min={1} max={95}
                  value={form.percent} onChange={(event) => setForm({ ...form, percent: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-duration">المدة بالشهور</Label>
                <Input id="discount-duration" type="number" required min={1} max={24}
                  value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-organization">الشركة</Label>
              <Select dir="rtl" value={form.organizationId} onValueChange={(organizationId) => setForm({ ...form, organizationId })}>
                <SelectTrigger id="discount-organization"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الشركات</SelectItem>
                  {organizations.data?.map(({ id, name }) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              {organizations.isError && <p role="alert" className="text-sm text-destructive">تعذر تحميل الشركات.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-expires">آخر موعد للتفعيل (اختياري)</Label>
              <Input id="discount-expires" type="datetime-local" value={form.expiresAt}
                onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={create.isPending} onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={create.isPending}>حفظ الكود</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
