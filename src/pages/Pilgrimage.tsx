import { useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Moon, Plus, Users, ArrowRight, Pencil, Wallet, FileText, Printer, FileSpreadsheet, Ban, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PrivateRecordAttachments from '@/components/documents/PrivateRecordAttachments';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import PilgrimageSales from '@/components/pilgrimage/PilgrimageSales';
import PilgrimageAvailabilitySearch from '@/components/pilgrimage/PilgrimageAvailabilitySearch';
import PilgrimageInterest from '@/components/pilgrimage/PilgrimageInterest';
import PilgrimageOperations from '@/components/pilgrimage/PilgrimageOperations';
import UmrahRooming, { umrahRoomGroupLabel, type UmrahRoomGroup } from '@/components/pilgrimage/UmrahRooming';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { canRegisterPilgrim, isActivePilgrim, pilgrimageTotals, pilgrimDue, outstanding, refundable, readinessIssues, validatePilgrimageProgram, pilgrimageSalesIssues, salesConfirmationRequired } from '@/lib/pilgrimage/operations';
import {
  ROOM, money as fmt, printDocument, table, receiptHtml, contractHtml, manifestRows, MANIFEST_HEADERS, exportExcel, roomIssues,
} from '@/components/pilgrimage/pilgrimage-documents';

const VISA: Record<string, string> = { not_started: 'لم تبدأ', submitted: 'مقدمة', issued: 'صادرة', not_required: 'غير مطلوبة للمسار', rejected: 'مرفوضة' };
const PILGRIM_STATUS: Record<string, string> = {
  registered: 'مسجل', documents_pending: 'نواقص مستندات', visa_processing: 'إجراءات التأشيرة',
  ready: 'جاهز للسفر', traveled: 'مسافر', completed: 'مكتمل', cancelled: 'ملغي',
};
const PROGRAM_STATUS: Record<string, string> = {
  draft: 'مسودة', open: 'التسجيل مفتوح', full: 'مكتمل العدد', closed: 'مغلق', departed: 'غادر', completed: 'انتهى', cancelled: 'ملغي',
};
const programStatusLabel = (program: any) => program.status === 'open' &&
  (!program.sales_confirmed_at || pilgrimageSalesIssues(program).length > 0)
  ? 'بانتظار اعتماد البيع' : PROGRAM_STATUS[program.status];
const PROGRAM_FIELDS = ['name', 'season', 'departure_date', 'return_date', 'makkah_hotel', 'makkah_nights', 'madinah_hotel', 'madinah_nights',
  'airline', 'flight_details', 'transport_details', 'capacity', 'price_quad', 'price_triple', 'price_double', 'price_single', 'currency', 'travel_scope', 'notes', 'terms', 'status'];
const PILGRIM_FIELDS = ['full_name', 'name_en', 'phone', 'gender', 'birth_date', 'nationality', 'national_id', 'passport_number', 'passport_expiry',
  'mahram_name', 'mahram_relation', 'room_type', 'room_group', 'vaccination_done', 'documents_complete', 'visa_number', 'portal_barcode', 'makkah_room', 'madinah_room', 'bus_number', 'supervisor', 'notes'];

const EMPTY_PROGRAM: any = {
  name: '', season: '', departure_date: '', return_date: '', makkah_hotel: '', makkah_nights: 0,
  madinah_hotel: '', madinah_nights: 0, airline: '', flight_details: '', transport_details: '', capacity: 0,
  price_quad: 0, price_triple: 0, price_double: 0, price_single: 0, currency: 'EGP', travel_scope: 'international', notes: '', terms: '', status: 'draft', cost_per_person: 0,
};
const SALES_FIELDS = ['departure_date', 'return_date', 'capacity', 'currency', 'price_quad', 'price_triple', 'price_double', 'price_single'];
const EMPTY_PILGRIM: any = {
  full_name: '', name_en: '', phone: '', gender: 'male', birth_date: '', nationality: 'مصري', national_id: '',
  passport_number: '', passport_expiry: '', mahram_name: '', mahram_relation: '', room_type: 'quad', room_group: '',
  vaccination_done: false, documents_complete: false, visa_number: '', portal_barcode: '', makkah_room: '', madinah_room: '', bus_number: '', supervisor: '', notes: '',
};
const pick = (o: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o[k] === '' && /date|expiry/.test(k) ? null : o[k] ?? null]));
const genderLabel = (gender: string | null) => gender === 'female' ? 'أنثى' : gender === 'male' ? 'ذكر' : 'غير محدد';

const F = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <div className={wide ? 'sm:col-span-2' : ''}><Label>{label}</Label>{children}</div>
);

