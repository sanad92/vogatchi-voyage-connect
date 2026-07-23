import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, GitBranch } from 'lucide-react';
import { useDepartments, useDepartmentMutations, useBranches, Department } from '@/hooks/useBranchesDepartments';

export default function DepartmentsPage() {
  const { data = [], isLoading } = useDepartments();
  const { data: branches = [] } = useBranches();
  const { save, remove } = useDepartmentMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Department>>({});

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6" /> الإدارات</h1>
          <p className="text-sm text-muted-foreground">إدارة الأقسام والإدارات</p>
        </div>
        <Button onClick={() => { setEditing({ is_active: true }); setOpen(true); }}><Plus className="h-4 w-4 ml-1" /> إدارة جديدة</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>الاسم</TableHead><TableHead>الرمز</TableHead><TableHead>الفرع</TableHead>
            <TableHead>الحالة</TableHead><TableHead className="text-left">إجراءات</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جارٍ التحميل...</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد إدارات</TableCell></TableRow> :
              data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.code ?? '—'}</TableCell>
                  <TableCell>{branches.find((b) => b.id === d.branch_id)?.name ?? '—'}</TableCell>
                  <TableCell>{d.is_active ? <span className="text-green-600">نشط</span> : <span className="text-muted-foreground">معطّل</span>}</TableCell>
                  <TableCell className="text-left space-x-1 space-x-reverse">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm('حذف؟') && remove.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing.id ? 'تعديل إدارة' : 'إدارة جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>الرمز</Label><Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
            <div>
              <Label>الفرع (اختياري)</Label>
              <Select value={editing.branch_id ?? 'none'} onValueChange={(v) => setEditing({ ...editing, branch_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— لا يوجد —</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => save.mutate(editing as any, { onSuccess: () => setOpen(false) })} disabled={!editing.name || save.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
