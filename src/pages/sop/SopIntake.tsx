import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HandCoins, Plus, CalendarClock } from 'lucide-react';
import LeadIntakeForm from '@/components/sop/LeadIntakeForm';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import MySopStatusBar from '@/components/sop/MySopStatusBar';
import { useClaimLead, useSopLeads, useSopRealtime, type SopLead } from '@/hooks/useSop';
import { DEPARTMENT_LABELS, LEAD_STAGE_LABELS } from '@/lib/sop';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { formatDate } from '@/lib/utils';

const daysUntil = (dateStr: string | null) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const ArrivalBadge = ({ lead }: { lead: SopLead }) => {
  const diff = daysUntil(lead.check_in);
  if (diff === null) {
    return lead.approx_dates ? (
      <span className="text-xs text-muted-foreground">{lead.approx_dates}</span>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }
  if (diff < 0) {
    return <Badge variant="outline">انتهى</Badge>;
  }
  if (diff <= 7) {
    return <Badge variant="destructive">عاجل ({diff} يوم)</Badge>;
  }
  if (diff <= 30) {
    return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">قريب ({diff} يوم)</Badge>;
  }
  return <Badge variant="secondary">{formatDate(lead.check_in!)}</Badge>;
};

const SopIntake = () => {
  usePageTitle('استقبال العملاء — خدمة العملاء');
  useSopRealtime();
  const { members } = useOrgMembers();
  const claim = useClaimLead();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'arrival_asc' | 'arrival_desc' | 'updated_at'>('arrival_asc');
  const { data: leads, isLoading } = useSopLeads({
    stages: ['new', 'qualified', 'assigned'],
    search: search || undefined,
    sortBy,
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
            خدمة العملاء تستقبل الملف — وموظف المبيعات يستلمه بنفسه من هنا
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="بحث بالاسم أو الهاتف أو الوجهة"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as typeof sortBy)}
          >
            <SelectTrigger className="w-44">
              <CalendarClock className="h-4 w-4 ml-2 text-muted-foreground" />
              <SelectValue placeholder="الترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arrival_asc">الأقرب أولاً</SelectItem>
              <SelectItem value="arrival_desc">الأحدث أولاً</SelectItem>
              <SelectItem value="updated_at">آخر تحديث</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 ml-2" /> عميل محتمل جديد
          </Button>
        </div>
      </header>

      <MySopStatusBar department="sales" />



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
                    <TableHead>تاريخ الوصول</TableHead>
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
                      <TableCell>
                        <ArrivalBadge lead={l} />
                      </TableCell>
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
                        <div className="flex items-center gap-1 justify-end">
                          {!l.current_owner_id && l.stage === 'new' && (
                            <Button
                              size="sm"
                              disabled={claim.isPending}
                              onClick={(e) => { e.stopPropagation(); setSelected(l.id); claim.mutate(l.id); }}
                            >
                              <HandCoins className="h-3.5 w-3.5 ml-1" /> استلم العميل
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(l); }}>
                            تعديل
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!leads?.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
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
