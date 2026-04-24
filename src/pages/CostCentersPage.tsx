import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useCostCenters, useCreateCostCenter, useCostCenterPnL } from '@/hooks/useCostCenters';

export default function CostCentersPage() {
  const { data: centers = [], isLoading } = useCostCenters();
  const create = useCreateCostCenter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', name_ar: '', description: '' });
  const [range, setRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const { data: pnl = [] } = useCostCenterPnL(range.start, range.end);

  const submit = async () => {
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ code: '', name: '', name_ar: '', description: '' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">مراكز التكلفة</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" />مركز جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مركز تكلفة</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>الكود</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>الاسم</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الاسم بالعربية</Label><Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
              <div><Label>الوصف</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={submit} disabled={create.isPending} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">القائمة</TabsTrigger>
          <TabsTrigger value="pnl">ربح/خسارة لكل مركز</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader><CardTitle>المراكز</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <p>جاري التحميل...</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>الكود</TableHead><TableHead>الاسم</TableHead>
                    <TableHead>الوصف</TableHead><TableHead>الحالة</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {centers.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono">{c.code}</TableCell>
                        <TableCell>{c.name_ar || c.name}</TableCell>
                        <TableCell>{c.description}</TableCell>
                        <TableCell>{c.is_active ? 'نشط' : 'موقوف'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl">
          <Card>
            <CardHeader><CardTitle>ربحية مراكز التكلفة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div><Label>من</Label><Input type="date" value={range.start} onChange={e => setRange({ ...range, start: e.target.value })} /></div>
                <div><Label>إلى</Label><Input type="date" value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} /></div>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>الكود</TableHead><TableHead>المركز</TableHead>
                  <TableHead className="text-left">الإيرادات</TableHead>
                  <TableHead className="text-left">المصروفات</TableHead>
                  <TableHead className="text-left">الربح</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pnl.map(r => (
                    <TableRow key={r.cost_center_id}>
                      <TableCell className="font-mono">{r.cost_center_code}</TableCell>
                      <TableCell>{r.cost_center_name}</TableCell>
                      <TableCell className="text-left text-green-600">{Number(r.revenue).toLocaleString()}</TableCell>
                      <TableCell className="text-left text-red-600">{Number(r.expenses).toLocaleString()}</TableCell>
                      <TableCell className={`text-left font-bold ${Number(r.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(r.profit).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
