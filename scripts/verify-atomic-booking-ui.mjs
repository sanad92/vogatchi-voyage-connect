import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const saved = new Map();
const storage = {getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
async function load(path,imports={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,Date,TextEncoder,Uint8Array,crypto:webcrypto,sessionStorage:storage,
  require:name=>{assert.ok(name in imports,`Unexpected import ${name}`);return imports[name];}});
 return exports;
}
const requests=await load('../src/lib/bookingCreationRequest.ts');
const payload={booking_type:'hotel',selling_price:1500,cost_price:900,hotelDetails:{hotel_name:'Room',rooms:2}};
const first=await requests.getBookingCreationRequest('org-a','user-a',payload,null);
const reloaded=await requests.getBookingCreationRequest('org-a','user-a',JSON.parse(JSON.stringify(payload)),null);
assert.equal(first.id,reloaded.id,'unacknowledged save survives reload');
const reordered={hotelDetails:{rooms:2,hotel_name:'Room'},cost_price:900,selling_price:1500,booking_type:'hotel'};
assert.equal((await requests.getBookingCreationRequest('org-a','user-a',reordered,null)).id,first.id);
assert.ok(!storage.getItem(first.storageKey).includes('Room'),'session storage holds a hash, not booking data');
assert.notEqual((await requests.getBookingCreationRequest('org-b','user-a',payload,first)).id,first.id);
assert.notEqual((await requests.getBookingCreationRequest('org-a','user-b',payload,first)).id,first.id);
const changed=await requests.getBookingCreationRequest('org-a','user-a',{...payload,selling_price:1600},first);
assert.notEqual(changed.id,first.id);
requests.finishBookingCreationRequest(first);
assert.equal(JSON.parse(storage.getItem(changed.storageKey)).id,changed.id,'late success does not erase a newer request');
requests.finishBookingCreationRequest(changed);
assert.equal(storage.getItem(changed.storageKey),null);

let org='org-a',user='user-a',apiError={message:'timeout'},apiData=null;
const calls=[],invalidations=[],toasts=[];
const hook=await load('../src/hooks/useUnifiedBookings.ts',{
 react:{useRef:value=>({current:value})},
 '@tanstack/react-query':{useQuery:()=>({}),useMutation:x=>x,useQueryClient:()=>({invalidateQueries:async({queryKey})=>invalidations.push(queryKey)})},
 '@/integrations/supabase/client':{supabase:{}},
 '@/hooks/useOrgId':{useOrgId:()=>org},
 './useOrgId':{useOrgId:()=>org},
 '@/hooks/useOptimizedAuth':{useOptimizedAuth:()=>({user:user?{id:user}:null})},
 '@/lib/bookingCreationRequest':requests,
 '@/lib/supabaseRpc':{callUntypedRpc:async(name,args)=>{calls.push({name,args});return {data:apiData,error:apiError};}},
 sonner:{toast:{success:x=>toasts.push(x),error:x=>toasts.push(x)}},
});
let bookingHook=hook.useUnifiedBookings();
let creation=bookingHook.createBooking;
await assert.rejects(creation.mutationFn(payload),/timeout/);
const failedKey=calls.at(-1).args._request_id;
bookingHook=hook.useUnifiedBookings();creation=bookingHook.createBooking;
apiError=null;apiData={id:'booking-a'};
await assert.rejects(creation.mutationFn(payload),/تأكيد الحفظ/);
assert.equal(calls.at(-1).args._request_id,failedKey,'incomplete acknowledgement preserves retry identity');
apiData={id:'booking-a',invoice_id:'invoice-a',already_created:true};
const result=await creation.mutationFn(payload);
assert.equal(calls.at(-1).name,'create_booking_atomic');
assert.equal(calls.at(-1).args._request_id,failedKey);
await creation.onSuccess(result);
assert.ok(invalidations.some(x=>x[0]==='supplier-invoices'));
assert.match(toasts.at(-1),/نفس الحجز/);
await creation.mutationFn(payload);
assert.equal(calls.at(-1).args._request_id,failedKey,'mounted successful form cannot duplicate on a second click');
assert.ok(storage.getItem('booking-save:org-a:user-a'),'retry key remains until form completion');
bookingHook.finishCreation();assert.equal(storage.getItem('booking-save:org-a:user-a'),null);
org=null;const before=calls.length;
await assert.rejects(hook.useUnifiedBookings().createBooking.mutationFn(payload));assert.equal(calls.length,before);
org='org-a';

