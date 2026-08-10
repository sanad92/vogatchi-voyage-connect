import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import LeadIntakeForm from '@/components/sop/LeadIntakeForm';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import { useSopLeads, useSopRealtime, type SopLead } from '@/hooks/useSop';
import { DEPARTMENT_LABELS, LEAD_STAGE_LABELS } from '@/lib/sop';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOrgMembers } from '@/hooks/useOrgMembers';

const SopIntake = () => {
  usePageTitle('استقبال العملاء — خدمة العملاء');
  useSopRealtime();
  const { members } = useOrgMembers();
  const [search, setSearch] = useState('');
  const { data: leads, isLoading } = useSopLeads({
    stages: ['new', 'qualified', 'assigned'],
    search: search || undefined,
  });
  const [editing, setEditing] = useState<SopLead | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">استقبال العملاء</h1>
          <p className="text-sm text-muted-foreground">
            خدمة العملاء تملك الملف من أول تواصل حتى الإسناد للمبيعات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="بحث بالاسم أو الهاتف أو الوجهة"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 ml-2" /> عميل محتمل جديد
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">الملفات المفتوحة</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">جاري التحميل…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>الوجهة</TableHead>
                    <TableHead>المرحلة</TableHead>
                    <TableHead>القسم المالك</TableHead>
                    <TableHead>المسؤول</TableHead>

                    <TableHead>المصدر</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leads || []).map((l) => (
                    <TableRow
                      key={l.id}
                      className={selected === l.id ? 'bg-muted/50 cursor-pointer' : 'cursor-pointer'}
                      onClick={() => setSelected(l.id)}
                    >
                      <TableCell className="font-medium">{l.contact_name || '—'}</TableCell>
                      <TableCell>{l.destination || l.city || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{LEAD_STAGE_LABELS[l.stage]}</Badge></TableCell>
                      <TableCell className="text-xs">{DEPARTMENT_LABELS[l.owner_department]}</TableCell>
                      <TableCell className="text-xs">
                        {l.current_owner_id ? (
                          members.find((m) => m.user_id === l.current_owner_id)?.profile?.full_name
                            || l.current_owner_id.slice(0, 8)
                        ) : (
                          <span className="text-muted-foreground">بانتظار التوزيع</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">{l.lead_source || '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(l); }}>
                          تعديل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!leads?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        لا توجد ملفات مفتوحة.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div>
          {selected ? (
            <SopLeadPanel leadId={selected} />
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">
              اختر ملفاً لعرض حالته والإجراء المطلوب.
            </CardContent></Card>
          )}
        </div>
      </div>

      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل بيانات الاستقبال' : 'عميل محتمل جديد'}</DialogTitle>
          </DialogHeader>
          <LeadIntakeForm
            lead={editing}
            onSaved={(l) => { setCreating(false); setEditing(null); setSelected(l.id); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SopIntake;
