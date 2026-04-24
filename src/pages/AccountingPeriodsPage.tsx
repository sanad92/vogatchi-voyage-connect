import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Lock, Unlock } from 'lucide-react';
import { useAccountingPeriods, useCreatePeriod, useClosePeriod, useReopenPeriod } from '@/hooks/useAccountingPeriods';

export default function AccountingPeriodsPage() {
  const { data: periods = [], isLoading } = useAccountingPeriods();
  const create = useCreatePeriod();
  const close = useClosePeriod();
  const reopen = useReopenPeriod();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ period_name: '', start_date: '', end_date: '' });

  const submit = async () => {
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ period_name: '', start_date: '', end_date: '' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">الفترات المحاسبية</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" />فترة جديدة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إنشاء فترة محاسبية</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>اسم الفترة</Label><Input placeholder="مثال: يناير 2026" value={form.period_name} onChange={e => setForm({ ...form, period_name: e.target.value })} /></div>
              <div><Label>من</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>إلى</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              <Button onClick={submit} disabled={create.isPending} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الفترات</CardTitle>
          <p className="text-sm text-muted-foreground">إقفال الفترة يمنع إضافة/تعديل قيود في تواريخها — استخدم بحذر</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>جاري التحميل...</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الفترة</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead>
                <TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {periods.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.period_name}</TableCell>
                    <TableCell>{p.start_date}</TableCell>
                    <TableCell>{p.end_date}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'open' ? 'default' : p.status === 'closed' ? 'secondary' : 'destructive'}>
                        {p.status === 'open' ? 'مفتوحة' : p.status === 'closed' ? 'مقفلة' : 'مقفلة نهائياً'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === 'open' ? (
                        <Button size="sm" variant="outline" onClick={() => close.mutate(p.id)}>
                          <Lock className="h-3 w-3 ml-1" />إقفال
                        </Button>
                      ) : p.status === 'closed' ? (
                        <Button size="sm" variant="outline" onClick={() => reopen.mutate(p.id)}>
                          <Unlock className="h-3 w-3 ml-1" />إعادة فتح
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
