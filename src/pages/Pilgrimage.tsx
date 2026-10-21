import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Moon, Plus, Users, ArrowRight } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const ROOM: Record<string, string> = { quad: 'رباعية', triple: 'ثلاثية', double: 'ثنائية', single: 'فردية' };
const VISA: Record<string, string> = { not_started: 'لم تبدأ', submitted: 'مقدمة', issued: 'صادرة', rejected: 'مرفوضة' };
const PILGRIM_STATUS: Record<string, string> = {
  registered: 'مسجل', documents_pending: 'نواقص مستندات', visa_processing: 'إجراءات التأشيرة',
  ready: 'جاهز للسفر', traveled: 'مسافر', completed: 'مكتمل', cancelled: 'ملغي',
};
const PROGRAM_STATUS: Record<string, string> = {
  draft: 'مسودة', open: 'التسجيل مفتوح', full: 'مكتمل العدد', closed: 'مغلق', departed: 'غادر', completed: 'انتهى', cancelled: 'ملغي',
};

const fmt = (n: number, c = 'EGP') => `${Number(n || 0).toLocaleString()} ${c}`;

const EMPTY_PROGRAM = {
  name: '', season: '', departure_date: '', return_date: '', makkah_hotel: '', makkah_nights: 0,
  madinah_hotel: '', madinah_nights: 0, airline: '', flight_details: '', transport_details: '', capacity: 0,
  price_quad: 0, price_triple: 0, price_double: 0, price_single: 0, notes: '', cost_per_person: 0,
};
const EMPTY_PILGRIM = {
  full_name: '', phone: '', gender: 'male', birth_date: '', nationality: 'مصري', national_id: '',
  passport_number: '', passport_expiry: '', mahram_name: '', mahram_relation: '', room_type: 'quad',
  room_group: '', paid_amount: 0, notes: '',
};

