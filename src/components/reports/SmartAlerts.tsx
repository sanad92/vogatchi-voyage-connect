import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {AlertTriangle,Bell,CheckCircle2,Info,Loader2,X} from 'lucide-react';
import {callUntypedRpc} from '@/lib/supabaseRpc';
import {useOrgId} from '@/hooks/useOrgId';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';

interface LiveAlert{id:string;type:'danger'|'warning'|'info';priority:'high'|'medium'|'low';title:string;message:string;value:number;href:string}
const variants={danger:'border-destructive/40 bg-destructive/5',warning:'border-amber-400/40 bg-amber-50 dark:bg-amber-950/20',info:'border-primary/30 bg-primary/5'};

export default function SmartAlerts(){
  const orgId=useOrgId();const[dismissed,setDismissed]=useState<string[]>([]);
  const query=useQuery({queryKey:['smart-operational-alerts',orgId],enabled:!!orgId,queryFn:async()=>{const{data,error}=await callUntypedRpc<LiveAlert[]>('get_smart_operational_alerts',{_org_id:orgId});if(error)throw error;return data||[];}});
  const alerts=(query.data||[]).filter(a=>!dismissed.includes(a.id));
  if(query.isLoading)return <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/>جاري فحص التنبيهات...</div>;
  if(query.error)return <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>تعذر تحميل التنبيهات</AlertTitle><AlertDescription>{query.error instanceof Error?query.error.message:'حدث خطأ غير متوقع.'}</AlertDescription></Alert>;
  return <div className="space-y-4" dir="rtl"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="إجمالي التنبيهات" value={alerts.length}/><Stat label="عالية الأولوية" value={alerts.filter(a=>a.priority==='high').length}/><Stat label="متوسطة" value={alerts.filter(a=>a.priority==='medium').length}/><Stat label="إجمالي الحالات" value={alerts.reduce((n,a)=>n+Number(a.value||0),0)}/></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-5 w-5"/>تنبيهات تشغيلية حقيقية</CardTitle></CardHeader><CardContent className="space-y-3">{alerts.map(a=><Alert key={a.id} className={variants[a.type]}><div className="flex items-start justify-between gap-3"><div className="flex gap-3">{a.type==='danger'?<AlertTriangle className="mt-1 h-5 w-5 text-destructive"/>:a.type==='warning'?<Bell className="mt-1 h-5 w-5 text-amber-600"/>:<Info className="mt-1 h-5 w-5 text-primary"/>}<div><AlertTitle className="flex items-center gap-2">{a.title}<Badge variant={a.priority==='high'?'destructive':'outline'}>{a.value}</Badge></AlertTitle><AlertDescription className="mt-1">{a.message}</AlertDescription><Button asChild variant="link" className="h-auto p-0 pt-2"><Link to={a.href}>فتح المعالجة</Link></Button></div></div><Button size="icon" variant="ghost" aria-label="إخفاء التنبيه" onClick={()=>setDismissed(v=>[...v,a.id])}><X className="h-4 w-4"/></Button></div></Alert>)}{!alerts.length&&<div className="flex min-h-32 flex-col items-center justify-center gap-2 text-emerald-600"><CheckCircle2 className="h-8 w-8"/><p>لا توجد تنبيهات تشغيلية نشطة.</p></div>}</CardContent></Card>
  </div>;
}
const Stat=({label,value}:{label:string;value:number})=><Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>;
