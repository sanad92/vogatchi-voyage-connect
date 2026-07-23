import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { useBranches, useBranchMutations, Branch } from '@/hooks/useBranchesDepartments';

export default function BranchesPage() {
  const { data = [], isLoading } = useBranches();
  const { save, remove } = useBranchMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Branch>>({});

  const openNew = () => { setEditing({ is_active: true }); setOpen(true); };
  const openEdit = (b: Branch) => { setEditing(b); setOpen(true); };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> الفروع</h1>
          <p className="text-sm text-muted-foreground">إدارة فروع المؤسسة</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 ml-1" /> فرع جديد</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>الاسم</TableHead><TableHead>الرمز</TableHead><TableHead>الهاتف</TableHead>
            <TableHead>العنوان</TableHead><TableHead>الحالة</TableHead><TableHead className="text-left">إجراءات</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد فروع</TableCell></TableRow> :
              data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.code ?? '—'}</TableCell>
                  <TableCell>{b.phone ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate">{b.address ?? '—'}</TableCell>
                  <TableCell>{b.is_active ? <span className="text-green-600">نشط</span> : <span className="text-muted-foreground">معطّل</span>}</TableCell>
                  <TableCell className="text-left space-x-1 space-x-reverse">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm('حذف الفرع؟') && remove.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing.id ? 'تعديل فرع' : 'فرع جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>الرمز</Label><Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
            <div><Label>الهاتف</Label><Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div><Label>العنوان</Label><Input value={editing.address ?? ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => { save.mutate(editing as any, { onSuccess: () => setOpen(false) }); }} disabled={!editing.name || save.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
