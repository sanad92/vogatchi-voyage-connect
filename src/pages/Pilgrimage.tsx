import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Moon, Plus, Users, ArrowRight, Pencil, Wallet, FileText, Printer, FileSpreadsheet, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrganization } from '@/contexts/OrganizationContext';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  ROOM, money as fmt, printDocument, table, receiptHtml, contractHtml, manifestRows, MANIFEST_HEADERS, exportExcel, roomIssues,
} from '@/components/pilgrimage/pilgrimage-documents';

const VISA: Record<string, string> = { not_started: 'لم تبدأ', submitted: 'مقدمة', issued: 'صادرة', rejected: 'مرفوضة' };
const PILGRIM_STATUS: Record<string, string> = {
  registered: 'مسجل', documents_pending: 'نواقص مستندات', visa_processing: 'إجراءات التأشيرة',
  ready: 'جاهز للسفر', traveled: 'مسافر', completed: 'مكتمل', cancelled: 'ملغي',
};
const PROGRAM_STATUS: Record<string, string> = {
  draft: 'مسودة', open: 'التسجيل مفتوح', full: 'مكتمل العدد', closed: 'مغلق', departed: 'غادر', completed: 'انتهى', cancelled: 'ملغي',
};
const PROGRAM_FIELDS = ['name', 'season', 'departure_date', 'return_date', 'makkah_hotel', 'makkah_nights', 'madinah_hotel', 'madinah_nights',
  'airline', 'flight_details', 'transport_details', 'capacity', 'price_quad', 'price_triple', 'price_double', 'price_single', 'notes', 'terms', 'status'];
const PILGRIM_FIELDS = ['full_name', 'name_en', 'phone', 'gender', 'birth_date', 'nationality', 'national_id', 'passport_number', 'passport_expiry',
  'mahram_name', 'mahram_relation', 'room_type', 'room_group', 'visa_number', 'portal_barcode', 'makkah_room', 'madinah_room', 'bus_number', 'supervisor', 'notes'];

const EMPTY_PROGRAM: any = {
  name: '', season: '', departure_date: '', return_date: '', makkah_hotel: '', makkah_nights: 0,
  madinah_hotel: '', madinah_nights: 0, airline: '', flight_details: '', transport_details: '', capacity: 0,
  price_quad: 0, price_triple: 0, price_double: 0, price_single: 0, notes: '', terms: '', status: 'open', cost_per_person: 0,
};
const EMPTY_PILGRIM: any = {
  full_name: '', name_en: '', phone: '', gender: 'male', birth_date: '', nationality: 'مصري', national_id: '',
  passport_number: '', passport_expiry: '', mahram_name: '', mahram_relation: '', room_type: 'quad', room_group: '',
  visa_number: '', portal_barcode: '', makkah_room: '', madinah_room: '', bus_number: '', supervisor: '', notes: '',
};
const pick = (o: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o[k] === '' && /date|expiry/.test(k) ? null : o[k] ?? null]));

const F = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <div className={wide ? 'sm:col-span-2' : ''}><Label>{label}</Label>{children}</div>
);

