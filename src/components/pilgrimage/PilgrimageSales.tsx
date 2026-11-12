import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileSpreadsheet, FileText, Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { money, printDocument, table, exportExcel, ROOM } from './pilgrimage-documents';
import {
  FULFILLMENT, SALE_MODELS, SALE_STATES, SALE_ITEMS,
  quoteMetrics, quoteReadiness, validateSaleDraft,
  type SaleDraft, type SaleModel, type SaleItemKind,
} from '@/lib/pilgrimage/sales';

const sb = supabase as any;
const NONE = '__none__';
const selection = (v: string | null | undefined) => v || NONE;
const resolved = (v: string) => v === NONE ? null : v;
const Field = ({ name, children }: { name:string; children:ReactNode }) =>
  <div className="space-y-1.5"><Label>{name}</Label>{children}</div>;
const fresh = (type:'hajj'|'umrah', program?:any):SaleDraft => ({
  name:'', program_type:type, sale_model:'group_seat', fulfillment_role:'organizer',
  program_id:program?.id||null, buyer_customer_id:null, buyer_agency_id:null,
  upstream_supplier_id:null, party_size:1, currency:program?.currency||'EGP',
  departure_date:program?.departure_date||null,return_date:program?.return_date||null,notes:null,
});
type Props={onBack:()=>void;initialType:'hajj'|'umrah';initialProgram?:any|null};
function useRows(key:string,orgId:string|null,subject:string|null,fn:()=>any,enabled=true) {
  return useQuery<any[]>({
    queryKey:[key,orgId,subject],enabled:!!orgId&&enabled,
    queryFn:async()=>{
      const {data,error}=await fn();
      if(error)throw error;
      return data||[];
    },
  });
}

