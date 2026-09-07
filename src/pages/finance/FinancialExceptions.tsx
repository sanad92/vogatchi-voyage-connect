import {useState} from 'react';
import {Link} from 'react-router-dom';
import {AlertTriangle,FileWarning,Loader2} from 'lucide-react';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import {useFinancialExceptions} from '@/hooks/useFinancialExceptions';
import {useOrgId} from '@/hooks/useOrgId';
import {usePageTitle} from '@/hooks/usePageTitle';

const now=new Date(),today=now.toISOString().slice(0,10),yearStart=`${now.getFullYear()}-01-01`;
const money=(v:number,c:string)=>new Intl.NumberFormat('ar-EG',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v||0));

export default function FinancialExceptions(){
  usePageTitle('الاستثناءات المالية'); const orgId=useOrgId();
  const[start,setStart]=useState(yearStart),[end,setEnd]=useState(today),[currency,setCurrency]=useState('EGP');
  const{data,isLoading,error,refetch}=useFinancialExceptions(orgId,start,end,currency);
  return <div className="space-y-5 p-4 md:p-6" dir="rtl">
    <PageHeader icon={FileWarning} title="الاستثناءات المالية والمستندات" description="الحجوزات غير المفوترة، الدفعات المقدمة، وأوجه النقص في دورة المستندات."/>
    <Card><CardContent className="flex flex-wrap items-end gap-3 pt-6"><div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={start} max={end} onChange={e=>setStart(e.target.value)}/></div><div className="space-y-1"><Label>إلى تاريخ</Label><Input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></div><ReportCurrencySelect value={currency} onValueChange={setCurrency}/><Button variant="ghost" onClick={()=>void refetch()}>تحديث</Button></CardContent></Card>
    {isLoading&&<div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/>جاري فحص الحجوزات...</div>}
    {error&&<Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>تعذر تحميل التقرير</AlertTitle><AlertDescription>{error instanceof Error?error.message:'حدث خطأ غير متوقع.'}</AlertDescription></Alert>}
    {data&&<><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Count label="غير مفوتر للعميل" value={data.summary.customer_unbilled_count}/><Count label="تكلفة مورد غير مفوترة" value={data.summary.supplier_unbilled_count}/><Count label="تحصيلات مقدمة" value={data.summary.customer_advance_count}/><Count label="دفعات مورد مقدمة" value={data.summary.supplier_advance_count}/><Count label="بدون فاوتشر" value={data.summary.missing_voucher_count}/><Count label="بدون أمر دفع" value={data.summary.missing_payment_order_count}/><Count label="تسوية مالية مفتوحة" value={data.summary.financially_open_count}/><Count label="الحجوزات المفحوصة" value={data.summary.bookings_count} neutral/></div>
      <Card><CardContent className="pt-6"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الحجز</TableHead><TableHead>العميل / المورد</TableHead><TableHead>غير مفوتر للعميل</TableHead><TableHead>غير مفوتر للمورد</TableHead><TableHead>دفعات مقدمة</TableHead><TableHead>مستندات ناقصة</TableHead><TableHead/></TableRow></TableHeader><TableBody>{data.rows.map(r=><TableRow key={r.id}><TableCell><p className="font-mono">{r.booking_number}</p><p className="text-xs text-muted-foreground">{r.start_date}</p></TableCell><TableCell><p>{r.customer_name}</p><p className="text-xs text-muted-foreground">{r.supplier_name}</p></TableCell><TableCell className={r.customer_unbilled?'text-destructive':''}>{money(r.customer_unbilled_amount,currency)}</TableCell><TableCell className={r.supplier_unbilled?'text-destructive':''}>{money(r.supplier_unbilled_amount,currency)}</TableCell><TableCell><p>{r.customer_advance_amount>0?`عميل: ${money(r.customer_advance_amount,currency)}`:'—'}</p>{r.supplier_advance_amount>0&&<p>مورد: {money(r.supplier_advance_amount,currency)}</p>}</TableCell><TableCell><div className="flex flex-wrap gap-1">{r.missing_voucher&&<Badge variant="outline">فاوتشر</Badge>}{r.missing_payment_order&&<Badge variant="outline">أمر دفع</Badge>}{!r.financially_complete&&<Badge variant="destructive">تسوية</Badge>}</div></TableCell><TableCell><Button asChild size="sm" variant="ghost"><Link to={`/bookings/${r.id}/workspace?tab=financials`}>معالجة</Link></Button></TableCell></TableRow>)}{!data.rows.length&&<TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">لا توجد استثناءات في الفترة المختارة.</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card></>}
  </div>;
}
const Count=({label,value,neutral=false}:{label:string;value:number;neutral?:boolean})=><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${!neutral&&value>0?'text-destructive':''}`}>{value}</p></CardContent></Card>;