const jsx=(type,props,key)=>({type,props,key});
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
let allowed=true,pending=false,fail=false,hold=null,mutations=0,cleared=0;
const navigations=[],effects=[];
const form={booking_type:'hotel',customer_name:'QA Guest',customer_email:'qa@example.invalid',supplier_id:'supplier-a',
 selling_price:1500,cost_price:900,hotel_name:'Room',currency:'EGP',start_date:'2026-10-10',end_date:'2026-10-12'};
const wizard={formData:form,currentStep:3,errors:{},updateField:()=>{},updateFields:()=>{},goBack:()=>{},goNext:()=>{},clearDraft:()=>cleared++};
const pageImports={
 react:{useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:fn=>effects.push(fn())},
 'react/jsx-runtime':{jsx,jsxs:jsx},
 'react-router-dom':{useNavigate:()=>x=>navigations.push(x)},
 '@/hooks/useOrgId':{useOrgId:()=>org},
 '@/hooks/useOptimizedAuth':{useOptimizedAuth:()=>({user:{id:user}})},
 '@/hooks/useSupabasePermissions':{useSupabasePermissions:()=>({hasAllPermissions:()=>allowed})},
 '@/hooks/useUnifiedBookings':{useUnifiedBookings:()=>({finishCreation:()=>{},createBooking:{isPending:pending,mutateAsync:async input=>{
  mutations++;assert.equal(input.customer_email,'qa@example.invalid');assert.equal(input.hotelDetails.hotel_name,'Room');
  if(hold)await hold;if(fail)throw Error('detail failure');return {id:'booking-a',invoice_id:'invoice-a'};
 }}})},
 '@/hooks/useWizardForm':{useWizardForm:()=>wizard},
 '@/components/wizard/StepWizard':{default:'StepWizard',WizardNavButtons:'WizardNavButtons',FieldError:'FieldError'},
 'lucide-react':Object.fromEntries(['Hotel','Plane','Car','Truck','TrendingUp','TrendingDown','Search','Plus','User'].map(x=>[x,x])),
};
for(const [file,names] of Object.entries({card:['Card','CardContent','CardHeader','CardTitle'],button:['Button'],input:['Input'],label:['Label'],textarea:['Textarea'],dialog:['Dialog','DialogContent','DialogHeader','DialogTitle','DialogTrigger'],badge:['Badge']})) {
 pageImports[`@/components/ui/${file}`]=Object.fromEntries(names.map(x=>[x,x]));
}
for(const path of ['customers/CustomerSearch','customers/QuickCustomerAdd','shared/SupplierSelection','currency/CurrencySelector',
 'bookings/unified-fields/UnifiedHotelFields','bookings/unified-fields/UnifiedFlightFields','bookings/unified-fields/UnifiedCarFields','bookings/unified-fields/UnifiedTransportFields']) {
 pageImports[`@/components/${path}`]={default:path};
}
const page=await load('../src/pages/NewUnifiedBooking.tsx',pageImports);
const submit=()=>nodes(page.NewUnifiedBookingForm()).find(x=>x.type==='WizardNavButtons').props.onNext;
fail=true;await submit()();assert.equal(cleared,0);assert.equal(navigations.length,0,'failed save preserves draft and current page');
fail=false;allowed=false;const count=mutations;await submit()();assert.equal(mutations,count);
allowed=true;pending=true;await submit()();assert.equal(mutations,count);
pending=false;let release;hold=new Promise(r=>release=r);const callback=submit();
const saving=callback();await callback();assert.equal(mutations,count+1,'synchronous double click runs only one save');
release();await saving;hold=null;assert.equal(cleared,1);assert.deepEqual(navigations,['/bookings/booking-a']);
const keyA=page.default().key;org='org-b';assert.notEqual(page.default().key,keyA,'company switch remounts the form');org='org-a';
hold=new Promise(r=>release=r);const late=submit()();effects.at(-1)();release();await late;hold=null;
assert.equal(cleared,1);assert.equal(navigations.length,1,'unmounted form cannot clear drafts or navigate on a late result');
console.log('Atomic booking UI passed: persisted retry identity, payload/company/user changes, RPC-only writes, errors, permissions, double-click and late-result guards.');