export default function PilgrimageSales({onBack,initialType,initialProgram}:Props) {
  const orgId=useOrgId();
  const {orgRole,currentOrganization}=useOrganization();
  const canManage=['owner','admin','manager'].includes(orgRole||'');
  const {toast}=useToast();
  const qc=useQueryClient();
  const [type,setType]=useState<'hajj'|'umrah'>(initialType);
  const [saleId,setSaleId]=useState<string|null>(null);
  const [createOpen,setCreateOpen]=useState(false);
  const [agencyOpen,setAgencyOpen]=useState(false);
  const [confirmConversionOpen,setConfirmConversionOpen]=useState(false);
  const [draft,setDraft]=useState<SaleDraft>(()=>fresh(initialType,initialProgram));
  const [agency,setAgency]=useState({name:'',contact_name:'',phone:'',email:''});
  const [line,setLine]=useState({item_kind:'program_seat' as SaleItemKind,description:'',
    room_type:'quad',quantity:1,unit_sell:0});
  const [costLine,setCostLine]=useState<any>(null);
  const [costInput,setCostInput]=useState({unit_cost:0,supplier_id:''});
  const [traveler,setTraveler]=useState({display_name:'',customer_id:'',pilgrim_id:'',room_type:''});

  const salesQ=useRows('pilgrimage-sales',orgId,null,
    ()=>sb.from('pilgrimage_sales').select('*').eq('organization_id',orgId)
      .order('created_at',{ascending:false}));
  const partnersQ=useRows('pilgrimage-agencies',orgId,null,
    ()=>sb.from('pilgrimage_agencies').select('id,name').eq('organization_id',orgId)
      .order('name'),canManage);
  const customersQ=useRows('pilgrimage-sale-customers',orgId,null,
    ()=>sb.from('customers').select('id,name').eq('organization_id',orgId)
      .is('archived_at',null).order('name').limit(200),canManage);
  const suppliersQ=useRows('pilgrimage-sale-suppliers',orgId,null,
    ()=>sb.from('suppliers').select('id,name').eq('organization_id',orgId)
      .eq('is_active',true).order('name').limit(200),canManage);
  const programsQ=useRows('pilgrimage-sale-programs',orgId,null,
    ()=>sb.from('pilgrimage_programs').select('id,name,program_type,currency,status,capacity,departure_date,return_date')
      .eq('organization_id',orgId).order('departure_date',{ascending:false}),canManage);
  const selected=(salesQ.data||[]).find((s:any)=>s.id===saleId)||null;
  const itemsQ=useRows('pilgrimage-sale-items',orgId,saleId,
    ()=>sb.from('pilgrimage_sale_items').select('*').eq('organization_id',orgId)
      .eq('sale_id',saleId).order('created_at'),!!saleId);
  const items=itemsQ.data||[];
  const costsQ=useRows('pilgrimage-sale-costs',orgId,saleId,
    ()=>sb.from('pilgrimage_sale_item_costs').select('*').eq('organization_id',orgId)
      .in('item_id',items.map((x:any)=>x.id)),canManage&&items.length>0);
  const travelersQ=useRows('pilgrimage-sale-travelers',orgId,saleId,
    ()=>sb.from('pilgrimage_sale_travelers').select('*').eq('organization_id',orgId)
      .eq('sale_id',saleId).order('created_at'),!!saleId);
  const conversionsQ=useRows('pilgrimage-retail-conversions',orgId,saleId,
    ()=>sb.from('pilgrimage_retail_conversions')
      .select('id,registered_count,converted_at')
      .eq('organization_id',orgId).eq('sale_id',saleId),!!saleId);
  const conversion=conversionsQ.data?.[0]||null;
  const allocationsQ=useRows('pilgrimage-seat-allocations',orgId,selected?.program_id||null,
    ()=>sb.from('pilgrimage_seat_allocations')
      .select('id,sale_id,status,seat_count,hold_expires_at,allocated_at,released_at')
      .eq('organization_id',orgId).eq('program_id',selected.program_id),
    !!selected?.program_id);
  const allocations=allocationsQ.data||[];
  const allocation=allocations.find((a:any)=>a.sale_id===selected?.id)||null;
  const allocationActive=(a:any)=>a?.status==='allocated' ||
    (a?.status==='held' && !!a.hold_expires_at && new Date(a.hold_expires_at).getTime()>Date.now());
  const allocationIsActive=!!allocation && allocationActive(allocation);
  const eventsQ=useRows('pilgrimage-seat-events',orgId,allocation?.id||null,
    ()=>sb.from('pilgrimage_seat_allocation_events')
      .select('id,action,seat_count,event_at')
      .eq('organization_id',orgId).eq('allocation_id',allocation.id)
      .order('event_at',{ascending:false}).limit(20),
    !!allocation?.id);
  const programAllocationCount=allocations.filter(allocationActive)
    .reduce((sum:number,a:any)=>sum+Number(a.seat_count||0),0);
  const pilgrimsQ=useRows('pilgrimage-sale-pilgrims',orgId,selected?.program_id||null,
    ()=>sb.from('pilgrims').select('id,full_name').eq('organization_id',orgId)
      .eq('program_id',selected.program_id).neq('status','cancelled'),
    canManage&&!!selected?.program_id);
  const costs=costsQ.data||[];
  const customers=customersQ.data||[];
  const agencies=partnersQ.data||[];
  const suppliers=suppliersQ.data||[];
  const programs=programsQ.data||[];
  const travelers=travelersQ.data||[];
  const metrics=quoteMetrics(items,costs);
  const canEdit=canManage&&selected?.status==='draft';
  const selectedProgram=programs.find((p:any)=>p.id===draft.program_id)||null;

  const fail=(error:any)=>toast({title:'لم يتم الحفظ',description:error?.message||'راجع البيانات والصلاحيات',variant:'destructive'});
  const refresh=()=>['pilgrimage-sales','pilgrimage-agencies','pilgrimage-sale-items',
    'pilgrimage-sale-costs','pilgrimage-sale-travelers',
    'pilgrimage-seat-allocations','pilgrimage-seat-events',
    'pilgrimage-retail-conversions','pilgrimage-sale-pilgrims','pilgrims','pilgrimage-programs'].forEach(key=>
    qc.invalidateQueries({queryKey:[key,orgId]}));

  const createSale=useMutation({
    mutationFn:async()=>{
      const issues=validateSaleDraft(draft,selectedProgram);
      if(issues.length)throw new Error(issues.join('، '));
      const {data,error}=await sb.from('pilgrimage_sales')
        .insert({...draft,organization_id:orgId}).select('id').single();
      if(error)throw error;
      return data.id as string;
    },
    onSuccess:(id:string)=>{refresh();setSaleId(id);setCreateOpen(false);toast({title:'تم إنشاء مسودة عرض السعر'});},
    onError:fail,
  });
  const createAgency=useMutation({
    mutationFn:async()=>{
      const {data,error}=await sb.from('pilgrimage_agencies')
        .insert({...agency,organization_id:orgId}).select('id').single();
      if(error)throw error;
      return data.id as string;
    },
    onSuccess:(id:string)=>{
      refresh();setAgencyOpen(false);setDraft(d=>({...d,buyer_agency_id:id}));
      setAgency({name:'',contact_name:'',phone:'',email:''});
    },onError:fail,
  });
  const addLine=useMutation({
    mutationFn:async()=>{
      if(!canEdit)throw new Error('أضف بنود البيع للمسودة فقط');
      if(line.description.trim().length<2||line.quantity<=0||!Number.isFinite(line.quantity)
        ||line.unit_sell<0||!Number.isFinite(line.unit_sell))throw new Error('وصف الخدمة أو قيمتها غير صحيحة');
      const {error}=await sb.from('pilgrimage_sale_items').insert({
        organization_id:orgId,sale_id:saleId,item_kind:line.item_kind,
        description:line.description.trim(),quantity:line.quantity,unit_sell:line.unit_sell,
        room_type:line.item_kind==='program_seat'?line.room_type:null,
      });
      if(error)throw error;
    },
    onSuccess:()=>{refresh();setLine({item_kind:'program_seat',description:'',room_type:'quad',quantity:1,unit_sell:0});},
    onError:fail,
  });
  const removeLine=useMutation({
    mutationFn:async(id:string)=>{
      const {error}=await sb.from('pilgrimage_sale_items').delete()
        .eq('id',id).eq('organization_id',orgId).eq('sale_id',saleId);
      if(error)throw error;
    },onSuccess:refresh,onError:fail,
  });
  const saveCost=useMutation({
    mutationFn:async()=>{
      if(!costLine||!canEdit)throw new Error('التكلفة تُحدّث داخل المسودة فقط');
      if(!Number.isFinite(costInput.unit_cost)||costInput.unit_cost<0)throw new Error('التكلفة غير صالحة');
      const {error}=await sb.from('pilgrimage_sale_item_costs').upsert({
        item_id:costLine.id,organization_id:orgId,unit_cost:costInput.unit_cost,
        supplier_id:costInput.supplier_id||null,
      },{onConflict:'item_id'});
      if(error)throw error;
    },
    onSuccess:()=>{refresh();setCostLine(null);},onError:fail,
  });
  const addTraveler=useMutation({
    mutationFn:async()=>{
      if(!canEdit)throw new Error('لا يمكن تعديل كشف الأسماء بعد إصدار العرض');
      if(!traveler.display_name.trim()&&!traveler.customer_id&&!traveler.pilgrim_id)
        throw new Error('أدخل اسمًا أو اربطه بملف موجود');
      if(selected?.sale_model==='group_seat' && !traveler.pilgrim_id &&
        (traveler.display_name.trim().length<3 || !traveler.room_type))
        throw new Error('تسجيل مقاعد التجزئة يحتاج اسم كل مسافر وفئة غرفته');
      const {error}=await sb.from('pilgrimage_sale_travelers').insert({
        organization_id:orgId,sale_id:saleId,
        display_name:traveler.display_name.trim()||null,
        customer_id:traveler.customer_id||null,pilgrim_id:traveler.pilgrim_id||null,
        room_type:traveler.room_type||null,
      });
      if(error)throw error;
    },
    onSuccess:()=>{refresh();setTraveler({display_name:'',customer_id:'',pilgrim_id:'',room_type:''});},onError:fail,
  });
  const removeTraveler=useMutation({
    mutationFn:async(id:string)=>{
      const {error}=await sb.from('pilgrimage_sale_travelers').delete()
        .eq('organization_id',orgId).eq('sale_id',saleId).eq('id',id);
      if(error)throw error;
    },onSuccess:refresh,onError:fail,
  });
  const changeStatus=useMutation({
    mutationFn:async(status:'quoted'|'cancelled')=>{
      if(!canManage||!selected)throw new Error('ليس لديك صلاحية');
      if(status==='cancelled' && conversion)
        throw new Error('لا يمكن إلغاء عرض تم تحويله لتسجيلات فعلية دون دورة إلغاء ومراجعة مالية');
      if(status==='cancelled' && allocationIsActive)
        throw new Error('حرّر التخصيص الداخلي للمقاعد قبل إلغاء عرض السعر');
      if(status==='quoted'){
        const issues=quoteReadiness(selected as SaleDraft,items);
        if(selected.program_id){
          const p=programs.find((x:any)=>x.id===selected.program_id);
          if(!p||p.status!=='open')issues.push('البرنامج الجماعي ليس مفتوحًا للتسجيل');
          if(p&&p.capacity>0&&selected.party_size>
            p.capacity-(pilgrimsQ.data||[]).length-programAllocationCount)
            issues.push('العدد المطلوب أكبر من المقاعد المتاحة حاليًا');
        }
        if(issues.length)throw new Error(issues.join('، '));
      }
      const {data,error}=await sb.from('pilgrimage_sales').update({status})
        .eq('id',selected.id).eq('organization_id',orgId).select('id').single();
      if(error)throw error;
      if(!data)throw new Error('لم تُحدّث حالة العرض');
    },onSuccess:()=>{refresh();toast({title:'تم تحديث حالة العرض'});},onError:fail,
  });

  const allocateSeat=useMutation({
    mutationFn:async(action:'hold'|'allocate'|'release')=>{
      if(!canManage||!selected||selected.status!=='quoted'||!selected.program_id)
        throw new Error('تخصيص المقاعد متاح فقط لمدير الشركة على عرض جماعي صادر');
      const {data,error}=await sb.rpc('transition_pilgrimage_seat_allocation',{
        _sale_id:selected.id,_action:action,_hold_minutes:120,
      });
      if(error)throw error;
      if(!data)throw new Error('لم يرجع النظام رقم التخصيص');
      return action;
    },
    onSuccess:(action:string)=>{
      refresh();
      toast({title:action==='hold'?'تم إنشاء حجز داخلي مؤقت للمقاعد':
        action==='allocate'?'تم تثبيت تخصيص المقاعد داخليًا':
        'تم تحرير المقاعد داخليًا'});
    },
    onError:fail,
  });
  const convertRetail=useMutation({
    mutationFn:async()=>{
      if(!canManage || selected?.sale_model!=='group_seat' ||
        selected?.status!=='quoted' || allocation?.status!=='allocated' || conversion)
        throw new Error('يلزم عرض أفراد صادر ومقاعد مخصصة داخليًا وغير محوّلة');
      const {data,error}=await sb.rpc('convert_pilgrimage_retail_group',{_sale_id:selected.id});
      if(error)throw error;
      if(!data)throw new Error('تعذر استلام مرجع تحويل المجموعة');
      return data as string;
    },
    onSuccess:()=>{
      setConfirmConversionOpen(false);refresh();
      toast({title:'تم تحويل المقاعد إلى تسجيلات معتمرين داخل البرنامج',
        description:'لم تُصدر فاتورة أو تأشيرة أو تصريح تلقائيًا. راجع المستندات والمحاسبة.'});
    },onError:fail,
  });
  const cloneQuote=useMutation({
    mutationFn:async()=>{
      if(!canManage||selected?.status!=='quoted')throw new Error('يلزم عرض صادر وصلاحية مدير');
      const {data,error}=await sb.rpc('clone_pilgrimage_sale',{_sale_id:selected.id});
      if(error)throw error;
      if(typeof data!=='string')throw new Error('لم يرجع النظام رقم المسودة الجديدة');
      return data;
    },
    onSuccess:(id:string)=>{
      refresh();setSaleId(id);toast({title:'تم إنشاء نسخة جديدة قابلة للتعديل من عرض السعر'});
    },onError:fail,
  });
  const printQuote=()=>{
    if(!selected)return;
    const buyer=selected.buyer_agency_id
      ? agencies.find((x:any)=>x.id===selected.buyer_agency_id)?.name
      : customers.find((x:any)=>x.id===selected.buyer_customer_id)?.name;
    const meta=table(['البيان','التفاصيل'],[
      ['العرض',selected.name],['الحج / العمرة',selected.program_type==='hajj'?'حج':'عمرة'],
      ['طريقة البيع',SALE_MODELS[selected.sale_model as SaleModel]],
      ['الدور',FULFILLMENT[selected.fulfillment_role as keyof typeof FULFILLMENT]],
      ['العميل / شركة السياحة',buyer||'—'],['الأفراد',selected.party_size],
      ['السفر',selected.departure_date||'—'],['العودة',selected.return_date||'—'],
      ['حالة العرض',SALE_STATES[selected.status as keyof typeof SALE_STATES]],
    ]);
    const body=table(['الخدمة','الوصف','العدد','سعر الوحدة','الإجمالي'],
      items.map((x:any)=>[SALE_ITEMS[x.item_kind as SaleItemKind],x.description,x.quantity,
        money(x.unit_sell,selected.currency),money(x.line_sell,selected.currency)]));
    printDocument(currentOrganization,'عرض سعر حج وعمرة',meta+body+
      table(['الإجمالي','المبلغ'],[['عرض البيع',money(metrics.selling,selected.currency)]])+
      '<p class="muted">عرض سعر فقط: لا يُعد حجزًا مؤكدًا أو فاتورة أو مستند تأشيرة / تصريح، ولا يخصص مقاعد.</p>');
  };
  const visible=(salesQ.data||[]).filter((s:any)=>s.program_type===type);
  const costsMap=new Map(costs.map((c:any)=>[c.item_id,c]));

  return <div className="space-y-5">
    <Button variant="ghost" onClick={onBack}><ArrowRight className="h-4 w-4 me-1"/>العودة إلى البرامج</Button>
    <PageHeader title="مبيعات الحج والعمرة"
      description="بيع مقاعد جماعية، عمرة خاصة FIT ومجموعات شركات السياحة. هذه عروض أسعار وليست حجوزات مؤكدة."
      icon={Users}
      actions={canManage&&<Button onClick={()=>{
        setDraft(fresh(type,initialProgram?.program_type===type?initialProgram:null));
        setCreateOpen(true);
      }}><Plus className="h-4 w-4 me-1"/>عرض جديد</Button>} />
    <Tabs value={type} onValueChange={v=>{setType(v as 'hajj'|'umrah');setSaleId(null);}}>
      <TabsList><TabsTrigger value="umrah">العمرة</TabsTrigger><TabsTrigger value="hajj">الحج</TabsTrigger></TabsList>
    </Tabs>
    {salesQ.error&&<Card className="p-4 text-sm text-destructive">
      تعذر تحميل عروض المبيعات؛ يلزم التأكد من تفعيل الجداول الجديدة في البيئة المعتمدة.
    </Card>}
    {!selected&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.length===0&&!salesQ.error&&<Card className="p-8 text-center text-muted-foreground sm:col-span-3">لا توجد عروض بعد.</Card>}
      {visible.map((s:any)=><Card key={s.id}
        className="p-4 space-y-2 cursor-pointer hover:border-primary/40" onClick={()=>setSaleId(s.id)}>
        <div className="flex items-start justify-between gap-2">
          <strong>{s.name}</strong><Badge variant="outline">{SALE_STATES[s.status as keyof typeof SALE_STATES]}</Badge>
        </div>
        <p className="text-sm">{SALE_MODELS[s.sale_model as SaleModel]}</p>
        <p className="text-xs text-muted-foreground">{FULFILLMENT[s.fulfillment_role as keyof typeof FULFILLMENT]}</p>
        <p className="text-sm">{s.party_size} مسافر · {s.currency}</p>
      </Card>)}
    </div>}
    {selected&&<div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={()=>setSaleId(null)}><ArrowRight className="h-4 w-4 me-1"/>كل العروض</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={printQuote}><FileText className="h-4 w-4 me-1"/>طباعة العرض</Button>
          <Button variant="outline" onClick={()=>exportExcel('Pilgrimage quotation',[
            {name:'Pricing',headers:['Service','Description','Qty','Unit sell','Total'],
              rows:items.map((x:any)=>[x.item_kind,x.description,x.quantity,x.unit_sell,x.line_sell])}
          ])}><FileSpreadsheet className="h-4 w-4 me-1"/>Excel</Button>
          {canEdit&&<Button disabled={changeStatus.isPending} onClick={()=>changeStatus.mutate('quoted')}>إصدار عرض السعر</Button>}
          {canManage&&selected.status==='quoted'&&<Button variant="outline"
            disabled={cloneQuote.isPending} onClick={()=>cloneQuote.mutate()}>إنشاء نسخة معدلة</Button>}
          {canManage&&selected.status!=='cancelled'&&<Button variant="destructive"
            disabled={changeStatus.isPending} onClick={()=>changeStatus.mutate('cancelled')}>إلغاء العرض</Button>}
        </div>
      </div>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">{selected.name}</h3>
        <p className="text-sm">{SALE_MODELS[selected.sale_model as SaleModel]} · {FULFILLMENT[selected.fulfillment_role as keyof typeof FULFILLMENT]}</p>
        <p className="text-sm">العدد {selected.party_size} · العملة {selected.currency} · الحالة {SALE_STATES[selected.status as keyof typeof SALE_STATES]}</p>
        {selected.program_id&&<p className="text-xs text-muted-foreground">
          المتاح داخليًا الآن وفق السعة والتسجيلات والتخصيصات النشطة: {
            (()=>{const p=programs.find((x:any)=>x.id===selected.program_id);
              if(!canManage||pilgrimsQ.isLoading||pilgrimsQ.error||allocationsQ.isLoading||allocationsQ.error)
                return 'بانتظار تحديث بيانات التوافر';
              return p?.capacity?Math.max(0,p.capacity-(pilgrimsQ.data||[]).length-programAllocationCount):'غير محدود';})()
          }. التوافر لدى المنظّم/الفندق/الطيران مستقل عن ذلك.
        </p>}
        {selected.supersedes_sale_id&&<p className="text-xs text-muted-foreground">
          هذه نسخة مراجعة لعرض سابق، مع حفظ العرض الأصلي دون تعديل.</p>}
        <p className="text-xs text-muted-foreground">العرض لا يخصم مقاعد من السعة ولا ينشئ فاتورة أو عملية تحصيل. إصداره يقفل تعديل الأسعار؛ للتعديل يُنشأ عرض جديد.</p>
      </Card>
      {selected.program_id && ['group_seat','b2b_group'].includes(selected.sale_model) &&
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">التخصيص الداخلي لمقاعد البرنامج</h3>
            <Badge variant="outline">{!allocation?'لم يُحجز':
              conversion?'تم تسجيل المعتمرين':
              allocation.status==='allocated'?'مخصص داخليًا':
              allocation.status==='released'?'تم تحرير المقاعد':
              allocationIsActive?'حجز مؤقت نشط':'انتهت مدة الحجز المؤقت'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {allocation?.status==='held' && allocationIsActive
              ? 'ينتهي الحجز المؤقت: '+new Date(allocation.hold_expires_at).toLocaleString('ar-EG')
              : conversion
              ? 'نُقلت المقاعد إلى ملفات المعتمرين؛ التسجيل ليس فاتورة أو تأشيرة.'
              : allocation?.status==='allocated'
              ? 'المقاعد مثبتة ضمن السعة الداخلية فقط، بلا تأكيد من أي مورّد.'
              : 'المقاعد غير مخصصة حاليًا.'}
          </p>
          {allocationsQ.error&&<p className="text-sm text-destructive">
            تعذر قراءة المقاعد؛ لا تعتمد على التوافر قبل التأكد من جاهزية قاعدة البيانات.
          </p>}
          {canManage && selected.status==='quoted' && !allocationsQ.error && !conversionsQ.error &&
            <div className="flex flex-wrap gap-2">
              {!allocationIsActive&&!conversion&&<Button disabled={allocateSeat.isPending}
                onClick={()=>allocateSeat.mutate('hold')}>حجز مقاعد مؤقت — ساعتان</Button>}
              {allocation?.status==='held' && allocationIsActive &&
                <Button disabled={allocateSeat.isPending}
                  onClick={()=>allocateSeat.mutate('allocate')}>تثبيت التخصيص الداخلي</Button>}
              {allocationIsActive&&<Button variant="outline" disabled={allocateSeat.isPending}
                onClick={()=>allocateSeat.mutate('release')}>تحرير المقاعد</Button>}
              {selected.sale_model==='group_seat' && allocation?.status==='allocated' &&
                !conversion && <Button disabled={convertRetail.isPending}
                  onClick={()=>setConfirmConversionOpen(true)}>
                  تحويل إلى تسجيلات معتمرين
                </Button>}
            </div>}
          <p className="text-xs text-amber-700 dark:text-amber-300">
            تحويل تسجيلات الأفراد مشروط بمطابقة عدد الأسماء والغرف مع أسعار البرنامج؛
            عروض B2B تحتاج حسابات العقد والشركة قبل تحويلها إلى ملفات مالية فردية.
            هذه العملية تخصّ سعة البرنامج داخل Safar ERP فقط. ليست تأكيدًا من فندق أو شركة طيران،
            ولا حجزًا رسميًا للحج أو العمرة، ولا إصدار تأشيرة أو فاتورة.
            عرض الأسماء المرتبطة بمعتمرين مسجلين سابقًا يحتاج تسوية قبل تخصيص مقاعد جديدة.
          </p>
          {(eventsQ.data||[]).length>0&&<div className="space-y-1">
            <p className="text-sm font-medium">آخر سجل تغييرات المقاعد</p>
            {(eventsQ.data||[]).map((ev:any)=><p key={ev.id} className="text-xs text-muted-foreground">
              {ev.action==='converted'?'تسجيل المعتمرين':
              ev.action==='held'?'حجز مؤقت':
                ev.action==='reheld'?'تجديد الحجز المؤقت':
                ev.action==='allocated'?'تثبيت داخلي':'تحرير'} ·
              {' '+ev.seat_count+' مقاعد · '+new Date(ev.event_at).toLocaleString('ar-EG')}
            </p>)}
          </div>}
        </Card>}
      {selected.sale_model==='fit'&&<Card className="p-4 text-sm text-muted-foreground">
        عرض FIT مستقل عن سعة البرامج الجماعية. التأكيد الفعلي لكل خدمة يتم عبر المورد المختص
        في دورة حجز منفصلة؛ لن نعتبر العرض حجزًا مؤكدًا تلقائيًا.
      </Card>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">البيع المقترح</p><strong>{money(metrics.selling,selected.currency)}</strong></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">تكلفة المورد التقديرية</p>
          <strong>{!canManage?'مخفية':metrics.estimatedCost===null?'بنود تكلفة ناقصة':money(metrics.estimatedCost,selected.currency)}</strong>
        </Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">هامش تقديري غير محقق</p>
          <strong>{canManage&&metrics.estimatedMargin!==null?money(metrics.estimatedMargin,selected.currency):'—'}</strong>
        </Card>
      </div>
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">بنود الخدمات والأسعار</h3>
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>الخدمة</TableHead><TableHead>الوصف</TableHead>
            <TableHead>الكمية</TableHead><TableHead>سعر الوحدة</TableHead>
            <TableHead>الإجمالي</TableHead>{canManage&&<TableHead>تكلفة الوحدة</TableHead>}
            {canEdit&&<TableHead/>}</TableRow></TableHeader>
          <TableBody>
            {items.length===0&&<TableRow><TableCell colSpan={7}>لم تُضاف خدمات بعد.</TableCell></TableRow>}
            {items.map((x:any)=>{
              const cost:any=costsMap.get(x.id);
              return <TableRow key={x.id}>
                <TableCell>{SALE_ITEMS[x.item_kind as SaleItemKind]}</TableCell>
                <TableCell>{x.description}{x.room_type?' · '+ROOM[x.room_type]:''}</TableCell>
                <TableCell>{x.quantity}</TableCell><TableCell>{money(x.unit_sell,selected.currency)}</TableCell>
                <TableCell>{money(x.line_sell,selected.currency)}</TableCell>
                {canManage&&<TableCell>{cost?money(cost.unit_cost,selected.currency):'غير مدخلة'}
                  {canEdit&&<Button size="sm" variant="ghost" onClick={()=>{
                    setCostLine(x);setCostInput({unit_cost:Number(cost?.unit_cost||0),supplier_id:cost?.supplier_id||''});
                  }}>تعديل التكلفة</Button>}</TableCell>}
                {canEdit&&<TableCell><Button size="icon" variant="ghost" title="حذف بند بلا تكلفة"
                  disabled={!!cost} onClick={()=>removeLine.mutate(x.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>}
              </TableRow>;
            })}
          </TableBody>
        </Table></div>
        {canEdit&&<div className="space-y-3 border-t pt-3">
          <h4 className="font-medium text-sm">إضافة خدمة</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field name="نوع الخدمة"><Select value={line.item_kind} onValueChange={v=>setLine({
              ...line,item_kind:v as SaleItemKind,room_type:v==='program_seat'?'quad':''})}>
              <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                {Object.entries(SALE_ITEMS).map(([k,t])=><SelectItem key={k} value={k}>{t}</SelectItem>)}
              </SelectContent></Select></Field>
            <Field name="الوصف"><Input value={line.description} onChange={e=>setLine({...line,description:e.target.value})}/></Field>
            {line.item_kind==='program_seat'&&<Field name="نوع الغرفة"><Select value={line.room_type}
              onValueChange={v=>setLine({...line,room_type:v})}>
              <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                {Object.entries(ROOM).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent></Select></Field>}
            <Field name="الكمية"><Input type="number" min="0.01"
              step={line.item_kind==='program_seat'?'1':'0.01'} value={line.quantity}
              onChange={e=>setLine({...line,quantity:Number(e.target.value)})}/></Field>
            <Field name="سعر الوحدة"><Input type="number" min="0" value={line.unit_sell}
              onChange={e=>setLine({...line,unit_sell:Number(e.target.value)})}/></Field>
          </div>
          <Button disabled={addLine.isPending} onClick={()=>addLine.mutate()}><Plus className="h-4 w-4 me-1"/>إضافة الخدمة</Button>
        </div>}
      </Card>
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">أسماء المسافرين ({travelers.length} من {selected.party_size})</h3>
        <p className="text-xs text-muted-foreground">كشف مبدئي لا يحجز مقاعد أو يضيف معتمرين للبرنامج تلقائيًا.</p>
        {travelers.map((x:any)=><div key={x.id} className="flex items-center justify-between gap-2 text-sm border-b pb-2">
          <span>{x.display_name||pilgrimsQ.data?.find((p:any)=>p.id===x.pilgrim_id)?.full_name||
            customers.find((c:any)=>c.id===x.customer_id)?.name||'ملف مسافر مرتبط'}
            {x.room_type?' · '+ROOM[x.room_type]:''}</span>
          {canEdit&&<Button size="icon" variant="ghost" onClick={()=>removeTraveler.mutate(x.id)}><Trash2 className="h-4 w-4"/></Button>}
        </div>)}
        {canEdit&&travelers.length<selected.party_size&&<div className="space-y-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field name="اسم المسافر"><Input value={traveler.display_name}
              onChange={e=>setTraveler({...traveler,display_name:e.target.value})}/></Field>
            <Field name="فئة الغرفة لكل مسافر"><Select value={selection(traveler.room_type)}
              onValueChange={v=>setTraveler({...traveler,room_type:resolved(v)||''})}>
              <SelectTrigger><SelectValue placeholder="اختر فئة الغرفة" /></SelectTrigger>
              <SelectContent><SelectItem value={NONE}>غير محددة</SelectItem>
                {Object.entries(ROOM).map(([k,t])=><SelectItem key={k} value={k}>{t}</SelectItem>)}
              </SelectContent>
            </Select></Field>
            <Field name="ملف عميل موجود (اختياري)"><Select value={selection(traveler.customer_id)}
              onValueChange={v=>setTraveler({...traveler,customer_id:resolved(v)||''})}>
              <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                <SelectItem value={NONE}>بدون</SelectItem>
                {customers.map((x:any)=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
              </SelectContent></Select></Field>
            {selected.program_id&&<Field name="معتمر مسجّل بنفس البرنامج"><Select value={selection(traveler.pilgrim_id)}
              onValueChange={v=>setTraveler({...traveler,pilgrim_id:resolved(v)||''})}>
              <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                <SelectItem value={NONE}>بدون</SelectItem>
                {(pilgrimsQ.data||[]).map((x:any)=><SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>)}
              </SelectContent></Select></Field>}
          </div>
          <Button disabled={addTraveler.isPending} onClick={()=>addTraveler.mutate()}><Plus className="h-4 w-4 me-1"/>إضافة اسم</Button>
        </div>}
      </Card>
    </div>}
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إنشاء عرض بيع الحج أو العمرة</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">المسودة تخص التسعير فقط، ولا تضمن التوافر أو صلاحية التصريح.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field name="اسم العرض"><Input value={draft.name}
            onChange={e=>setDraft({...draft,name:e.target.value})}/></Field></div>
          <Field name="الخدمة"><Select value={draft.program_type} onValueChange={v=>setDraft({
            ...draft,program_type:v as 'hajj'|'umrah',program_id:null})}>
            <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
              <SelectItem value="umrah">عمرة</SelectItem><SelectItem value="hajj">حج</SelectItem>
            </SelectContent></Select></Field>
          <Field name="طريقة البيع"><Select value={draft.sale_model} onValueChange={v=>setDraft({
            ...draft,sale_model:v as SaleModel,program_id:v==='fit'?null:draft.program_id,
            buyer_customer_id:v==='b2b_group'?null:draft.buyer_customer_id,
            buyer_agency_id:v==='b2b_group'?draft.buyer_agency_id:null})}>
            <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
              {Object.entries(SALE_MODELS).map(([k,t])=><SelectItem key={k} value={k}>{t}</SelectItem>)}
            </SelectContent></Select></Field>
          <Field name="دور الشركة"><Select value={draft.fulfillment_role} onValueChange={v=>setDraft({
            ...draft,fulfillment_role:v as 'organizer'|'distributor',
            upstream_supplier_id:v==='organizer'?null:draft.upstream_supplier_id})}>
            <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
              {Object.entries(FULFILLMENT).map(([k,t])=><SelectItem key={k} value={k}>{t}</SelectItem>)}
            </SelectContent></Select></Field>
          {draft.fulfillment_role==='distributor'&&<Field name="المنظّم الرئيسي (المورّد)"><Select
            value={selection(draft.upstream_supplier_id)}
            onValueChange={v=>setDraft({...draft,upstream_supplier_id:resolved(v)})}>
            <SelectTrigger><SelectValue placeholder="اختر المنظّم"/></SelectTrigger><SelectContent>
              <SelectItem value={NONE}>حدد مورّدًا</SelectItem>
              {suppliers.map((x:any)=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
            </SelectContent></Select></Field>}
          {draft.sale_model!=='fit'&&<Field name="البرنامج الجماعي"><Select value={selection(draft.program_id)}
            onValueChange={v=>{
              const p=programs.find((x:any)=>x.id===v);
              setDraft({...draft,program_id:resolved(v),currency:p?.currency||draft.currency,
                departure_date:p?.departure_date||draft.departure_date,
                return_date:p?.return_date||draft.return_date});
            }}>
            <SelectTrigger><SelectValue placeholder="اختر برنامجًا"/></SelectTrigger><SelectContent>
              <SelectItem value={NONE}>{draft.sale_model==='b2b_group'?'مجموعة مستقلة':'حدد برنامجًا'}</SelectItem>
              {programs.filter((p:any)=>p.program_type===draft.program_type)
                .map((p:any)=><SelectItem key={p.id} value={p.id}>{p.name} · {p.currency}</SelectItem>)}
            </SelectContent></Select></Field>}
          {draft.sale_model!=='b2b_group'&&<Field name="العميل (CRM)"><Select value={selection(draft.buyer_customer_id)}
            onValueChange={v=>setDraft({...draft,buyer_customer_id:resolved(v)})}>
            <SelectTrigger><SelectValue placeholder="اختر العميل"/></SelectTrigger><SelectContent>
              <SelectItem value={NONE}>حدد العميل</SelectItem>
              {customers.map((x:any)=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
            </SelectContent></Select></Field>}
          {draft.sale_model==='b2b_group'&&<div className="space-y-2">
            <Field name="شركة السياحة المشترية"><Select value={selection(draft.buyer_agency_id)}
              onValueChange={v=>setDraft({...draft,buyer_agency_id:resolved(v)})}>
              <SelectTrigger><SelectValue placeholder="اختر الشركة"/></SelectTrigger><SelectContent>
                <SelectItem value={NONE}>حدد شركة</SelectItem>
                {agencies.map((x:any)=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
              </SelectContent></Select></Field>
            <Button variant="outline" size="sm" onClick={()=>setAgencyOpen(true)}>إضافة شركة جديدة</Button>
          </div>}
          <Field name="عدد المسافرين"><Input type="number" min="1" value={draft.party_size}
            onChange={e=>setDraft({...draft,party_size:Number(e.target.value)})}/></Field>
          <Field name="عملة العرض"><Select disabled={!!draft.program_id} value={draft.currency}
            onValueChange={v=>setDraft({...draft,currency:v})}>
            <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
              {['EGP','SAR','USD','EUR'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent></Select></Field>
          <Field name="تاريخ السفر"><Input type="date" value={draft.departure_date||''}
            onChange={e=>setDraft({...draft,departure_date:e.target.value||null})}/></Field>
          <Field name="تاريخ العودة"><Input type="date" value={draft.return_date||''}
            onChange={e=>setDraft({...draft,return_date:e.target.value||null})}/></Field>
          <div className="sm:col-span-2"><Field name="ملاحظات"><Textarea value={draft.notes||''}
            onChange={e=>setDraft({...draft,notes:e.target.value||null})}/></Field></div>
        </div>
        <Button disabled={createSale.isPending||!canManage} onClick={()=>createSale.mutate()}>حفظ مسودة العرض</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmConversionOpen} onOpenChange={setConfirmConversionOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>تأكيد تسجيل المعتمرين داخل البرنامج</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">
            تحويل {selected?.party_size||0} مقاعد من التخصيص الداخلي إلى ملفات
            معتمرين مسجلة في البرنامج. الإجراء ذري ويحتفظ بسجل المسافرين ومرجع العرض.
          </p>
          <p className="text-sm text-muted-foreground">
            يُنفّذ فقط إذا كانت الأسماء والغرف وأسعار البيع تطابق تعرفة البرنامج
            ولم يوجد أي معتمر مسجل سابقًا على نفس المقاعد.
          </p>
          <p className="text-sm text-destructive">
            لا يمكن إلغاء هذا التحويل بإلغاء عرض السعر مباشرةً.
            الفواتير والمدفوعات والموردون والتأشيرات والتصاريح خطوات مستقلة.
          </p>
          <Button disabled={convertRetail.isPending} onClick={()=>convertRetail.mutate()}>
            تأكيد تحويل المقاعد إلى تسجيلات
          </Button>
          <Button variant="outline" onClick={()=>setConfirmConversionOpen(false)}>رجوع</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={agencyOpen} onOpenChange={setAgencyOpen}>
      <DialogContent><DialogHeader><DialogTitle>إضافة شركة سياحة B2B</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field name="اسم الشركة"><Input value={agency.name} onChange={e=>setAgency({...agency,name:e.target.value})}/></Field>
          <Field name="مسؤول التواصل"><Input value={agency.contact_name} onChange={e=>setAgency({...agency,contact_name:e.target.value})}/></Field>
          <Field name="الهاتف"><Input value={agency.phone} onChange={e=>setAgency({...agency,phone:e.target.value})}/></Field>
          <Field name="البريد"><Input value={agency.email} onChange={e=>setAgency({...agency,email:e.target.value})}/></Field>
          <Button disabled={agency.name.trim().length<2||createAgency.isPending}
            onClick={()=>createAgency.mutate()}>حفظ الشركة</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!costLine} onOpenChange={v=>!v&&setCostLine(null)}>
      <DialogContent><DialogHeader><DialogTitle>تكلفة الخدمة للإدارة فقط</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field name="تكلفة الوحدة"><Input type="number" min="0" value={costInput.unit_cost}
            onChange={e=>setCostInput({...costInput,unit_cost:Number(e.target.value)})}/></Field>
          <Field name="المورّد"><Select value={selection(costInput.supplier_id)}
            onValueChange={v=>setCostInput({...costInput,supplier_id:resolved(v)||''})}>
            <SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
              <SelectItem value={NONE}>بدون مورد</SelectItem>
              {suppliers.map((x:any)=><SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
            </SelectContent></Select></Field>
          <Button disabled={saveCost.isPending} onClick={()=>saveCost.mutate()}>حفظ التكلفة</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
