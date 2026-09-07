import {useState} from 'react';
import {Link} from 'react-router-dom';
import {AlertTriangle,Clock,DollarSign,Hotel,Loader2,Percent,Plane,Repeat2,TrendingUp} from 'lucide-react';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import {useOrgId} from '@/hooks/useOrgId';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTravelKpis,type TravelKpiGroup} from '@/hooks/useTravelKpis';

const now=new Date(),today=now.toISOString().slice(0,10),yearStart=`${now.getFullYear()}-01-01`;
const typeNames:Record<string,string>={hotel:'فنادق',flight:'طيران',car_rental:'سيارات',transport:'انتقالات'};
const money=(v:number,c:string)=>new Intl.NumberFormat('ar-EG',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v||0));

export default function TravelKPIs(){
  usePageTitle('مؤشرات الأداء السياحية');
  const orgId=useOrgId();
  const[start,setStart]=useState(yearStart),[end,setEnd]=useState(today),[currency,setCurrency]=useState('EGP');
  const{data,isLoading,error,refetch}=useTravelKpis(orgId,start,end,currency);
  return <div className="space-y-5 p-4 md:p-6" dir="rtl">
    <PageHeader icon={Plane} title="مؤشرات الأداء السياحية" description="مؤشرات السفر والربحية من نفس المصدر المالي المعتمد للحجز."/>
    <Card><CardContent className="flex flex-wrap items-end gap-3 pt-6">
      <div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={start} max={end} onChange={e=>setStart(e.target.value)}/></div>
      <div className="space-y-1"><Label>إلى تاريخ</Label><Input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></div>
      <ReportCurrencySelect value={currency} onValueChange={setCurrency}/><Button variant="ghost" onClick={()=>void refetch()}>تحديث</Button>
    </CardContent></Card>
    {start>end&&<Alert variant="destructive"><AlertTitle>الفترة غير صحيحة</AlertTitle><AlertDescription>تاريخ البداية يجب أن يسبق تاريخ النهاية.</AlertDescription></Alert>}
    {isLoading&&<div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/>جاري حساب مؤشرات السفر...</div>}
    {error&&<Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>تعذر تحميل المؤشرات</AlertTitle><AlertDescription>{error instanceof Error?error.message:'حدث خطأ غير متوقع.'}</AlertDescription></Alert>}
    {data&&<Dashboard data={data} currency={currency}/>}
  </div>;
}

const Dashboard=({data,currency}:{data:NonNullable<ReturnType<typeof useTravelKpis>['data']>;currency:string})=>{const s=data.summary;return <>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    <Kpi icon={DollarSign} label="المبيعات المؤكدة" value={money(s.selling,currency)}/><Kpi icon={TrendingUp} label="صافي المساهمة" value={money(s.net_contribution,currency)} tone={s.net_contribution<0?'bad':'good'}/>
    <Kpi icon={Percent} label="Take Rate" value={`${Number(s.take_rate_pct).toFixed(1)}%`}/><Kpi icon={Plane} label="معدل الإلغاء" value={`${Number(s.cancellation_rate_pct).toFixed(1)}%`} tone={s.cancellation_rate_pct>15?'bad':undefined}/>
    <Kpi icon={Hotel} label="الليالي الفندقية" value={String(s.room_nights)}/><Kpi icon={Hotel} label="ADR" value={money(s.adr,currency)}/>
    <Kpi icon={Clock} label="متوسط Lead Time" value={`${Number(s.average_lead_days).toFixed(1)} يوم`}/><Kpi icon={Repeat2} label="العملاء المتكررون" value={`${Number(s.repeat_customer_rate_pct).toFixed(1)}%`}/>
  </div>
  <Card><CardHeader><CardTitle className="text-base">تحليل مؤشرات السفر</CardTitle></CardHeader><CardContent><Tabs defaultValue="type"><TabsList className="h-auto flex-wrap"><TabsTrigger value="type">نوع الخدمة</TabsTrigger><TabsTrigger value="destination">الوجهة</TabsTrigger><TabsTrigger value="supplier">المورد</TabsTrigger><TabsTrigger value="bookings">الحجوزات ({data.bookings.length})</TabsTrigger></TabsList>
    <TabsContent value="type"><GroupTable rows={data.by_type.map(r=>({...r,name:typeNames[r.name]||r.name}))} currency={currency} showNights/></TabsContent>
    <TabsContent value="destination"><GroupTable rows={data.by_destination} currency={currency}/></TabsContent>
    <TabsContent value="supplier"><GroupTable rows={data.by_supplier} currency={currency}/></TabsContent>
    <TabsContent value="bookings"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الحجز</TableHead><TableHead>الخدمة</TableHead><TableHead>الوجهة</TableHead><TableHead>العميل</TableHead><TableHead>Lead Time</TableHead><TableHead>المبيعات</TableHead><TableHead>صافي المساهمة</TableHead><TableHead/></TableRow></TableHeader><TableBody>{data.bookings.map(r=><TableRow key={r.id}><TableCell className="font-mono">{r.booking_number}</TableCell><TableCell>{typeNames[r.booking_type]||r.booking_type}</TableCell><TableCell>{r.destination}</TableCell><TableCell>{r.customer_name}</TableCell><TableCell>{r.lead_days} يوم</TableCell><TableCell>{money(r.selling,currency)}</TableCell><TableCell className={r.net_contribution<0?'text-destructive':'text-emerald-600'}>{money(r.net_contribution,currency)}</TableCell><TableCell><Button asChild size="sm" variant="ghost"><Link to={`/bookings/${r.id}/workspace`}>فتح</Link></Button></TableCell></TableRow>)}{!data.bookings.length&&<TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">لا توجد بيانات في الفترة.</TableCell></TableRow>}</TableBody></Table></div></TabsContent>
  </Tabs></CardContent></Card>
  </>};

const GroupTable=({rows,currency,showNights=false}:{rows:TravelKpiGroup[];currency:string;showNights?:boolean})=><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>التصنيف</TableHead><TableHead>الحجوزات</TableHead>{showNights&&<TableHead>الليالي</TableHead>}<TableHead>المبيعات</TableHead><TableHead>صافي المساهمة</TableHead></TableRow></TableHeader><TableBody>{rows.map((r,i)=><TableRow key={`${r.id||r.name}-${i}`}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.booking_count}</TableCell>{showNights&&<TableCell>{r.room_nights||0}</TableCell>}<TableCell>{money(r.selling,currency)}</TableCell><TableCell className={r.net_contribution<0?'text-destructive':'text-emerald-600'}>{money(r.net_contribution,currency)}</TableCell></TableRow>)}{!rows.length&&<TableRow><TableCell colSpan={showNights?5:4} className="py-8 text-center text-muted-foreground">لا توجد بيانات.</TableCell></TableRow>}</TableBody></Table></div>;
const Kpi=({icon:Icon,label,value,tone}:{icon:typeof Plane;label:string;value:string;tone?:'good'|'bad'})=><Card><CardContent className="flex items-start justify-between pt-5"><div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-bold ${tone==='good'?'text-emerald-600':tone==='bad'?'text-destructive':''}`}>{value}</p></div><div className="rounded-lg bg-muted p-2"><Icon className="h-5 w-5"/></div></CardContent></Card>;
