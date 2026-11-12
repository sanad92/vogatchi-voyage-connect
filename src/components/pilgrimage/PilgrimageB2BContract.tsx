import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { money, printDocument, table } from './pilgrimage-documents';

const sb = supabase as any;
type Installment = { due_date: string; amount: number };
type Props = {
  orgId: string;
  sale: any;
  agencyName: string;
  customers: any[];
  items: any[];
  allocation: any | null;
  organization: any;
  canManage: boolean;
};

export default function PilgrimageB2BContract({
  orgId, sale, agencyName, customers, items,
  allocation, organization, canManage,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const total = Math.round(items.reduce((n, x) => n + Number(x.line_sell || 0), 0) * 100) / 100;
  const [debtor, setDebtor] = useState('');
  const [terms, setTerms] = useState('شروط وجدول دفعات مبدئيان يخضعان لاعتماد الشركة والتحقق من التوافر.');
  const [schedule, setSchedule] = useState<Installment[]>([{due_date:'',amount:0}]);
  const [rosterName,setRosterName] = useState('');
  const [rosterRoom,setRosterRoom] = useState('');
  const [rosterKey,setRosterKey] = useState(()=>crypto.randomUUID());

  const agreementQ = useQuery({
    queryKey:['pilgrimage-b2b-agreement',orgId,sale.id],
    enabled:!!orgId && !!sale?.id && canManage,
    queryFn:async()=>{
      const {data,error}=await sb.from('pilgrimage_b2b_agreements')
        .select('id,agency_id,debtor_customer_id,total_contract_amount,currency,terms,status,created_at,approved_at')
        .eq('organization_id',orgId).eq('sale_id',sale.id).maybeSingle();
      if(error)throw error;
      return data;
    },
  });
  const agreement=agreementQ.data;
  const installmentsQ=useQuery({
    queryKey:['pilgrimage-b2b-installments',orgId,agreement?.id],
    enabled:!!orgId && !!agreement?.id && canManage,
    queryFn:async()=>{
      const {data,error}=await sb.from('pilgrimage_b2b_installments')
        .select('sequence_no,due_date,amount,currency').eq('organization_id',orgId)
        .eq('agreement_id',agreement.id).order('sequence_no');
      if(error)throw error;
      return data||[];
    },
  });

  const rosterQ=useQuery({
    queryKey:['pilgrimage-b2b-roster',orgId,agreement?.id],
    enabled:!!orgId&&!!agreement?.id&&canManage,
    queryFn:async()=>{
      const {data,error}=await sb.from('pilgrimage_b2b_roster_entries')
        .select('id,display_name,room_type,status,created_at,removed_at')
        .eq('organization_id',orgId).eq('agreement_id',agreement.id)
        .order('created_at');
      if(error)throw error;
      return data||[];
    },
  });
  const activeRoster=(rosterQ.data||[]).filter((x:any)=>x.status==='active');
  const reload=()=>{
    qc.invalidateQueries({queryKey:['pilgrimage-b2b-agreement',orgId,sale.id]});
    qc.invalidateQueries({queryKey:['pilgrimage-b2b-installments',orgId]});
    qc.invalidateQueries({queryKey:['pilgrimage-b2b-roster',orgId]});
  };
  const fail=(e:any)=>toast({
    title:'تعذر اعتماد عقد الشركة',description:e?.message||'تحقق من العميل والشروط',
    variant:'destructive',
  });

  const create=useMutation({
    mutationFn:async()=>{
      if(sale.status!=='quoted'||sale.sale_model!=='b2b_group')throw new Error('لا يوجد عرض B2B صادر');
      if(!debtor)throw new Error('اختر حساب شركة السياحة المشترية من دليل عملاء CRM');
      if(terms.trim().length<5)throw new Error('أدخل شروط الاتفاق التجاري');
      if(schedule.length<1||schedule.length>12)throw new Error('عدد الدفعات من 1 إلى 12');
      if(schedule.some(x=>!x.due_date || !Number.isFinite(x.amount) ||
        x.amount<=0 || Math.round(x.amount*100)!==x.amount*100))
        throw new Error('تأكد من تواريخ الدفعات ومبالغها بدقتين عشريتين');
      const sum=Math.round(schedule.reduce((n,x)=>n+x.amount,0)*100)/100;
      if(Math.abs(sum-total)>0.001)throw new Error('مجموع الدفعات لا يساوي إجمالي عرض السعر');
      const {data,error}=await sb.rpc('prepare_pilgrimage_b2b_agreement',{
        _sale_id:sale.id,_debtor_customer_id:debtor,
        _terms:terms.trim(),_installments:schedule,
      });
      if(error)throw error;
      return data;
    },
    onSuccess:()=>{
      reload();toast({title:'تم حفظ مسودة الاتفاق وجدول الدفعات للشركة',
        description:'لم يُصدر قيد محاسبي أو فاتورة أو سند تحصيل.'});
    },onError:fail,
  });
  const approve=useMutation({
    mutationFn:async()=>{
      if(!agreement?.id || allocation?.status!=='allocated')
        throw new Error('يجب تخصيص المقاعد داخليًا قبل اعتماد اتفاق المجموعة');
      const {data,error}=await sb.rpc('approve_pilgrimage_b2b_agreement',{
        _agreement_id:agreement.id,
      });
      if(error)throw error;
      return data;
    },
    onSuccess:()=>{
      reload();toast({title:'تمت الموافقة الداخلية على الاتفاق',
        description:'هذا ليس عقدًا موقعًا أو فاتورة مُرحّلة أو تأكيدًا من المورد.'});
    },onError:fail,
  });

  const addRosterName=useMutation({
    mutationFn:async()=>{
      if(!agreement?.id||agreement.status!=='approved_internal')
        throw new Error('الاسماء التشغيلية متاحة بعد الموافقة الداخلية على العقد');
      if(rosterName.trim().length<3)throw new Error('أدخل اسم المسافر كاملًا');
      const {data,error}=await sb.rpc('add_pilgrimage_b2b_roster_name',{
        _agreement_id:agreement.id,_client_key:rosterKey,
        _display_name:rosterName.trim(),_room_type:rosterRoom||null,
      });
      if(error)throw error;
      return data;
    },
    onSuccess:()=>{
      reload();setRosterName('');setRosterRoom('');setRosterKey(crypto.randomUUID());
      toast({title:'تمت إضافة الاسم إلى كشف الشركة المبدئي'});
    },onError:fail,
  });
  const removeRosterName=useMutation({
    mutationFn:async(id:string)=>{
      const {error}=await sb.rpc('remove_pilgrimage_b2b_roster_name',{_entry_id:id});
      if(error)throw error;
    },
    onSuccess:()=>{
      reload();toast({title:'تم شطب الاسم من الكشف المبدئي مع الاحتفاظ بالسجل'});
    },onError:fail,
  });
  const print=()=>{
    if(!agreement)return;
    const name=customers.find(x=>x.id===agreement.debtor_customer_id)?.name||'غير محدد';
    const installmentRows=(installmentsQ.data||[]).map((x:any)=>[
      x.sequence_no,x.due_date,money(x.amount,agreement.currency),
    ]);
    const body=table(['البيان','البيانات'],[
      ['الطرف المشتري',agencyName],['الحساب المختار من CRM',name],
      ['عرض السعر',sale.name],['عدد الأفراد',sale.party_size],
      ['القيمة التعاقدية المبدئية',money(agreement.total_contract_amount,agreement.currency)],
      ['الحالة',agreement.status==='approved_internal'?'موافق عليه داخليًا':'مسودة داخلية'],
      ['الشروط',agreement.terms],
    ])+
    '<h2>الدفعات المتفق عليها مبدئيًا</h2>'+
    table(['رقم','الاستحقاق','القيمة'],installmentRows)+
    (agreement.status==='approved_internal'&&activeRoster.length>0?
      '<h2>كشف أسماء مبدئي غير مسجّل رسميًا</h2>'+
      table(['الاسم','فئة الغرفة'],activeRoster.map((x:any)=>[x.display_name,x.room_type||'غير محددة']))
      :'')+
    '<p class="muted">مستند تجاري داخلي غير موقع. لا يمثل فاتورة ضريبية، أو إثبات تحصيل، '+
    'أو حجز مورّد مؤكد، أو تأشيرة، أو تصريح حج أو عمرة.</p>';
    printDocument(organization,'مسودة اتفاق مجموعة B2B (غير موقع)',body);
  };

  if(!canManage)return null;
  return <Card className="p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">عقد مجموعة شركة السياحة وحسابها</h3>
      {agreement&&<Badge variant="outline">
        {agreement.status==='approved_internal'?'معتمد داخليًا':
          agreement.status==='voided'?'ملغي':'مسودة عقد'}
      </Badge>}
    </div>
    <p className="text-sm text-muted-foreground">
      الشركة المشترية: {agencyName||'—'} · إجمالي العرض {money(total,sale.currency)}
      . المدين هو **الشركة المشترية** بحساب CRM مستقل، وليس المسافرين واحدًا واحدًا.
    </p>
    {agreementQ.error&&<p className="text-destructive text-sm">
      تعذر تحميل بيانات العقد. لا يتم اعتماد أي اتفاق قبل تجهيز مخطط B2B في قاعدة اختبار منفصلة.
    </p>}
    {!agreement && !agreementQ.isLoading && !agreementQ.error && <div className="space-y-3 border-t pt-3">
      <div className="space-y-1.5">
        <Label>حساب شركة السياحة في CRM (وليس ملف أحد المعتمرين)</Label>
        <Select value={debtor} onValueChange={setDebtor}>
          <SelectTrigger><SelectValue placeholder="اختر ملف الشركة المدين"/></SelectTrigger>
          <SelectContent>
            {customers.map((x:any)=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          لو الشركة مش موجودة في CRM، أضف لها ملف مستقل أولًا ثم اختاره هنا.
          النظام لا يستطيع التأكد تلقائيًا أن ملف CRM يمثل كيانًا اعتباريًا.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>الشروط التجارية الداخلية</Label>
        <Textarea value={terms} onChange={e=>setTerms(e.target.value)} rows={3}/>
      </div>
      <div className="flex items-center justify-between">
        <Label>جدول الدفعات المتوقع (غير مُرحّل)</Label>
        <Button size="sm" variant="outline" disabled={schedule.length>=12}
          onClick={()=>setSchedule(x=>[...x,{due_date:'',amount:0}])}>
          <Plus className="h-4 w-4 me-1"/>دفعة
        </Button>
      </div>
      {schedule.map((row,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div className="space-y-1"><Label>استحقاق {i+1}</Label><Input type="date"
          value={row.due_date} onChange={e=>setSchedule(xs=>xs.map((x,k)=>
            i===k?{...x,due_date:e.target.value}:x))}/></div>
        <div className="space-y-1"><Label>المبلغ {sale.currency}</Label>
          <Input type="number" min="0.01" step="0.01" value={row.amount}
            onChange={e=>setSchedule(xs=>xs.map((x,k)=>i===k?
              {...x,amount:Number(e.target.value)}:x))}/>
        </div>
        <Button size="icon" variant="outline" title="حذف دفعة"
          disabled={schedule.length===1} onClick={()=>setSchedule(xs=>xs.filter((_,k)=>i!==k))}>
          <Trash2 className="h-4 w-4"/>
        </Button>
      </div>)}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">مجموع الدفعات: {money(
          schedule.reduce((n,x)=>n+Number(x.amount||0),0),sale.currency
        )}</p>
        <Button size="sm" variant="outline" onClick={()=>setSchedule([{due_date:'',amount:total}])}>
          دفعة واحدة بكامل قيمة العرض
        </Button>
      </div>
      <Button disabled={create.isPending || !items.length} onClick={()=>create.mutate()}>
        حفظ مسودة عقد شركة السياحة
      </Button>
    </div>}

    {agreement&&<div className="space-y-3 border-t pt-3">
      <p className="text-sm">المدين (CRM): {
        customers.find(x=>x.id===agreement.debtor_customer_id)?.name||'ملف شركة مرتبط'
      }</p>
      <p className="text-sm">قيمة العقد: {money(agreement.total_contract_amount,agreement.currency)}</p>
      <p className="text-sm whitespace-pre-wrap">الشروط: {agreement.terms}</p>
      <div className="space-y-1.5">
        <Label>الدفعات المحددة على العقد</Label>
        {installmentsQ.error&&<p className="text-sm text-destructive">تعذر قراءة جدول الدفعات</p>}
        {(installmentsQ.data||[]).map((x:any)=><p key={x.sequence_no} className="text-sm">
          دفعة {x.sequence_no} — {x.due_date} — {money(x.amount,x.currency)}
        </p>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={print} disabled={installmentsQ.isLoading||!!installmentsQ.error}>
          <FileText className="h-4 w-4 me-1"/>طباعة ملخص داخلي
        </Button>
        {agreement.status==='draft'&&<Button
          disabled={approve.isPending||allocation?.status!=='allocated'}
          onClick={()=>approve.mutate()}>موافقة داخلية على العقد</Button>}
      </div>
      {agreement.status==='draft'&&allocation?.status!=='allocated'&&
        <p className="text-xs text-amber-700 dark:text-amber-300">
          قبل الموافقة الداخلية يجب تثبيت تخصيص مقاعد المجموعة في نفس البرنامج.
          لا يمكن اعتماد مجموعات غير مرتبطة ببرنامج دون مسار عقود الموردين.
        </p>}
    </div>}
    <p className="text-xs text-amber-700 dark:text-amber-300">
      هذه جدولة تعاقدية مبدئية وليست ذممًا أو إيرادًا محاسبيًا. إصدار الفاتورة،
      تحصيل المقدمات، قيود الموردين والاسترداد تتطلب دورة مالية معتمدة مستقلة.
      وبعد الموافقة الداخلية لا يمكن تحرير المقاعد تلقائيًا دون مراجعة مالية.
    </p>
  </Card>;
}
