import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path,imports) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const output=ts.transpileModule(source,{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(output,{exports,Intl,Date,require:name=>{assert.ok(name in imports,`Unexpected import ${name}`);return imports[name];}});
 return exports;
}
let org='org-a',user='user-a',apiError=null,apiData={booking_id:'booking-a',invoice_id:'invoice-a',already_converted:false};
const calls=[],invalidations=[],toasts=[];
const hook=await load('../src/hooks/useQuoteConversion.ts',{
 '@tanstack/react-query':{useMutation:x=>x,useQueryClient:()=>({invalidateQueries:async({queryKey})=>invalidations.push(queryKey)})},
 '@/hooks/useOrgId':{useOrgId:()=>org},
 '@/hooks/useOptimizedAuth':{useOptimizedAuth:()=>({user:user?{id:user}:null})},
 '@/lib/supabaseRpc':{callUntypedRpc:async(name,args)=>{calls.push({name,args});return {data:apiData,error:apiError};}},
 sonner:{toast:{success:x=>toasts.push(x),error:x=>toasts.push(x)}},
});
const conversion=()=>hook.useQuoteConversion().convertToBooking;
assert.equal((await conversion().mutationFn({quoteId:'quote-a',items:[{selling_price:1}]})).booking_id,'booking-a');
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))),{name:'convert_quote_atomic',args:{_org:'org-a',_quote:'quote-a'}},'only persisted source identifiers may be submitted');
apiError={message:'permission denied'};
await assert.rejects(conversion().mutationFn({quoteId:'quote-a'}),/permission denied/);
apiError=null;apiData={booking_id:'booking-a'};
await assert.rejects(conversion().mutationFn({quoteId:'quote-a'}),/تأكيد التحويل/);
apiData={booking_id:'booking-a',invoice_id:'invoice-a',already_converted:true};
await conversion().onSuccess(apiData);
assert.ok(invalidations.some(x=>x[0]==='quote-bookings'));
assert.ok(invalidations.some(x=>x[0]==='supplier-invoices'));
assert.match(toasts.at(-1),/نفس الحجز/);
org=null;const before=calls.length;
await assert.rejects(conversion().mutationFn({quoteId:'quote-a'}));assert.equal(calls.length,before);
org='org-a';

const jsx=(type,props)=>({type,props});
const uiNames=['AlertDialog','AlertDialogAction','AlertDialogCancel','AlertDialogContent','AlertDialogDescription','AlertDialogFooter','AlertDialogHeader','AlertDialogTitle'];
const dialogModule=await load('../src/components/quotes/ConvertQuoteDialog.tsx',{
 'react/jsx-runtime':{jsx,jsxs:jsx},
 '@/components/ui/alert-dialog':Object.fromEntries(uiNames.map(x=>[x,x])),
});
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
let confirms=0,closes=0,prevented=0;
const renderDialog=pending=>dialogModule.default({open:true,isLoading:pending,itemCount:2,onConfirm:()=>confirms++,onOpenChange:()=>closes++});
nodes(renderDialog(false)).find(x=>x.type==='AlertDialogAction').props.onClick({preventDefault:()=>prevented++});
assert.equal(prevented,1);assert.equal(confirms,1,'dialog stays controlled until async success');
const pending=renderDialog(true);
nodes(pending).find(x=>x.type==='AlertDialogAction').props.onClick({preventDefault:()=>{}});
pending.props.onOpenChange(false);
assert.equal(confirms,1);assert.equal(closes,0,'pending conversion cannot be closed/re-submitted');

let allowed=true,failed=false,pendingMutation=false,queryFailed=false;
const navigations=[],states=[];
const pageImports={
 react:{useState:()=>[true,x=>states.push(x)]},'react/jsx-runtime':{jsx,jsxs:jsx},
 'react-router-dom':{useParams:()=>({id:'quote-a'}),useNavigate:()=>x=>navigations.push(x)},
 '@tanstack/react-query':{useQuery:()=>({isLoading:false,isError:queryFailed,refetch:()=>{},data:{quote:{id:'quote-a',status:'accepted',quote_number:'Q1',customers:null,employees:null},items:[{id:'item-a',item_type:'hotel',description:'Room'}]}})},
 '@/integrations/supabase/client':{supabase:{}},
 '@/hooks/useOrgId':{useOrgId:()=>org},
 '@/hooks/useQuotes':{useQuotes:()=>({updateQuoteStatus:{mutate:()=>{}}})},
 '@/hooks/useQuoteConversion':{useQuoteConversion:()=>({convertToBooking:{isPending:pendingMutation,mutateAsync:async args=>{assert.equal(args.quoteId,'quote-a');if(failed)throw new Error('late failure');return apiData;}}})},
 '@/hooks/useSupabasePermissions':{useSupabasePermissions:()=>({hasPermission:()=>allowed,hasAllPermissions:()=>allowed})},
 '@/components/quotes/QuoteStatusBadge':{default:'QuoteStatusBadge'},
 '@/components/quotes/ConvertQuoteDialog':{default:'ConvertQuoteDialog'},
 '@/components/quotes/QuoteBookingsPanel':{default:'QuoteBookingsPanel'},
 'lucide-react':Object.fromEntries(['ArrowRight','Send','CheckCircle','XCircle','ArrowLeftRight'].map(x=>[x,x])),
 'date-fns':{format:()=>''},'date-fns/locale':{ar:{}},
};
for(const [file,names] of Object.entries({button:['Button'],card:['Card','CardContent','CardHeader','CardTitle'],table:['Table','TableBody','TableCell','TableHead','TableHeader','TableRow']})) {
 pageImports[`@/components/ui/${file}`]=Object.fromEntries(names.map(x=>[x,x]));
}
const page=await load('../src/pages/QuoteDetails.tsx',pageImports);
const confirm=()=>nodes(page.default()).find(x=>x.type==='ConvertQuoteDialog').props.onConfirm();
failed=true;await confirm();assert.equal(navigations.length,0);assert.equal(states.length,0,'failure preserves open dialog');
failed=false;allowed=false;await confirm();assert.equal(navigations.length,0,'denied submit does not navigate or mutate');
allowed=true;pendingMutation=true;await confirm();assert.equal(navigations.length,0);
pendingMutation=false;await confirm();assert.deepEqual(navigations,['/bookings/booking-a']);assert.deepEqual(states,[false]);
queryFailed=true;assert.ok(!nodes(page.default()).some(x=>x.type==='ConvertQuoteDialog'),'failed item load must not expose conversion');
console.log('Quote conversion UI: identifiers-only RPC, retries/errors, permission/pending guards, controlled dialog, and canonical navigation passed.');