const Pilgrimage = () => {
  const orgId = useOrgId();
  const { orgRole, currentOrganization } = useOrganization();
  const canManage = ['owner', 'admin', 'manager'].includes(orgRole ?? '');
  const qc = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<'umrah' | 'hajj'>('umrah');
  const [programId, setProgramId] = useState<string | null>(null);
  const [programOpen, setProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(false);
  const [pilgrimOpen, setPilgrimOpen] = useState(false);
  const [editingPilgrim, setEditingPilgrim] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<any>(null);
  const [cancelFor, setCancelFor] = useState<any>(null);
  const [fee, setFee] = useState(0);
  const [pay, setPay] = useState({ amount: 0, method: 'cash', treasury: '', reference: '', date: new Date().toISOString().slice(0, 10) });
  const [pf, setPf] = useState<any>({ ...EMPTY_PROGRAM });
  const [gf, setGf] = useState<any>({ ...EMPTY_PILGRIM });

  const fail = (e: any) => toast({ title: 'تعذر الحفظ', description: e.message, variant: 'destructive' });
  const sb = supabase as any;
  const refresh = () => ['pilgrimage-programs', 'pilgrims', 'pilgrimage-costs', 'pilgrim-payments'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const q = (key: string, fn: () => any, enabled = true) => useQuery({
    queryKey: [key, orgId], enabled: !!orgId && enabled,
    queryFn: async () => { const { data, error } = await fn(); if (error) throw error; return (data ?? []) as any[]; },
  });
  const { data: programs = [] } = q('pilgrimage-programs', () => sb.from('pilgrimage_programs').select('*').eq('organization_id', orgId).order('departure_date', { ascending: true, nullsFirst: false }));
  const { data: pilgrims = [] } = q('pilgrims', () => sb.from('pilgrims').select('*').eq('organization_id', orgId).order('created_at'));
  const { data: costs = [] } = q('pilgrimage-costs', () => sb.from('pilgrimage_program_costs').select('*').eq('organization_id', orgId), canManage);
  const { data: payments = [] } = q('pilgrim-payments', () => sb.from('customer_payments').select('*').eq('organization_id', orgId).not('pilgrim_id', 'is', null).order('created_at'));
  const { data: treasuries = [] } = q('pilgrim-treasuries', () => sb.from('bank_accounts').select('id,account_name,bank_name,currency,treasury_kind').eq('organization_id', orgId).eq('is_active', true));

  const program = programs.find((p) => p.id === programId) ?? null;
  const list = programs.filter((p) => p.program_type === type);
  const programPilgrims = useMemo(() => pilgrims.filter((g) => g.program_id === programId), [pilgrims, programId]);
  const priceFor = (p: any, room: string) => Number(p?.[`price_${room}`] ?? 0);

  const saveProgram = useMutation({
    mutationFn: async () => {
      const row: any = pick(pf, PROGRAM_FIELDS);
      let id = programId;
      if (editingProgram && id) {
        const { error } = await sb.from('pilgrimage_programs').update(row).eq('id', id).eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from('pilgrimage_programs').insert({ ...row, organization_id: orgId, program_type: type }).select('id').single();
        if (error) throw error;
        id = data.id;
      }
      if (canManage && Number(pf.cost_per_person) > 0) {
        const existing = costs.find((c) => c.program_id === id);
        const { error } = existing
          ? await sb.from('pilgrimage_program_costs').update({ cost_per_person: pf.cost_per_person }).eq('id', existing.id)
          : await sb.from('pilgrimage_program_costs').insert({ program_id: id, organization_id: orgId, cost_per_person: pf.cost_per_person });
        if (error) throw error;
      }
    },
    onSuccess: () => { setProgramOpen(false); refresh(); toast({ title: editingProgram ? 'تم تحديث البرنامج' : 'تم إنشاء البرنامج' }); },
    onError: fail,
  });

  /** Links the pilgrim to an existing customer (same phone) or creates one in the customer directory. */
  const linkCustomer = async () => {
    const digits = (gf.phone || '').replace(/\D/g, '');
    if (digits.length >= 8) {
      const { data } = await sb.from('customers').select('id,phone').eq('organization_id', orgId).ilike('phone', `%${digits.slice(-9)}%`).limit(1);
      if (data?.[0]) return data[0].id;
    }
    const { data, error } = await sb.from('customers').insert({
      organization_id: orgId, name: gf.full_name, phone: gf.phone || null, nationality: gf.nationality || null, passport_number: gf.passport_number || null,
    }).select('id').single();
    if (error) throw error;
    return data.id;
  };

  const savePilgrim = useMutation({
    mutationFn: async () => {
      const row: any = pick(gf, PILGRIM_FIELDS);
      row.total_price = priceFor(program, gf.room_type);
      if (editingPilgrim) {
        const { error } = await sb.from('pilgrims').update(row).eq('id', editingPilgrim).eq('organization_id', orgId);
        if (error) throw error;
        return;
      }
      if (programPilgrims.filter((g) => g.status !== 'cancelled').length >= (program?.capacity || Infinity)) throw new Error('البرنامج مكتمل العدد');
      const customer_id = await linkCustomer();
      const { error } = await sb.from('pilgrims').insert({ ...row, customer_id, organization_id: orgId, program_id: programId });
      if (error) throw error;
    },
    onSuccess: () => { setPilgrimOpen(false); refresh(); toast({ title: editingPilgrim ? 'تم التحديث' : 'تمت الإضافة وربطه بملف العميل' }); },
    onError: fail,
  });

  const patchPilgrim = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await sb.from('pilgrims').update(patch).eq('id', id).eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail,
  });

  const collect = useMutation({
    mutationFn: async () => {
      const g = payFor;
      const remaining = Math.max(0, g.total_price - g.paid_amount);
      if (pay.amount <= 0 || pay.amount > remaining) throw new Error(`المبلغ يجب أن يكون بين 1 و ${remaining}`);
      if (pay.method !== 'cash' && !pay.treasury) throw new Error('اختر الخزينة أو الحساب البنكي');
      const { data, error } = await sb.from('customer_payments').insert({
        organization_id: orgId, pilgrim_id: g.id, customer_id: g.customer_id, amount: pay.amount, amount_base: pay.amount,
        currency: program.currency || 'EGP', payment_method: pay.method, treasury_account_id: pay.treasury || null,
        reference_number: pay.reference || null, payment_date: pay.date, notes: `${program.name} · ${g.full_name}`, status: 'completed',
      }).select('*').single();
      if (error) throw error;
      return { p: data, g: { ...g, paid_amount: Number(g.paid_amount) + Number(pay.amount) } };
    },
    onSuccess: ({ p, g }) => {
      setPayFor(null); refresh(); toast({ title: 'تم تسجيل سند القبض وترحيله للخزينة' });
      printDocument(currentOrganization, 'سند قبض', receiptHtml(p, g, program));
    },
    onError: fail,
  });

  const label = type === 'hajj' ? 'الحاج' : 'المعتمر';
  const passportWarning = (g: any) => {
    if (!g.passport_expiry || !program?.return_date) return false;
    const limit = new Date(program.return_date); limit.setMonth(limit.getMonth() + 6);
    return new Date(g.passport_expiry) < limit;
  };

  // ===== Program detail =====
  if (program) {
    const active = programPilgrims.filter((g) => g.status !== 'cancelled');
    const total = active.reduce((s, g) => s + Number(g.total_price), 0) + programPilgrims.filter((g) => g.status === 'cancelled').reduce((s, g) => s + Number(g.cancellation_fee), 0);
    const paid = programPilgrims.reduce((s, g) => s + Number(g.paid_amount), 0);
    const cost = costs.find((c) => c.program_id === program.id);
    const groupBy = (key: string) => {
      const m = new Map<string, any[]>();
      active.forEach((g) => { const k = g[key] || 'غير مسكّن'; m.set(k, [...(m.get(k) ?? []), g]); });
      return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'ar', { numeric: true }));
    };
    const roomingRows = (key: string) => groupBy(key).flatMap(([room, occ]) => occ.map((g) => [room, g.full_name, g.gender === 'female' ? 'أنثى' : 'ذكر', ROOM[g.room_type], g.room_group || '', g.mahram_name || '']));
    const busRows = groupBy('bus_number').flatMap(([bus, occ]) => occ.map((g) => [bus, g.supervisor || '', g.full_name, g.phone || '']));

    const openEditPilgrim = (g: any) => { setEditingPilgrim(g.id); setGf({ ...EMPTY_PILGRIM, ...Object.fromEntries(PILGRIM_FIELDS.map((k) => [k, g[k] ?? ''])) }); setPilgrimOpen(true); };

    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setProgramId(null)}><ArrowRight className="h-4 w-4 me-1 rtl:rotate-0 ltr:rotate-180" />كل البرامج</Button>
        <PageHeader
          title={program.name}
          description={`${program.program_type === 'hajj' ? 'حج' : 'عمرة'} · ${program.departure_date ?? '—'} ← ${program.return_date ?? '—'} · مكة ${program.makkah_nights} ليالٍ · المدينة ${program.madinah_nights} ليالٍ`}
          icon={Moon}
          badge={<Badge variant="outline">{PROGRAM_STATUS[program.status]}</Badge>}
          actions={<div className="flex gap-2">
            {canManage && <Button variant="outline" onClick={() => { setEditingProgram(true); setPf({ ...EMPTY_PROGRAM, ...Object.fromEntries(PROGRAM_FIELDS.map((k) => [k, program[k] ?? ''])), cost_per_person: cost?.cost_per_person ?? 0 }); setProgramOpen(true); }}><Pencil className="h-4 w-4 me-1" />تعديل البرنامج</Button>}
            <Button onClick={() => { setEditingPilgrim(null); setGf({ ...EMPTY_PILGRIM }); setPilgrimOpen(true); }}><Plus className="h-4 w-4 me-1" />إضافة {label}</Button>
          </div>}
        />
        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-muted-foreground">المسجلون / السعة</p><p className="text-2xl font-semibold">{active.length} / {program.capacity || '∞'}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">إجمالي المبيعات</p><p className="text-xl font-semibold">{fmt(total, program.currency)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">المحصل</p><p className="text-xl font-semibold">{fmt(paid, program.currency)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">المتبقي</p><p className="text-xl font-semibold">{fmt(Math.max(0, total - paid), program.currency)}</p></Card>
        </div>
        {canManage && cost && (
          <Card className="p-4 text-sm">
            <span className="text-muted-foreground">للإدارة فقط · التكلفة للفرد: </span>{fmt(cost.cost_per_person, program.currency)}
            <span className="text-muted-foreground ms-4">الربح التقديري: </span>{fmt(total - cost.cost_per_person * active.length, program.currency)}
          </Card>
        )}

        <Tabs defaultValue="pilgrims">
          <TabsList><TabsTrigger value="pilgrims">المسجلون</TabsTrigger><TabsTrigger value="rooming">التسكين</TabsTrigger><TabsTrigger value="payments">التحصيل</TabsTrigger><TabsTrigger value="reports">الكشوفات</TabsTrigger></TabsList>

          <TabsContent value="pilgrims">
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>الاسم</TableHead><TableHead>الهاتف</TableHead><TableHead>الجواز</TableHead><TableHead>الغرفة</TableHead>
                  <TableHead>التأشيرة</TableHead><TableHead>الحالة</TableHead><TableHead>السعر</TableHead><TableHead>المدفوع</TableHead><TableHead>المتبقي</TableHead><TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {programPilgrims.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">لا يوجد مسجلون بعد.</TableCell></TableRow>}
                  {programPilgrims.map((g) => {
                    const cancelled = g.status === 'cancelled';
                    const due = cancelled ? Number(g.cancellation_fee) : Number(g.total_price);
                    return (
                      <TableRow key={g.id} className={cancelled ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{g.full_name}{g.mahram_name && <p className="text-xs text-muted-foreground">المحرم: {g.mahram_name} ({g.mahram_relation})</p>}</TableCell>
                        <TableCell dir="ltr">{g.phone}</TableCell>
                        <TableCell>
                          {g.passport_number || <span className="text-destructive text-xs">ناقص</span>}
                          {passportWarning(g) && <p className="text-xs text-destructive">الصلاحية أقل من 6 أشهر</p>}
                        </TableCell>
                        <TableCell>{ROOM[g.room_type]}{g.makkah_room && <p className="text-xs text-muted-foreground">مكة {g.makkah_room} · المدينة {g.madinah_room || '—'}</p>}</TableCell>
                        <TableCell>
                          <Select value={g.visa_status} disabled={cancelled} onValueChange={(v) => patchPilgrim.mutate({ id: g.id, patch: { visa_status: v } })}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(VISA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {cancelled ? <Badge variant="destructive">ملغي</Badge> : (
                            <Select value={g.status} onValueChange={(v) => patchPilgrim.mutate({ id: g.id, patch: { status: v } })}>
                              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>{Object.entries(PILGRIM_STATUS).filter(([k]) => k !== 'cancelled').map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>{fmt(due, program.currency)}</TableCell>
                        <TableCell>{fmt(g.paid_amount, program.currency)}</TableCell>
                        <TableCell>
                          {fmt(Math.max(0, due - g.paid_amount), program.currency)}
                          {cancelled && g.paid_amount > due && <p className="text-xs text-destructive">مستحق رد {fmt(g.paid_amount - due, program.currency)}</p>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {!cancelled && <Button size="icon" variant="ghost" title="تحصيل دفعة" onClick={() => { setPayFor(g); setPay({ ...pay, amount: Math.max(0, g.total_price - g.paid_amount), reference: '' }); }}><Wallet className="h-4 w-4" /></Button>}
                          <Button size="icon" variant="ghost" title="طباعة العقد" onClick={() => printDocument(currentOrganization, `عقد برنامج ${program.name}`, contractHtml(g, program))}><FileText className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="تعديل" onClick={() => openEditPilgrim(g)}><Pencil className="h-4 w-4" /></Button>
                          {!cancelled && canManage && <Button size="icon" variant="ghost" title="إلغاء" onClick={() => { setCancelFor(g); setFee(0); }}><Ban className="h-4 w-4 text-destructive" /></Button>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="rooming" className="space-y-4">
            {(['makkah_room', 'madinah_room'] as const).map((key) => (
              <Card key={key} className="p-4">
                <h3 className="font-semibold mb-3">{key === 'makkah_room' ? `مكة · ${program.makkah_hotel || '—'}` : `المدينة · ${program.madinah_hotel || '—'}`}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupBy(key).map(([room, occ]) => {
                    const issues = room === 'غير مسكّن' ? [] : roomIssues(occ, occ[0].room_type);
                    return (
                      <div key={room} className={`rounded-md border p-3 text-sm ${issues.length ? 'border-destructive' : ''}`}>
                        <p className="font-medium">{room === 'غير مسكّن' ? room : `غرفة ${room}`} <span className="text-muted-foreground">({occ.length})</span></p>
                        {occ.map((g) => <p key={g.id} className="text-muted-foreground">{g.full_name} · {g.gender === 'female' ? 'أنثى' : 'ذكر'} · {ROOM[g.room_type]}</p>)}
                        {issues.map((i) => <p key={i} className="text-xs text-destructive">{i}</p>)}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
            <p className="text-xs text-muted-foreground">لتسكين {label} اضغط تعديل وأدخل رقم الغرفة في مكة والمدينة.</p>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الاسم</TableHead><TableHead>المبلغ</TableHead><TableHead>الطريقة</TableHead><TableHead>المرجع</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {payments.filter((p) => programPilgrims.some((g) => g.id === p.pilgrim_id)).map((p) => {
                    const g = programPilgrims.find((x) => x.id === p.pilgrim_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.payment_date}</TableCell><TableCell>{g?.full_name}</TableCell><TableCell>{fmt(p.amount, p.currency)}</TableCell>
                        <TableCell>{p.payment_method === 'cash' ? 'نقدي' : 'تحويل بنكي'}</TableCell><TableCell>{p.reference_number || '—'}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => printDocument(currentOrganization, 'سند قبض', receiptHtml(p, g, program))}><Printer className="h-4 w-4 me-1" />سند</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { t: 'كشف الطيران والجوازات', h: MANIFEST_HEADERS, r: () => manifestRows(active), ltr: true },
                { t: 'كشف تسكين مكة', h: ['الغرفة', 'الاسم', 'النوع', 'الفئة', 'العائلة', 'المحرم'], r: () => roomingRows('makkah_room') },
                { t: 'كشف تسكين المدينة', h: ['الغرفة', 'الاسم', 'النوع', 'الفئة', 'العائلة', 'المحرم'], r: () => roomingRows('madinah_room') },
                { t: 'كشف الحافلات والمشرفين', h: ['الحافلة', 'المشرف', 'الاسم', 'الهاتف'], r: () => busRows },
              ].map((rep) => (
                <Card key={rep.t} className="p-4 space-y-3">
                  <p className="font-medium">{rep.t}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => printDocument(currentOrganization, `${rep.t} · ${program.name}`, table(rep.h, rep.r()))}><Printer className="h-4 w-4 me-1" />PDF / طباعة</Button>
                    <Button size="sm" variant="outline" onClick={() => exportExcel(`${rep.t} - ${program.name}`, [{ name: rep.t, headers: rep.h, rows: rep.r() }])}><FileSpreadsheet className="h-4 w-4 me-1" />Excel</Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={pilgrimOpen} onOpenChange={setPilgrimOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingPilgrim ? 'تعديل بيانات' : 'إضافة'} {label}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['full_name', 'الاسم كما في الجواز (عربي)'], ['name_en', 'الاسم بالإنجليزية (للطيران)', 'ltr'], ['phone', 'الهاتف', 'ltr'],
                ['birth_date', 'تاريخ الميلاد', 'date'], ['nationality', 'الجنسية'], ['national_id', 'الرقم القومي / الإقامة'],
                ['passport_number', 'رقم الجواز', 'ltr'], ['passport_expiry', 'انتهاء الجواز', 'date'], ['mahram_name', 'المحرم / المرافق'],
                ['mahram_relation', 'صلة القرابة'], ['room_group', 'العائلة / مجموعة الغرفة'], ['visa_number', 'رقم التأشيرة', 'ltr'],
                ['portal_barcode', 'باركود بوابة العمرة / نسك', 'ltr'], ['makkah_room', 'رقم غرفة مكة'], ['madinah_room', 'رقم غرفة المدينة'],
                ['bus_number', 'رقم الحافلة'], ['supervisor', 'المشرف'],
              ] as [string, string, string?][]).map(([k, l, kind]) => (
                <F key={k} label={l}><Input type={kind === 'date' ? 'date' : 'text'} dir={kind === 'ltr' ? 'ltr' : undefined} value={gf[k] ?? ''} onChange={(e) => setGf({ ...gf, [k]: e.target.value })} /></F>
              ))}
              <F label="النوع">
                <Select value={gf.gender} onValueChange={(v) => setGf({ ...gf, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select>
              </F>
              <F label="نوع الغرفة">
                <Select value={gf.room_type} onValueChange={(v) => setGf({ ...gf, room_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ROOM).map(([k, v]) => <SelectItem key={k} value={k}>{v} · {fmt(priceFor(program, k), program.currency)}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="ملاحظات" wide><Textarea value={gf.notes ?? ''} onChange={(e) => setGf({ ...gf, notes: e.target.value })} /></F>
            </div>
            {!editingPilgrim && <p className="text-xs text-muted-foreground">سيتم ربطه بملف العميل الحالي بنفس رقم الهاتف أو إنشاء ملف عميل جديد. الدفعات تُسجَّل من زر التحصيل.</p>}
            <Button className="w-full" disabled={gf.full_name.trim().length < 3 || savePilgrim.isPending} onClick={() => savePilgrim.mutate()}>حفظ</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>سند قبض · {payFor?.full_name}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">المتبقي: {payFor && fmt(Math.max(0, payFor.total_price - payFor.paid_amount), program.currency)}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="المبلغ"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} /></F>
              <F label="التاريخ"><Input type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></F>
              <F label="طريقة الدفع">
                <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">نقدي</SelectItem><SelectItem value="bank_transfer">تحويل بنكي</SelectItem></SelectContent></Select>
              </F>
              <F label="الخزينة / الحساب">
                <Select value={pay.treasury} onValueChange={(v) => setPay({ ...pay, treasury: v })}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{treasuries.filter((t) => (t.currency || 'EGP') === (program.currency || 'EGP')).map((t) => <SelectItem key={t.id} value={t.id}>{t.account_name || t.bank_name}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="رقم المرجع (اختياري)" wide><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></F>
            </div>
            <Button className="w-full" disabled={collect.isPending} onClick={() => collect.mutate()}>تسجيل وطباعة السند</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={!!cancelFor} onOpenChange={(o) => !o && setCancelFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>إلغاء تسجيل {cancelFor?.full_name}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">المدفوع: {cancelFor && fmt(cancelFor.paid_amount, program.currency)}. أدخل رسوم الإلغاء حسب سياسة الشركة؛ الفرق يظهر كمستحق رد ويُصرف من طلبات الاسترداد في المالية.</p>
            <F label="رسوم الإلغاء"><Input type="number" value={fee} onChange={(e) => setFee(Math.max(0, Number(e.target.value)))} /></F>
            <Button variant="destructive" className="w-full" onClick={() => { patchPilgrim.mutate({ id: cancelFor.id, patch: { status: 'cancelled', cancellation_fee: fee, cancelled_at: new Date().toISOString() } }); setCancelFor(null); }}>تأكيد الإلغاء</Button>
          </DialogContent>
        </Dialog>
        {programDialog()}
      </div>
    );
  }

  function programDialog() {
    return (
      <Dialog open={programOpen} onOpenChange={setProgramOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProgram ? 'تعديل البرنامج' : `برنامج ${type === 'hajj' ? 'حج' : 'عمرة'} جديد`}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="اسم البرنامج" wide><Input value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} placeholder="مثال: عمرة رجب 15 يوم" /></F>
            <F label="الموسم"><Input value={pf.season ?? ''} onChange={(e) => setPf({ ...pf, season: e.target.value })} placeholder="1448 هـ" /></F>
            <F label="الحالة">
              <Select value={pf.status} onValueChange={(v) => setPf({ ...pf, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PROGRAM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            </F>
            {([['capacity', 'السعة (عدد الأفراد)', 'number'], ['departure_date', 'تاريخ السفر', 'date'], ['return_date', 'تاريخ العودة', 'date'],
              ['makkah_hotel', 'فندق مكة'], ['makkah_nights', 'ليالي مكة', 'number'], ['madinah_hotel', 'فندق المدينة'], ['madinah_nights', 'ليالي المدينة', 'number'],
              ['airline', 'شركة الطيران'], ['flight_details', 'تفاصيل الرحلات'], ['transport_details', 'النقل والتنقلات'],
              ['price_quad', 'سعر البيع - رباعية', 'number'], ['price_triple', 'سعر البيع - ثلاثية', 'number'], ['price_double', 'سعر البيع - ثنائية', 'number'], ['price_single', 'سعر البيع - فردية', 'number'],
            ] as [string, string, string?][]).map(([k, l, kind]) => (
              <F key={k} label={l}><Input type={kind ?? 'text'} value={pf[k] ?? ''} onChange={(e) => setPf({ ...pf, [k]: kind === 'number' ? Number(e.target.value) : e.target.value })} /></F>
            ))}
            {canManage && <F label="التكلفة الداخلية للفرد (تظهر للإدارة فقط)" wide><Input type="number" value={pf.cost_per_person} onChange={(e) => setPf({ ...pf, cost_per_person: Number(e.target.value) })} /></F>}
            <F label="الشروط والأحكام (تظهر في العقد)" wide><Textarea value={pf.terms ?? ''} onChange={(e) => setPf({ ...pf, terms: e.target.value })} /></F>
            <F label="ملاحظات" wide><Textarea value={pf.notes ?? ''} onChange={(e) => setPf({ ...pf, notes: e.target.value })} /></F>
          </div>
          <Button className="w-full" disabled={pf.name.trim().length < 3 || saveProgram.isPending} onClick={() => saveProgram.mutate()}>{editingProgram ? 'حفظ التعديلات' : 'إنشاء البرنامج'}</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // ===== Programs list =====
  return (
    <div className="space-y-6">
      <PageHeader
        title="الحج والعمرة"
        description="إدارة برامج الحج والعمرة، التسجيل، التحصيل بسندات قبض، التسكين، وكشوفات السفر والعقود."
        icon={Moon}
        actions={canManage && <Button onClick={() => { setEditingProgram(false); setPf({ ...EMPTY_PROGRAM }); setProgramOpen(true); }}><Plus className="h-4 w-4 me-1" />برنامج جديد</Button>}
      />
      <Tabs value={type} onValueChange={(v) => setType(v as any)}>
        <TabsList><TabsTrigger value="umrah">العمرة</TabsTrigger><TabsTrigger value="hajj">الحج</TabsTrigger></TabsList>
      </Tabs>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground sm:col-span-3">لا توجد برامج {type === 'hajj' ? 'حج' : 'عمرة'} بعد.</Card>}
        {list.map((p) => {
          const count = pilgrims.filter((g) => g.program_id === p.id && g.status !== 'cancelled').length;
          return (
            <Card key={p.id} className="p-5 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setProgramId(p.id)}>
              <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{p.name}</h3><Badge variant="outline">{PROGRAM_STATUS[p.status]}</Badge></div>
              <p className="mt-1 text-xs text-muted-foreground">{p.season} · {p.departure_date ?? '—'} ← {p.return_date ?? '—'}</p>
              <p className="mt-3 text-sm">مكة: {p.makkah_hotel || '—'} · المدينة: {p.madinah_hotel || '—'}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" />{count} / {p.capacity || '∞'}</span>
                <span>من {fmt(p.price_quad, p.currency)}</span>
              </div>
            </Card>
          );
        })}
      </div>
      {programDialog()}
    </div>
  );
};

export default Pilgrimage;