const Pilgrimage = () => {
  const orgId = useOrgId();
  const { orgRole, currentOrganization } = useOrganization();
  const { canViewCRM, canCreateCRM, hasPermission, getPermissionScope } = useSupabasePermissions();
  const canManage = ['owner', 'admin', 'manager'].includes(orgRole ?? '');
  const qc = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<'umrah' | 'hajj'>('umrah');
  const [params, setParams] = useSearchParams();
  const programId = params.get('program');
  const linkedPassengerId = params.get('passenger');
  const setProgramId = (id: string | null) => setParams(current => {
    const next = new URLSearchParams(current);
    next.delete('passenger');
    next.delete('tab');
    if (id) next.set('program', id);
    else next.delete('program');
    return next;
  });
  const linkedSaleId = params.get('sale');
  const availabilityOpen = params.get('view') === 'availability';
  const openAvailability = () => setParams(current => {
    const next = new URLSearchParams(current);
    next.delete('sale');
    next.set('view', 'availability');
    return next;
  });
  const [salesOpen, setSalesOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [confirmSales, setConfirmSales] = useState(false);
  const [editingProgram, setEditingProgram] = useState(false);
  const [pilgrimOpen, setPilgrimOpen] = useState(false);
  const [editingPilgrim, setEditingPilgrim] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<any>(null);
  const [cancelFor, setCancelFor] = useState<any>(null);
  const [fee, setFee] = useState(0);
  const [roomingFor, setRoomingFor] = useState<{ id: string; name: string; city: 'makkah_room' | 'madinah_room'; room: string } | null>(null);
  const [search, setSearch] = useState('');
  const [pay, setPay] = useState({ amount: 0, method: 'cash', treasury: '', reference: '', date: new Date().toISOString().slice(0, 10), exchangeRate: 1, clientRef: '' });
  const [pf, setPf] = useState<any>({ ...EMPTY_PROGRAM });
  const [gf, setGf] = useState<any>({ ...EMPTY_PILGRIM });

  const fail = (e: { message: string }) => toast({ title: 'تعذر الحفظ', description: ({
    pilgrimage_sales_confirmation_required: salesConfirmationRequired,
    room_capacity_exceeded: 'الغرفة مكتملة. اختر غرفة أخرى.',
    room_category_conflict: 'فئة هذه الغرفة تختلف عن فئة المعتمر.',
    room_family_group_required: 'التسكين المشترك يتطلب تسجيل مجموعة عائلية واحدة.',
    umrah_rooming_gender_mismatch: 'انقل المعتمر من مجموعة التسكين الحالية قبل تعديل النوع.',
    pilgrimage_passenger_not_changeable: 'التسكين مقفل بعد سفر المعتمر أو اكتمال الرحلة.',
  } as Record<string, string>)[e.message] ?? e.message, variant: 'destructive' });
  const sb = supabase as any;
  const refresh = () => ['pilgrimage-programs', 'pilgrimage-sale-programs', 'pilgrims', 'pilgrimage-costs', 'pilgrim-payments', 'pilgrimage-availability', 'pilgrimage-operation-refunds', 'umrah-rooming-groups'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

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
  const operationalUmrah = program?.program_type === 'umrah';
  const roomingGroups = useQuery<UmrahRoomGroup[]>({
    queryKey: ['umrah-rooming-groups', orgId, programId],
    enabled: Boolean(orgId && operationalUmrah),
    queryFn: async () => {
      const { data, error } = await sb.from('umrah_rooming_groups')
        .select('id,city,gender,room_type,group_number,hotel_room_number')
        .eq('organization_id', orgId).eq('program_id', programId)
        .order('room_type').order('group_number');
      if (error) throw error;
      return data ?? [];
    },
  });
  const operationRefunds = useQuery({
    queryKey: ['pilgrimage-operation-refunds', orgId, programId],
    enabled: Boolean(orgId && operationalUmrah),
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<{ pilgrim_id: string; reserved_amount: number }[]>('get_pilgrimage_operation_refunds', {
        _organization_id: orgId, _program_id: programId,
      });
      if (error) throw error;
      return new Map(data?.map((row) => [row.pilgrim_id, Number(row.reserved_amount)]));
    },
  });
  const list = programs.filter((p) => p.program_type === type);
  const programPilgrims = useMemo(() => pilgrims.filter((g) => g.program_id === programId)
    .map((g) => ({ ...g, reserved_refunds: operationRefunds.data?.get(g.id) ?? 0 })), [pilgrims, programId, operationRefunds.data]);
  const priceFor = (p: any, room: string) => Number(p?.[`price_${room}`] ?? 0);

  const salesIssues = pilgrimageSalesIssues(pf);
  const salesFieldsChanged = !editingProgram || SALES_FIELDS.some((key) => String(pf[key] ?? '') !== String(program?.[key] ?? ''));
  const salesConfirmed = !!program?.sales_confirmed_at && !salesFieldsChanged;
  const saveProgram = useMutation({
    mutationFn: async () => {
      const issues = validatePilgrimageProgram(pf, pf.name || '');
      if (issues.length) throw new Error(issues.join('، '));
      const openingSales = pf.status === 'open' && (!editingProgram || program?.status !== 'open');
      if ((openingSales || (pf.status === 'open' && salesFieldsChanged) || confirmSales) &&
          (salesIssues.length || (!salesConfirmed && !confirmSales))) {
        throw new Error(salesConfirmationRequired);
      }
      if (editingProgram && program) {
        if (programPilgrims.length && pf.currency !== program.currency)
          throw new Error('لا يمكن تغيير عملة البرنامج بعد تسجيل أشخاص عليه');
        if (programPilgrims.length && pf.travel_scope !== (program.travel_scope || 'international'))
          throw new Error('لا يمكن تغيير المسار الداخلي/الدولي بعد تسجيل أشخاص عليه');
        if (Number(pf.capacity) > 0 && Number(pf.capacity) < programPilgrims.filter(isActivePilgrim).length)
          throw new Error('السعة الجديدة أقل من عدد المسجلين الفعلي');
      }
      const row: any = pick(pf, PROGRAM_FIELDS);
      if (confirmSales) row.sales_confirmed_at = new Date().toISOString();
      let id = programId;
      if (editingProgram && id) {
        const { error } = await sb.from('pilgrimage_programs').update(row).eq('id', id).eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from('pilgrimage_programs').insert({ ...row, organization_id: orgId, program_type: type }).select('id').single();
        if (error) throw error;
        id = data.id;
      }
      if (canManage && Number.isFinite(Number(pf.cost_per_person)) && Number(pf.cost_per_person) >= 0) {
        const existing = costs.find((c) => c.program_id === id);
        if (!existing && Number(pf.cost_per_person) === 0) return;
        const { error } = existing
          ? await sb.from('pilgrimage_program_costs').update({ cost_per_person: pf.cost_per_person }).eq('program_id', id).eq('organization_id', orgId)
          : await sb.from('pilgrimage_program_costs').insert({ program_id: id, organization_id: orgId, cost_per_person: pf.cost_per_person });
        if (error) throw error;
      }
    },
    onSuccess: () => { setProgramOpen(false); refresh(); toast({ title: editingProgram ? 'تم تحديث البرنامج' : 'تم إنشاء البرنامج' }); },
    onError: fail,
  });

  /** The same phone may belong to a whole family; never silently merge their customer records. */
  const linkCustomer = async () => {
    const passport = String(gf.passport_number || '').trim();
    if (passport.length >= 5) {
      const { data: matching, error: lookupError } = await sb.from('customers')
        .select('id').eq('organization_id', orgId)
        .eq('passport_number', passport).limit(2);
      if (lookupError) throw lookupError;
      if ((matching || []).length > 1) throw new Error('توجد ملفات عملاء مكررة بنفس الجواز؛ يرجى حل التكرار من CRM');
      if (matching?.length === 1) return matching[0].id;
    }
    const { data, error } = await sb.from('customers').insert({
      organization_id: orgId, name: gf.full_name, phone: gf.phone || null, nationality: gf.nationality || null, passport_number: gf.passport_number || null,
    }).select('id').single();
    if (error) throw error;
    return data.id;
  };

  const savePilgrim = useMutation({
    mutationFn: async () => {
      if (!program) throw new Error('اختر برنامجًا أولاً');
      if (gf.full_name.trim().length < 3) throw new Error('أدخل الاسم الكامل');
      const row: any = pick(gf, PILGRIM_FIELDS);
      if (operationalUmrah) {
        delete row.makkah_room;
        delete row.madinah_room;
      }
      if (editingPilgrim) {
        const previous = programPilgrims.find((g) => g.id === editingPilgrim);
        if (!previous) throw new Error('ملف المسافر غير موجود');
        if (!previous.b2b_roster_entry_id && previous.room_type !== gf.room_type) {
          if (Number(previous.paid_amount) > 0) throw new Error('لا يمكن تغيير سعر فئة الغرفة بعد التحصيل. استخدم إجراء تعديل مالي معتمد.');
          row.total_price = priceFor(program, gf.room_type);
        }
        const { error } = await sb.from('pilgrims').update(row).eq('id', editingPilgrim).eq('organization_id', orgId).eq('program_id', programId);
        if (error) throw error;
        return;
      }
      const block = canRegisterPilgrim(program, programPilgrims);
      if (block) throw new Error(block);
      row.total_price = priceFor(program, gf.room_type);
      if (row.total_price <= 0) throw new Error('حدد سعر بيع صالح لفئة الغرفة قبل التسجيل');
      const customer_id = await linkCustomer();
      const { error } = await sb.from('pilgrims').insert({ ...row, customer_id, organization_id: orgId, program_id: programId });
      if (error) throw error;
    },
    onSuccess: () => { setPilgrimOpen(false); refresh(); toast({ title: editingPilgrim ? 'تم التحديث' : 'تمت الإضافة وربطه بملف العميل' }); },
    onError: fail,
  });

  const patchPilgrim = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const current = programPilgrims.find((g) => g.id === id);
      if (!current) throw new Error('المسافر غير موجود داخل البرنامج');
      if (['ready', 'traveled', 'completed'].includes(patch.status)) {
        const issues = readinessIssues({ ...current, ...patch }, program);
        if (issues.length) throw new Error('يجب استكمال البيانات قبل تغيير الحالة: ' + issues.join('، '));
      }
      const { data, error } = await sb.from('pilgrims').update(patch).eq('id', id).eq('organization_id', orgId).eq('program_id', programId).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('تعذر تحديث المسافر داخل البرنامج');
    },
    onSuccess: refresh,
    onError: fail,
  });

  const collect = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error('ليس لديك صلاحية تحصيل دفعة من هذا القسم');
      const g = payFor;
      if (!program || !g || (operationalUmrah && !operationRefunds.isSuccess) || (!operationalUmrah && g.status === 'cancelled')) throw new Error('لا يمكن التحصيل لهذه الحالة');
      const remaining = outstanding(g);
      if (!Number.isFinite(pay.amount) || pay.amount <= 0 || pay.amount > remaining)
        throw new Error(`المبلغ يجب أن يكون بين 0 و ${remaining}`);
      if (!pay.date) throw new Error('تاريخ التحصيل مطلوب');
      if (!Number.isFinite(pay.exchangeRate) || pay.exchangeRate <= 0)
        throw new Error('أدخل سعر التحويل الصحيح لعملة الدفتر');
      if (!pay.treasury) throw new Error('يجب اختيار خزينة نشطة قبل التحصيل');
      if (!pay.clientRef) throw new Error('تعذر إنشاء معرف العملية؛ أغلق النافذة وافتحها مجددًا');
      const treasury = treasuries.find((t) => t.id === pay.treasury);
      if (!treasury || treasury.currency !== program.currency ||
        (pay.method === 'cash' && treasury.treasury_kind !== 'cash') ||
        (pay.method !== 'cash' && treasury.treasury_kind === 'cash'))
        throw new Error('اختر خزينة أو حسابًا مناسبًا لطريقة الدفع وبنفس عملة البرنامج');
      const payload = {
        organization_id: orgId, pilgrim_id: g.id, customer_id: g.customer_id, amount: pay.amount,
        amount_base: Math.round(pay.amount * pay.exchangeRate * 100) / 100,
        exchange_rate: pay.exchangeRate, client_ref: pay.clientRef,
        currency: program.currency || 'EGP', payment_method: pay.method, treasury_account_id: pay.treasury,
        reference_number: pay.reference || null, payment_date: pay.date,
        notes: `${program.name} · ${g.full_name}`, status: 'completed',
      };
      const { data, error } = await sb.from('customer_payments').insert(payload).select('*').single();
      if (error) {
        if (error.code !== '23505') throw error;
        const prior = await sb.from('customer_payments').select('*')
          .eq('organization_id', orgId).eq('client_ref', pay.clientRef).maybeSingle();
        if (prior.error || !prior.data ||
          prior.data.pilgrim_id !== g.id || Number(prior.data.amount) !== Number(pay.amount) ||
          prior.data.currency !== program.currency || prior.data.status !== 'completed' ||
          prior.data.treasury_account_id !== pay.treasury)
          throw error;
        return { p: prior.data, g: { ...g, paid_amount: Number(g.paid_amount) + Number(pay.amount) } };
      }
      return { p: data, g: { ...g, paid_amount: Number(g.paid_amount) + Number(pay.amount) } };
    },
    onSuccess: ({ p, g }) => {
      setPayFor(null); refresh(); toast({ title: 'تم تسجيل دفعة العميل؛ راجع القيد والتسوية من قسم المالية' });
      printDocument(currentOrganization, 'سند قبض', receiptHtml(p, g, program));
    },
    onError: fail,
  });

  const label = (program?.program_type || type) === 'hajj' ? 'الحاج' : 'المعتمر';
  const passportWarning = (g: any) =>
    Boolean(g.passport_expiry && program?.return_date && g.passport_expiry < program.return_date);

  if (availabilityOpen && orgId) return <PilgrimageAvailabilitySearch key={orgId} orgId={orgId}
    onBack={() => setParams(current => {
      const next = new URLSearchParams(current);
      next.delete('view');
      return next;
    })}
    onOpenQuote={id => setParams(current => {
      const next = new URLSearchParams(current);
      next.delete('view');
      next.set('sale', id);
      return next;
    })} />;

  // Unified commercial quote workspace (Group seats / FIT / B2B).
  if (salesOpen || linkedSaleId) return <PilgrimageSales initialType={type} initialProgram={program}
    initialSaleId={linkedSaleId} onBack={() => {
      setSalesOpen(false);
      if (linkedSaleId) setParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('sale');
        return next;
      }, { replace: true });
    }} />;

  // ===== Program detail =====
  if (program) {
    const active = programPilgrims.filter(isActivePilgrim);
    const retailActiveCount = active.filter(g => !g.b2b_roster_entry_id).length;
    const totals = pilgrimageTotals(programPilgrims);
    const filteredPilgrims = programPilgrims.filter((g) =>
      (!linkedPassengerId || g.id === linkedPassengerId) &&
      [g.full_name, g.name_en, g.phone, g.passport_number, g.room_group].some((v: unknown) => String(v ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    );
    const cost = costs.find((c) => c.program_id === program.id);
    const interestTab = program.program_type === 'umrah' && canViewCRM() && !!orgId;
    const capacity = program.capacity || 'بانتظار التأكيد';
    const registrationBlock = canRegisterPilgrim(program, programPilgrims);
    const requestedTab = params.get('tab');
    const tab = requestedTab && (['rooming', 'payments', 'reports'].includes(requestedTab) || (requestedTab === 'interest' && interestTab) || (requestedTab === 'operations' && operationalUmrah))
      ? requestedTab : 'pilgrims';
    const goToProgramTab = (value: string) => setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === 'pilgrims') next.delete('tab');
      else next.set('tab', value);
      return next;
    }, { replace: true });
    const needsSalesApproval = ['draft', 'open'].includes(program.status) &&
      (!program.sales_confirmed_at || pilgrimageSalesIssues(program).length > 0);
    const editProgram = () => {
      setConfirmSales(false);
      setEditingProgram(true);
      setPf({ ...EMPTY_PROGRAM, ...Object.fromEntries(PROGRAM_FIELDS.map((key) => [key, program[key] ?? ''])),
        cost_per_person: cost?.cost_per_person ?? 0 });
      setProgramOpen(true);
    };
    const canManageOperations = canManage && hasPermission('bookings_edit') && operationRefunds.isSuccess;
    const canRoom = hasPermission('bookings_edit') && (!operationalUmrah || operationRefunds.isSuccess)
      && !['departed', 'completed', 'cancelled'].includes(program.status);
    const groupBy = (key: string) => {
      const m = new Map<string, any[]>();
      active.forEach((g) => { const k = g[key] || 'غير مسكّن'; m.set(k, [...(m.get(k) ?? []), g]); });
      return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'ar', { numeric: true }));
    };
    const roomGroupsById = new Map(roomingGroups.data?.map((group) => [group.id, group]));
    const roomingRows = (key: 'makkah_room' | 'madinah_room') => {
      if (!operationalUmrah) return groupBy(key).flatMap(([room, occ]) => occ.map((g) => [room, g.full_name, genderLabel(g.gender), ROOM[g.room_type], g.room_group || '', g.mahram_name || '']));
      const groupKey = key === 'makkah_room' ? 'makkah_rooming_group_id' : 'madinah_rooming_group_id';
      return active.map((g) => {
        const group = roomGroupsById.get(g[groupKey]);
        return [group ? umrahRoomGroupLabel(group) : 'بانتظار التوزيع', group?.hotel_room_number ?? g[key] ?? '',
          g.full_name, genderLabel(g.gender), ROOM[g.room_type], g.room_group || '', g.mahram_name || ''];
      }).sort((a, b) => a[0].localeCompare(b[0], 'ar', { numeric: true }));
    };
    const roomingHeaders = [...(operationalUmrah ? ['مجموعة التسكين', 'رقم غرفة الفندق'] : ['الغرفة']), 'الاسم', 'النوع', 'الفئة', 'العائلة', 'المحرم'];
    const busRows = groupBy('bus_number').flatMap(([bus, occ]) => occ.map((g) => [bus, g.supervisor || '', g.full_name, g.phone || '']));

    const openEditPilgrim = (g: any) => { setEditingPilgrim(g.id); setGf({ ...EMPTY_PILGRIM, ...Object.fromEntries(PILGRIM_FIELDS.map((k) => [k, g[k] ?? ''])), gender: g.gender }); setPilgrimOpen(true); };

    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setProgramId(null)}><ArrowRight className="h-4 w-4 me-1 rtl:rotate-0 ltr:rotate-180" />كل البرامج</Button>
        <PageHeader
          title={program.name}
          description={`${program.program_type === 'hajj' ? 'حج' : 'عمرة'} · ${program.departure_date ?? '—'} ← ${program.return_date ?? '—'} · مكة ${program.makkah_nights} ليالٍ · المدينة ${program.madinah_nights} ليالٍ`}
          icon={Moon}
          badge={<Badge variant="outline">{programStatusLabel(program)}</Badge>}
          actions={<div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openAvailability}><Search className="h-4 w-4 me-1" />بحث التوافر</Button>
            {canManage && <Button variant="outline" onClick={editProgram}><Pencil className="h-4 w-4 me-1" />تعديل البرنامج</Button>}
            <Button disabled={!!registrationBlock} title={registrationBlock || undefined} onClick={() => { setEditingPilgrim(null); setGf({ ...EMPTY_PILGRIM, gender: operationalUmrah ? null : EMPTY_PILGRIM.gender }); setPilgrimOpen(true); }}><Plus className="h-4 w-4 me-1" />إضافة {label}</Button>
          </div>}
        />
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">إدارة البرنامج</h2>
          {needsSalesApproval && <p className="text-sm text-muted-foreground">{salesConfirmationRequired}</p>}
          <div className="flex flex-wrap gap-2">
            {canManage && needsSalesApproval && <Button size="sm" onClick={editProgram}>مراجعة اعتماد البيع</Button>}
            {interestTab && <Button size="sm" variant={needsSalesApproval && !canManage ? 'default' : 'outline'}
              onClick={() => goToProgramTab('interest')}>طلبات الاهتمام</Button>}
            <Button size="sm" variant="outline" onClick={() => setSalesOpen(true)}>العروض والمقاعد</Button>
            {active.length > 0 && <Button size="sm" variant="outline" onClick={() => goToProgramTab('rooming')}>تسكين المسافرين</Button>}
          </div>
        </Card>
        {program.status === 'draft' && program.notes && <Card className="p-4 text-sm whitespace-pre-wrap text-muted-foreground">{program.notes}</Card>}
        {operationalUmrah && operationRefunds.isError && <Card role="alert" className="flex flex-wrap items-center gap-2 p-4 text-sm text-destructive">
          تعذر تحميل رصيد الاسترداد. أعد المحاولة قبل التحصيل أو تنفيذ تعديل مالي.
          <Button size="sm" variant="outline" onClick={() => operationRefunds.refetch()}>إعادة المحاولة</Button>
        </Card>}
        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-muted-foreground">المسجلون / السعة</p><p className="text-xl font-semibold">{totals.registered} / {capacity}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">مبيعات الأفراد</p><p className="text-xl font-semibold">{fmt(totals.grossDue, program.currency)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">المحصل من الأفراد</p><p className="text-xl font-semibold">{fmt(totals.collected, program.currency)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">المتبقي على الأفراد</p><p className="text-xl font-semibold">{fmt(totals.outstanding, program.currency)}</p></Card>
        </div>
        {totals.refundExposure > 0 && (
          <Card className="p-4 text-sm border-amber-500/60">
            <span className="font-medium">مبالغ محتملة للرد تحتاج مراجعة المالية: </span>
            {fmt(totals.refundExposure, program.currency)}
            <span className="text-muted-foreground ms-2">هذا ليس إثباتًا لتنفيذ استرداد.</span>
          </Card>
        )}
        {canManage && cost && (
          <Card className="p-4 text-sm">
            <span className="text-muted-foreground">للإدارة فقط · التكلفة التقديرية للفرد: </span>{fmt(cost.cost_per_person, program.currency)}
            <span className="text-muted-foreground ms-4">هامش مبيعات الأفراد التقديري: </span>{fmt(totals.grossDue - cost.cost_per_person * retailActiveCount, program.currency)}
          </Card>
        )}

        <Tabs value={tab} onValueChange={goToProgramTab}>
          <TabsList className="h-auto flex-wrap"><TabsTrigger value="pilgrims">المسجلون</TabsTrigger>{interestTab && <TabsTrigger value="interest">طلبات الاهتمام</TabsTrigger>}<TabsTrigger value="rooming">التسكين</TabsTrigger>{operationalUmrah && <TabsTrigger value="operations">التعديلات والإلغاء</TabsTrigger>}<TabsTrigger value="payments">التحصيل</TabsTrigger><TabsTrigger value="reports">الكشوفات</TabsTrigger></TabsList>

          {interestTab && orgId && <TabsContent value="interest">
            <PilgrimageInterest key={`${orgId}:${program.id}`} organizationId={orgId} program={program} canCreate={canCreateCRM() && ['draft', 'open', 'full'].includes(program.status)} />
          </TabsContent>}
          {operationalUmrah && orgId && <TabsContent value="operations">
            <PilgrimageOperations key={`${orgId}:${program.id}`} orgId={orgId} program={program} programs={programs}
              passengers={programPilgrims} canManage={canManageOperations} onChanged={refresh}
              canCancel={hasPermission('bookings_cancel')}
              canViewRefunds={hasPermission('financial_view') && getPermissionScope('financial_view') === 'organization'} />
          </TabsContent>}

          <TabsContent value="pilgrims" className="space-y-3">
            {linkedPassengerId && <Button variant="outline" size="sm" onClick={() => setProgramId(program.id)}>عرض كل مسافري البرنامج</Button>}
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجواز أو الهاتف أو المجموعة" aria-label="بحث المسجلين" />
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>الاسم</TableHead><TableHead>الهاتف</TableHead><TableHead>الجواز</TableHead><TableHead>الغرفة</TableHead>
                  <TableHead>التأشيرة</TableHead><TableHead>الحالة</TableHead><TableHead>السعر</TableHead><TableHead>المدفوع</TableHead><TableHead>المتبقي</TableHead><TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {filteredPilgrims.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">لا توجد نتائج مطابقة.</TableCell></TableRow>}
                  {filteredPilgrims.map((g) => {
                    const cancelled = g.status === 'cancelled';
                    const due = pilgrimDue(g);
                    const issues = readinessIssues(g, program);
                    return (
                      <TableRow key={g.id} className={cancelled ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{g.full_name}{g.b2b_roster_entry_id && <p className="text-xs text-muted-foreground">ضمن اتفاق الوكيل</p>}{g.mahram_name && <p className="text-xs text-muted-foreground">المحرم: {g.mahram_name} ({g.mahram_relation})</p>}</TableCell>
                        <TableCell dir="ltr">{g.phone}</TableCell>
                        <TableCell>
                          {g.passport_number || <span className="text-destructive text-xs">ناقص</span>}
                          {passportWarning(g) && <p className="text-xs text-destructive">الجواز ينتهي قبل العودة</p>}
                        </TableCell>
                        <TableCell>{ROOM[g.room_type]}{(['makkah', 'madinah'] as const).map((city) => {
                          const group = roomGroupsById.get(g[`${city}_rooming_group_id`]);
                          const label = group ? umrahRoomGroupLabel(group) : g[`${city}_room`];
                          return label && <p key={city} className="text-xs text-muted-foreground">{city === 'makkah' ? 'مكة' : 'المدينة'} · {label}</p>;
                        })}</TableCell>
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
                        <TableCell><span>{g.b2b_roster_entry_id ? 'على فاتورة الوكيل' : fmt(due, program.currency)}</span>{!cancelled && issues.length > 0 && <p className="text-xs text-amber-600">{issues.length} نواقص تشغيلية</p>}</TableCell>
                        <TableCell>{g.b2b_roster_entry_id ? '—' : fmt(g.paid_amount, program.currency)}</TableCell>
                        <TableCell>
                          {g.b2b_roster_entry_id ? '—' : fmt(outstanding(g), program.currency)}
                          {refundable(g) > 0 && <p className="text-xs text-destructive">مستحق مراجعة رد {fmt(refundable(g), program.currency)}</p>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {(operationalUmrah ? operationRefunds.isSuccess : !cancelled) && canManage && outstanding(g) > 0 && <Button size="icon" variant="ghost" title="تحصيل دفعة" onClick={() => { setPayFor(g); setPay({ amount: outstanding(g), method: 'cash', treasury: '', reference: '',
  date: new Date().toISOString().slice(0, 10),
  exchangeRate: program.currency === 'EGP' ? 1 : 0,
  clientRef: crypto.randomUUID() }); }}><Wallet className="h-4 w-4" /></Button>}
                          {!g.b2b_roster_entry_id && <Button size="icon" variant="ghost" title="طباعة العقد" onClick={() => printDocument(currentOrganization, `عقد برنامج ${program.name}`, contractHtml(g, program))}><FileText className="h-4 w-4" /></Button>}
                          {(!g.b2b_roster_entry_id || !cancelled) && <Button size="icon" variant="ghost" title="تعديل" onClick={() => openEditPilgrim(g)}><Pencil className="h-4 w-4" /></Button>}
                          {!g.b2b_roster_entry_id && !cancelled && canManage && <Button size="icon" variant="ghost" title="إلغاء" onClick={() => {
                            if (operationalUmrah) setParams((current) => { const next = new URLSearchParams(current); next.set('tab', 'operations'); return next; });
                            else { setCancelFor(g); setFee(0); }
                          }}><Ban className="h-4 w-4 text-destructive" /></Button>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="rooming" className="space-y-4">
            {operationalUmrah && roomingGroups.isPending && <p className="text-sm text-muted-foreground">جارٍ تحميل التسكين…</p>}
            {operationalUmrah && roomingGroups.isError && <Button variant="outline" onClick={() => roomingGroups.refetch()}>تعذر تحميل التسكين. إعادة المحاولة</Button>}
            {operationalUmrah && orgId && roomingGroups.data && <UmrahRooming key={`${orgId}:${program.id}`} orgId={orgId} programId={program.id}
              passengers={active} groups={roomingGroups.data} hotels={{ makkah: program.makkah_hotel, madinah: program.madinah_hotel }}
              canEdit={canRoom} onChange={refresh} onEditPassenger={(id) => {
                const person = programPilgrims.find((g) => g.id === id);
                if (person) openEditPilgrim(person);
              }} />}
            {!operationalUmrah && (['makkah_room', 'madinah_room'] as const).map((key) => (
              <Card key={key} className="p-4">
                <h3 className="font-semibold mb-3">{key === 'makkah_room' ? `مكة · ${program.makkah_hotel || '—'}` : `المدينة · ${program.madinah_hotel || '—'}`}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupBy(key).map(([room, occ]) => {
                    const issues = room === 'غير مسكّن' ? [] : roomIssues(occ, occ[0].room_type);
                    return (
                      <div key={room} className={`rounded-md border p-3 text-sm ${issues.length ? 'border-destructive' : ''}`}>
                        <p className="font-medium">{room === 'غير مسكّن' ? room : `غرفة ${room}`} <span className="text-muted-foreground">({occ.length})</span></p>
                        {occ.map((g) => <div key={g.id} className="flex items-center justify-between gap-2">
                          <p className="text-muted-foreground">{g.full_name} · {genderLabel(g.gender)} · {ROOM[g.room_type]}</p>
                          {canRoom && !['traveled', 'completed'].includes(g.status) && <Button size="sm" variant="ghost" onClick={() => setRoomingFor({ id: g.id, name: g.full_name, city: key, room: g[key] || '' })}>{g[key] ? 'نقل الغرفة' : 'تسكين'}</Button>}
                        </div>)}
                        {issues.map((i) => <p key={i} className="text-xs text-destructive">{i}</p>)}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
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
                        <TableCell>{p.status === 'completed' ? <Button size="sm" variant="ghost" onClick={() => printDocument(currentOrganization, 'سند قبض', receiptHtml(p, g, program))}><Printer className="h-4 w-4 me-1" />سند</Button> : <Badge variant="outline">دفعة {p.status === 'reversed' ? 'معكوسة' : 'معلقة'}</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-3">
            <p className="text-xs text-muted-foreground">الكشوفات التشغيلية داخل الشركة فقط؛ تأكد من مستندات السفر وشروط الموسم المعتمدة قبل مشاركتها خارجيًا.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { t: 'كشف الطيران والجوازات', h: MANIFEST_HEADERS, r: () => manifestRows(active), ltr: true },
                { t: 'كشف تسكين مكة', h: roomingHeaders, r: () => roomingRows('makkah_room'), blocked: operationalUmrah && !roomingGroups.isSuccess },
                { t: 'كشف تسكين المدينة', h: roomingHeaders, r: () => roomingRows('madinah_room'), blocked: operationalUmrah && !roomingGroups.isSuccess },
                { t: 'كشف الحافلات والمشرفين', h: ['الحافلة', 'المشرف', 'الاسم', 'الهاتف'], r: () => busRows },
                { t: 'كشف حالة التأشيرات', h: ['الاسم', 'رقم الجواز', 'التأشيرة', 'رقم التأشيرة', 'باركود المنصة'], r: () => active.map((g) => [g.full_name, g.passport_number || '', VISA[g.visa_status] || '', g.visa_number || '', g.portal_barcode || '']) },
                { t: 'كشف النواقص والجاهزية', h: ['الاسم', 'الحالة', 'النواقص'], r: () => active.map((g) => [g.full_name, PILGRIM_STATUS[g.status] || '', readinessIssues(g, program).join('؛ ') || 'مكتمل تشغيليًا']) },
                { t: 'كشف تحصيل الأفراد والمتبقي', h: ['الاسم', 'المستحق', 'المدفوع', 'المتبقي', 'مراجعة رد'], r: () => programPilgrims.filter(g => !g.b2b_roster_entry_id).map((g) => [g.full_name, pilgrimDue(g), g.paid_amount, outstanding(g), refundable(g)]) },
              ].map((rep) => (
                <Card key={rep.t} className="p-4 space-y-3">
                  <p className="font-medium">{rep.t}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={rep.blocked} onClick={() => printDocument(currentOrganization, `${rep.t} · ${program.name}`, table(rep.h, rep.r()))}><Printer className="h-4 w-4 me-1" />PDF / طباعة</Button>
                    <Button size="sm" variant="outline" disabled={rep.blocked} onClick={() => exportExcel(`${rep.t} - ${program.name}`, [{ name: rep.t, headers: rep.h, rows: rep.r() }])}><FileSpreadsheet className="h-4 w-4 me-1" />Excel</Button>
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
              ] as [string, string, string?][]).filter(([k]) => !operationalUmrah || !['makkah_room', 'madinah_room'].includes(k)).map(([k, l, kind]) => (
                <F key={k} label={l}><Input type={kind === 'date' ? 'date' : 'text'} dir={kind === 'ltr' ? 'ltr' : undefined} value={gf[k] ?? ''} onChange={(e) => setGf({ ...gf, [k]: e.target.value })} /></F>
              ))}
              <F label="النوع">
                <Select value={gf.gender || '__none__'} onValueChange={(v) => setGf({ ...gf, gender: v === '__none__' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">غير محدد</SelectItem><SelectItem value="male">ذكر</SelectItem><SelectItem value="female">أنثى</SelectItem></SelectContent></Select>
              </F>
              <F label="نوع الغرفة">
                <Select value={gf.room_type} disabled={!!editingPilgrim && operationalUmrah && !programPilgrims.find((g) => g.id === editingPilgrim)?.b2b_roster_entry_id} onValueChange={(v) => setGf({ ...gf, room_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ROOM).map(([k, v]) => <SelectItem key={k} value={k}>{v}{!programPilgrims.find(g => g.id === editingPilgrim)?.b2b_roster_entry_id && ` · ${fmt(priceFor(program, k), program.currency)}`}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="ملف المستندات مكتمل">
                <div className="flex items-center gap-2 pt-2"><Checkbox checked={!!gf.documents_complete} onCheckedChange={(v) => setGf({ ...gf, documents_complete: v === true })} /><span className="text-sm">تمت مراجعة المستندات يدويًا</span></div>
              </F>
              <F label="حالة التطعيمات (تسجيل إداري)">
                <div className="flex items-center gap-2 pt-2"><Checkbox checked={!!gf.vaccination_done} onCheckedChange={(v) => setGf({ ...gf, vaccination_done: v === true })} /><span className="text-sm">تمت مراجعة المستندات الطبية المطلوبة للموسم</span></div>
              </F>
              <F label="ملاحظات" wide><Textarea value={gf.notes ?? ''} onChange={(e) => setGf({ ...gf, notes: e.target.value })} /></F>
            </div>
            {pilgrimOpen && editingPilgrim && canManage && orgId && (
              <PrivateRecordAttachments key={editingPilgrim} bucket="pilgrimage-attachments"
                organizationId={orgId} recordId={editingPilgrim}
                canUpload={programPilgrims.some(pilgrim => pilgrim.id === editingPilgrim && pilgrim.status !== 'cancelled')} />
            )}
            {!editingPilgrim && <p className="text-xs text-muted-foreground">يُربط المسافر بملف العميل الحالي فقط عند تطابق رقم الجواز بدقة؛ تشابه الهاتف وحده لا يكفي لأن الأسرة قد تشترك في رقم واحد. الدفعات تُسجَّل من زر التحصيل.</p>}
            <Button className="w-full" disabled={gf.full_name.trim().length < 3 || savePilgrim.isPending} onClick={() => savePilgrim.mutate()}>حفظ</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={!!roomingFor} onOpenChange={(open) => { if (!open && !patchPilgrim.isPending) setRoomingFor(null); }}>
          {roomingFor && <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>تسكين {roomingFor.name} في {roomingFor.city === 'makkah_room' ? 'مكة' : 'المدينة'}</DialogTitle></DialogHeader>
            <Label htmlFor="pilgrimage-room-number">رقم الغرفة</Label>
            <Input id="pilgrimage-room-number" maxLength={50} value={roomingFor.room} onChange={(event) => setRoomingFor({ ...roomingFor, room: event.target.value })} />
            <Button disabled={patchPilgrim.isPending} onClick={() => patchPilgrim.mutate({ id: roomingFor.id, patch: { [roomingFor.city]: roomingFor.room.trim() || null } }, {
              onSuccess: () => { setRoomingFor(null); toast({ title: 'تم تحديث التسكين' }); },
            })}>حفظ التسكين</Button>
          </DialogContent>}
        </Dialog>
        <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>سند قبض · {payFor?.full_name}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">المتبقي: {payFor && fmt(outstanding(payFor), program.currency)}. لا تُعتبر الدفعة مستلمة إلا بعد نجاح التسجيل المحاسبي.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="المبلغ"><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} /></F>
              <F label="التاريخ"><Input type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></F>
              <F label="طريقة الدفع">
                <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v, treasury: '' })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">نقدي</SelectItem><SelectItem value="bank_transfer">تحويل بنكي</SelectItem></SelectContent></Select>
              </F>
              <F label="الخزينة / الحساب">
                <Select value={pay.treasury} onValueChange={(v) => setPay({ ...pay, treasury: v })}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{treasuries.filter((t) => (t.currency || 'EGP') === (program.currency || 'EGP') && (pay.method === 'cash' ? t.treasury_kind === 'cash' : t.treasury_kind !== 'cash')).map((t) => <SelectItem key={t.id} value={t.id}>{t.account_name || t.bank_name}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="معامل التحويل إلى عملة الدفتر"><Input type="number" min="0" step="0.000001" value={pay.exchangeRate} onChange={(e) => setPay({ ...pay, exchangeRate: Number(e.target.value) })} /></F>
              <F label="رقم المرجع (اختياري)" wide><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></F>
            </div>
            <Button className="w-full" disabled={collect.isPending} onClick={() => collect.mutate()}>تسجيل وطباعة السند</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={!!cancelFor} onOpenChange={(o) => !o && setCancelFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>إلغاء تسجيل {cancelFor?.full_name}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">المدفوع: {cancelFor && fmt(cancelFor.paid_amount, program.currency)}. أدخل رسوم الإلغاء حسب سياسة الشركة؛ الفرق يظهر كمستحق رد ويُصرف من طلبات الاسترداد في المالية.</p>
            <F label="رسوم الإلغاء"><Input type="number" min="0" max={cancelFor?.total_price || 0} value={fee} onChange={(e) => setFee(Math.max(0, Number(e.target.value)))} /></F>
            <Button variant="destructive" className="w-full" disabled={patchPilgrim.isPending || fee > Number(cancelFor?.total_price ?? 0)} onClick={() => { patchPilgrim.mutate({ id: cancelFor.id, patch: { status: 'cancelled', cancellation_fee: fee, cancelled_at: new Date().toISOString() } }); setCancelFor(null); }}>تأكيد الإلغاء</Button>
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
            <F label="مسار الرحلة">
              <Select value={pf.travel_scope || 'international'} disabled={editingProgram && programPilgrims.length > 0} onValueChange={(v) => setPf({ ...pf, travel_scope: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="international">رحلة دولية</SelectItem><SelectItem value="domestic">رحلة داخلية بالمملكة</SelectItem></SelectContent>
              </Select>
            </F>
            <F label="عملة البرنامج">
              <Select value={pf.currency || 'EGP'} disabled={editingProgram && programPilgrims.length > 0} onValueChange={(v) => { setConfirmSales(false); setPf({ ...pf, currency: v }); }}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['EGP', 'SAR', 'USD', 'EUR'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="الحالة">
              <Select value={pf.status} onValueChange={(v) => setPf({ ...pf, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PROGRAM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            </F>
            {([['capacity', 'السعة (عدد الأفراد)', 'number'], ['departure_date', 'تاريخ السفر', 'date'], ['return_date', 'تاريخ العودة', 'date'],
              ['makkah_hotel', 'فندق مكة'], ['makkah_nights', 'ليالي مكة', 'number'], ['madinah_hotel', 'فندق المدينة'], ['madinah_nights', 'ليالي المدينة', 'number'],
              ['airline', 'شركة الطيران'], ['flight_details', 'تفاصيل الرحلات'], ['transport_details', 'النقل والتنقلات'],
              ['price_quad', 'سعر البيع - رباعية', 'number'], ['price_triple', 'سعر البيع - ثلاثية', 'number'], ['price_double', 'سعر البيع - ثنائية', 'number'], ['price_single', 'سعر البيع - فردية', 'number'],
            ] as [string, string, string?][]).map(([k, l, kind]) => (
              <F key={k} label={l}><Input type={kind ?? 'text'} value={pf[k] ?? ''} onChange={(e) => {
                if (SALES_FIELDS.includes(k)) setConfirmSales(false);
                setPf({ ...pf, [k]: kind === 'number' ? Number(e.target.value) : e.target.value });
              }} /></F>
            ))}
            <div className="space-y-2 rounded-md border p-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={salesConfirmed || confirmSales} disabled={salesConfirmed || salesIssues.length > 0}
                  onCheckedChange={(value) => setConfirmSales(value === true)} />
                أؤكد اعتماد تواريخ السفر والعودة وأسعار البيع وسعة البرنامج
              </label>
              {salesIssues.length > 0 && <p className="text-sm text-muted-foreground">المطلوب للاعتماد: {salesIssues.join('، ')}</p>}
            </div>
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
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openAvailability}><Search className="h-4 w-4 me-1" />بحث التوافر</Button>
          <Button variant="outline" onClick={() => setSalesOpen(true)}>مبيعات Group / FIT / B2B</Button>
          {canManage && <Button onClick={() => { setConfirmSales(false); setEditingProgram(false); setPf({ ...EMPTY_PROGRAM }); setProgramOpen(true); }}><Plus className="h-4 w-4 me-1" />برنامج جديد</Button>}
        </div>}
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
              <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{p.name}</h3><Badge variant="outline">{programStatusLabel(p)}</Badge></div>
              <p className="mt-1 text-xs text-muted-foreground">{p.season} · {p.departure_date ?? '—'} ← {p.return_date ?? '—'}</p>
              <p className="mt-3 text-sm">مكة: {p.makkah_hotel || '—'} · المدينة: {p.madinah_hotel || '—'}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" />{count} / {p.capacity || 'بانتظار التأكيد'}</span>
                <span>{p.sales_confirmed_at && pilgrimageSalesIssues(p).length === 0
                  ? `من ${fmt(Math.min(...[p.price_quad, p.price_triple, p.price_double, p.price_single].map(Number).filter((price) => price > 0)), p.currency)}`
                  : 'السعر بانتظار التأكيد'}</span>
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