const Pilgrimage = () => {
  const orgId = useOrgId();
  const { orgRole } = useOrganization();
  const canManage = ['owner', 'admin', 'manager'].includes(orgRole ?? '');
  const qc = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<'umrah' | 'hajj'>('umrah');
  const [programId, setProgramId] = useState<string | null>(null);
  const [programOpen, setProgramOpen] = useState(false);
  const [pilgrimOpen, setPilgrimOpen] = useState(false);
  const [pf, setPf] = useState({ ...EMPTY_PROGRAM });
  const [gf, setGf] = useState({ ...EMPTY_PILGRIM });

  const fail = (e: any) => toast({ title: 'تعذر الحفظ', description: e.message, variant: 'destructive' });

  const { data: programs = [] } = useQuery({
    queryKey: ['pilgrimage-programs', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('pilgrimage_programs').select('*').eq('organization_id', orgId).order('departure_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: pilgrims = [] } = useQuery({
    queryKey: ['pilgrims', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('pilgrims').select('*').eq('organization_id', orgId).order('created_at');
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: costs = [] } = useQuery({
    queryKey: ['pilgrimage-costs', orgId],
    enabled: !!orgId && canManage,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('pilgrimage_program_costs').select('*').eq('organization_id', orgId);
      if (error) throw error;
      return data as any[];
    },
  });

  const program = programs.find((p) => p.id === programId) ?? null;
  const list = programs.filter((p) => p.program_type === type);
  const programPilgrims = useMemo(() => pilgrims.filter((g) => g.program_id === programId), [pilgrims, programId]);

  const priceFor = (p: any, room: string) => Number(p?.[`price_${room}`] ?? 0);

  const saveProgram = useMutation({
    mutationFn: async () => {
      const { cost_per_person, ...rest } = pf;
      const row: any = { ...rest, organization_id: orgId, program_type: type };
      ['departure_date', 'return_date'].forEach((k) => { if (!row[k]) row[k] = null; });
      const { data, error } = await (supabase as any).from('pilgrimage_programs').insert(row).select('id').single();
      if (error) throw error;
      if (Number(cost_per_person) > 0) {
        const { error: ce } = await (supabase as any).from('pilgrimage_program_costs').insert({ program_id: data.id, organization_id: orgId, cost_per_person });
        if (ce) throw ce;
      }
    },
    onSuccess: () => {
      setProgramOpen(false); setPf({ ...EMPTY_PROGRAM });
      qc.invalidateQueries({ queryKey: ['pilgrimage-programs'] }); qc.invalidateQueries({ queryKey: ['pilgrimage-costs'] });
      toast({ title: 'تم إنشاء البرنامج' });
    },
    onError: fail,
  });

  const savePilgrim = useMutation({
    mutationFn: async () => {
      if (programPilgrims.filter((g) => g.status !== 'cancelled').length >= (program?.capacity || Infinity)) {
        throw new Error('البرنامج مكتمل العدد');
      }
      const row: any = { ...gf, organization_id: orgId, program_id: programId, total_price: priceFor(program, gf.room_type) };
      ['birth_date', 'passport_expiry'].forEach((k) => { if (!row[k]) row[k] = null; });
      const { error } = await (supabase as any).from('pilgrims').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      setPilgrimOpen(false); setGf({ ...EMPTY_PILGRIM });
      qc.invalidateQueries({ queryKey: ['pilgrims'] });
      toast({ title: 'تمت إضافة الحاج / المعتمر' });
    },
    onError: fail,
  });

  const patchPilgrim = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await (supabase as any).from('pilgrims').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pilgrims'] }),
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
    const total = active.reduce((s, g) => s + Number(g.total_price), 0);
    const paid = active.reduce((s, g) => s + Number(g.paid_amount), 0);
    const cost = costs.find((c) => c.program_id === program.id);
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setProgramId(null)}><ArrowRight className="h-4 w-4 me-1 rtl:rotate-0 ltr:rotate-180" />كل البرامج</Button>
        <PageHeader
          title={program.name}
          description={`${program.program_type === 'hajj' ? 'حج' : 'عمرة'} · ${program.departure_date ?? '—'} ← ${program.return_date ?? '—'} · مكة ${program.makkah_nights} ليالٍ · المدينة ${program.madinah_nights} ليالٍ`}
          icon={Moon}
          badge={<Badge variant="outline">{PROGRAM_STATUS[program.status]}</Badge>}
          actions={<Button onClick={() => setPilgrimOpen(true)}><Plus className="h-4 w-4 me-1" />إضافة {label}</Button>}
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
        <Card className="p-4 grid gap-2 sm:grid-cols-3 text-sm">
          <div><span className="text-muted-foreground">فندق مكة: </span>{program.makkah_hotel || '—'}</div>
          <div><span className="text-muted-foreground">فندق المدينة: </span>{program.madinah_hotel || '—'}</div>
          <div><span className="text-muted-foreground">الطيران: </span>{program.airline || '—'} {program.flight_details}</div>
          <div className="sm:col-span-3"><span className="text-muted-foreground">النقل: </span>{program.transport_details || '—'}</div>
        </Card>

        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead><TableHead>الهاتف</TableHead><TableHead>الجواز</TableHead><TableHead>الغرفة</TableHead>
                <TableHead>التأشيرة</TableHead><TableHead>الحالة</TableHead><TableHead>السعر</TableHead><TableHead>المدفوع</TableHead><TableHead>المتبقي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programPilgrims.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا يوجد مسجلون بعد.</TableCell></TableRow>}
              {programPilgrims.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.full_name}{g.mahram_name && <p className="text-xs text-muted-foreground">المحرم: {g.mahram_name} ({g.mahram_relation})</p>}</TableCell>
                  <TableCell dir="ltr">{g.phone}</TableCell>
                  <TableCell>
                    {g.passport_number || <span className="text-destructive text-xs">ناقص</span>}
                    {passportWarning(g) && <p className="text-xs text-destructive">الصلاحية أقل من 6 أشهر</p>}
                  </TableCell>
                  <TableCell>{ROOM[g.room_type]}{g.room_group && ` · ${g.room_group}`}</TableCell>
                  <TableCell>
                    <Select value={g.visa_status} onValueChange={(v) => patchPilgrim.mutate({ id: g.id, patch: { visa_status: v } })}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(VISA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={g.status} onValueChange={(v) => patchPilgrim.mutate({ id: g.id, patch: { status: v } })}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PILGRIM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{fmt(g.total_price, program.currency)}</TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 w-28" defaultValue={g.paid_amount}
                      onBlur={(e) => Number(e.target.value) !== Number(g.paid_amount) && patchPilgrim.mutate({ id: g.id, patch: { paid_amount: Number(e.target.value) } })} />
                  </TableCell>
                  <TableCell>{fmt(Math.max(0, g.total_price - g.paid_amount), program.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={pilgrimOpen} onOpenChange={setPilgrimOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة {label}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>الاسم كما في الجواز</Label><Input value={gf.full_name} onChange={(e) => setGf({ ...gf, full_name: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input dir="ltr" value={gf.phone} onChange={(e) => setGf({ ...gf, phone: e.target.value })} /></div>
              <div><Label>النوع</Label>
                <Select value={gf.gender} onValueChange={(v) => setGf({ ...gf, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select>
              </div>
              <div><Label>تاريخ الميلاد</Label><Input type="date" value={gf.birth_date} onChange={(e) => setGf({ ...gf, birth_date: e.target.value })} /></div>
              <div><Label>الجنسية</Label><Input value={gf.nationality} onChange={(e) => setGf({ ...gf, nationality: e.target.value })} /></div>
              <div><Label>الرقم القومي</Label><Input value={gf.national_id} onChange={(e) => setGf({ ...gf, national_id: e.target.value })} /></div>
              <div><Label>رقم الجواز</Label><Input value={gf.passport_number} onChange={(e) => setGf({ ...gf, passport_number: e.target.value })} /></div>
              <div><Label>انتهاء الجواز</Label><Input type="date" value={gf.passport_expiry} onChange={(e) => setGf({ ...gf, passport_expiry: e.target.value })} /></div>
              <div><Label>نوع الغرفة</Label>
                <Select value={gf.room_type} onValueChange={(v) => setGf({ ...gf, room_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ROOM).map(([k, v]) => <SelectItem key={k} value={k}>{v} · {fmt(priceFor(program, k), program.currency)}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>المحرم / المرافق</Label><Input value={gf.mahram_name} onChange={(e) => setGf({ ...gf, mahram_name: e.target.value })} /></div>
              <div><Label>صلة القرابة</Label><Input value={gf.mahram_relation} onChange={(e) => setGf({ ...gf, mahram_relation: e.target.value })} /></div>
              <div><Label>مجموعة الغرفة</Label><Input placeholder="مثال: غرفة 1 - عائلة أحمد" value={gf.room_group} onChange={(e) => setGf({ ...gf, room_group: e.target.value })} /></div>
              <div><Label>دفعة مقدمة</Label><Input type="number" value={gf.paid_amount} onChange={(e) => setGf({ ...gf, paid_amount: Number(e.target.value) })} /></div>
              <div className="sm:col-span-2"><Label>ملاحظات</Label><Textarea value={gf.notes} onChange={(e) => setGf({ ...gf, notes: e.target.value })} /></div>
            </div>
            <Button className="w-full" disabled={gf.full_name.trim().length < 3 || savePilgrim.isPending} onClick={() => savePilgrim.mutate()}>حفظ</Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== Programs list =====
  return (
    <div className="space-y-6">
      <PageHeader
        title="الحج والعمرة"
        description="إدارة برامج الحج والعمرة وتسجيل الحجاج والمعتمرين ومتابعة الجوازات والتأشيرات والغرف والتحصيل."
        icon={Moon}
        actions={canManage && <Button onClick={() => setProgramOpen(true)}><Plus className="h-4 w-4 me-1" />برنامج جديد</Button>}
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
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <Badge variant="outline">{PROGRAM_STATUS[p.status]}</Badge>
              </div>
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

      <Dialog open={programOpen} onOpenChange={setProgramOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>برنامج {type === 'hajj' ? 'حج' : 'عمرة'} جديد</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>اسم البرنامج</Label><Input value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} placeholder="مثال: عمرة رجب 15 يوم" /></div>
            <div><Label>الموسم</Label><Input value={pf.season} onChange={(e) => setPf({ ...pf, season: e.target.value })} placeholder="1448 هـ" /></div>
            <div><Label>السعة (عدد الأفراد)</Label><Input type="number" value={pf.capacity} onChange={(e) => setPf({ ...pf, capacity: Number(e.target.value) })} /></div>
            <div><Label>تاريخ السفر</Label><Input type="date" value={pf.departure_date} onChange={(e) => setPf({ ...pf, departure_date: e.target.value })} /></div>
            <div><Label>تاريخ العودة</Label><Input type="date" value={pf.return_date} onChange={(e) => setPf({ ...pf, return_date: e.target.value })} /></div>
            <div><Label>فندق مكة</Label><Input value={pf.makkah_hotel} onChange={(e) => setPf({ ...pf, makkah_hotel: e.target.value })} /></div>
            <div><Label>ليالي مكة</Label><Input type="number" value={pf.makkah_nights} onChange={(e) => setPf({ ...pf, makkah_nights: Number(e.target.value) })} /></div>
            <div><Label>فندق المدينة</Label><Input value={pf.madinah_hotel} onChange={(e) => setPf({ ...pf, madinah_hotel: e.target.value })} /></div>
            <div><Label>ليالي المدينة</Label><Input type="number" value={pf.madinah_nights} onChange={(e) => setPf({ ...pf, madinah_nights: Number(e.target.value) })} /></div>
            <div><Label>شركة الطيران</Label><Input value={pf.airline} onChange={(e) => setPf({ ...pf, airline: e.target.value })} /></div>
            <div><Label>تفاصيل الرحلات</Label><Input value={pf.flight_details} onChange={(e) => setPf({ ...pf, flight_details: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>النقل والتنقلات</Label><Input value={pf.transport_details} onChange={(e) => setPf({ ...pf, transport_details: e.target.value })} /></div>
            {(['quad', 'triple', 'double', 'single'] as const).map((r) => (
              <div key={r}><Label>سعر البيع - {ROOM[r]}</Label><Input type="number" value={(pf as any)[`price_${r}`]} onChange={(e) => setPf({ ...pf, [`price_${r}`]: Number(e.target.value) })} /></div>
            ))}
            <div className="sm:col-span-2"><Label>التكلفة الداخلية للفرد (تظهر للإدارة فقط)</Label><Input type="number" value={pf.cost_per_person} onChange={(e) => setPf({ ...pf, cost_per_person: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2"><Label>ملاحظات</Label><Textarea value={pf.notes} onChange={(e) => setPf({ ...pf, notes: e.target.value })} /></div>
          </div>
          <Button className="w-full" disabled={pf.name.trim().length < 3 || saveProgram.isPending} onClick={() => saveProgram.mutate()}>إنشاء البرنامج</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pilgrimage;
