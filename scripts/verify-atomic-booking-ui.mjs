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
 '@/lib/postgrest-safe':{sanitizeSearchTerm:value=>value},
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
let allowed=true,canCreateCustomer=true,pending=false,fail=false,hold=null,mutations=0,cleared=0;
let configuredSteps;
const navigations=[],effects=[],submittedPayloads=[];
const form={booking_type:'hotel',employee_id:'sales-a',customer_name:'QA Guest',customer_email:'qa@example.invalid',supplier_id:'supplier-a',
 selling_price:1500,cost_price:900,hotel_name:'Room',currency:'EGP',start_date:'2026-10-10',end_date:'2026-10-12',check_in:'2026-10-11',check_out:'2026-10-13'};
const wizard={formData:form,currentStep:3,errors:{},updateField:()=>{},updateFields:()=>{},goBack:()=>{},goNext:()=>{},goToStep:()=>{},clearDraft:()=>cleared++};
const termsModule=await load('../src/lib/bookingCancellationTerms.ts');
assert.equal(termsModule.previousCalendarDay('2027-01-01T01:00'),'2026-12-31');
assert.equal(termsModule.previousCalendarDay('2028-03-01T00:00'),'2028-02-29');
form.cancellation_terms={...termsModule.emptyTerms,payment_due:'2027-01-18T18:00',planned_payment:'2027-01-18'};
assert.equal(termsModule.termsError(form.cancellation_terms),undefined);
assert.ok(termsModule.termsError({...form.cancellation_terms,planned_payment:'2027-01-19'}));
const pageImports={
 '@/lib/bookingCancellationTerms':termsModule,
 '@/components/bookings/staff/BookingSalesStaffSelect':{BookingSalesStaffSelect:'BookingSalesStaffSelect'},
 '@/components/bookings/BookingCancellationTermsFields':{BookingCancellationTermsFields:'BookingCancellationTermsFields',BookingCancellationTermsSummary:'BookingCancellationTermsSummary'},
 react:{useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:fn=>effects.push(fn())},
 'react/jsx-runtime':{jsx,jsxs:jsx},
 'react-router-dom':{useNavigate:()=>x=>navigations.push(x),useSearchParams:()=>[{get:()=>null}]},
 '@/hooks/useOrgId':{useOrgId:()=>org},
 '@/hooks/useOptimizedAuth':{useOptimizedAuth:()=>({user:{id:user}})},
 '@/hooks/useSupabasePermissions':{useSupabasePermissions:()=>({hasAllPermissions:([key])=>key==='customers_create'?canCreateCustomer:allowed})},
 '@/hooks/useCustomerContext':{useCustomerContext:()=>({data:null,isLoading:false})},
 sonner:{toast:{error:x=>toasts.push(x)}},
 '@/hooks/useUnifiedBookings':{useUnifiedBookings:()=>({finishCreation:()=>{},createBooking:{isPending:pending,mutateAsync:async input=>{
  mutations++;submittedPayloads.push(input);assert.equal(input.employee_id,'sales-a');assert.equal(input.customer_email,'qa@example.invalid');if(input.booking_type==='hotel'){
    assert.equal(input.hotelDetails.hotel_name,'Room');assert.equal(input.start_date,input.hotelDetails.check_in);
    assert.equal(input.end_date,input.hotelDetails.check_out);assert.equal(input.start_date,'2026-10-11');assert.equal(input.end_date,'2026-10-13');
  }assert.equal(input.cancellation_terms.payment_due,'2027-01-18T18:00');
  if(hold)await hold;if(fail)throw Error('detail failure');return {id:'booking-a',invoice_id:'invoice-a'};
 }}})},
 '@/hooks/useWizardForm':{useWizardForm:options=>{configuredSteps=options.steps;return wizard;}},
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
page.NewUnifiedBookingForm({});
const basic = configuredSteps[1].validate;
assert.ok(basic({customer_name:'New Company Guest'}).customer_contact,'new customer needs a contact before review');
assert.equal(Object.keys(basic({customer_name:'New Company Guest',customer_phone:'+201001234567'})).length,0);
canCreateCustomer=false;
page.NewUnifiedBookingForm({});
assert.ok(configuredSteps[1].validate({customer_name:'New Company Guest',customer_phone:'+201001234567'}).customer_name);
assert.equal(Object.keys(configuredSteps[1].validate({customer_id:'same-org-customer'})).length,0);
canCreateCustomer=true;

const details = configuredSteps[2].validate;
const hotel = {booking_type:'hotel',hotel_name:'Room',selling_price:1500,cost_price:0};
assert.ok(details(hotel).service_dates,'missing service dates block the review');
assert.ok(details({...hotel,check_in:'2026-10-10',check_out:'2026-10-09'}).service_dates);
assert.ok(details({...hotel,check_in:'2026-10-10',check_out:'2026-10-10'}).service_dates);
assert.ok(details({...hotel,start_date:'2026-10-10',end_date:'2026-10-12',check_in:'',check_out:'2026-10-12'}).service_dates,
 'an explicitly cleared service date is not replaced by the legacy date');
assert.equal(Object.keys(details({...hotel,start_date:'2026-10-10',end_date:'2026-10-12'})).length,0,
 'old date drafts continue without re-entering values');
const flight = {booking_type:'flight',airline:'Airline',departure_airport:'CAI',arrival_airport:'JED',
 departure_date:'2026-10-10',arrival_date:'2026-10-10',selling_price:1500,cost_price:0};
assert.equal(Object.keys(details(flight)).length,0,'same-day one-way flight is valid');
assert.ok(details({...flight,is_round_trip:true}).return_arrival_date,'return segment must be completed');
assert.equal(Object.keys(details({...flight,is_round_trip:true,return_departure_airport:'JED',return_arrival_airport:'CAI',
 return_departure_date:'2026-10-12',return_arrival_date:'2026-10-13'})).length,0);
assert.equal(Object.keys(details({booking_type:'transport',vehicle_type:'bus',start_date:'2026-10-10',
 end_date:'2026-10-10',selling_price:1500,cost_price:0})).length,0,'same-day transport is valid');
const submit=()=>nodes(page.NewUnifiedBookingForm({})).find(x=>x.type==='WizardNavButtons').props.onNext;
fail=true;await submit()();assert.equal(cleared,0);assert.equal(navigations.length,0,'failed save preserves draft and current page');
fail=false;allowed=false;const count=mutations;await submit()();assert.equal(mutations,count);
allowed=true;pending=true;await submit()();assert.equal(mutations,count);
pending=false;let release;hold=new Promise(r=>release=r);const callback=submit();
const saving=callback();await callback();assert.equal(mutations,count+1,'synchronous double click runs only one save');
release();await saving;hold=null;assert.equal(cleared,1);assert.deepEqual(navigations,['/bookings/booking-a']);
const keyA=page.default().key;org='org-b';assert.notEqual(page.default().key,keyA,'company switch remounts the form');org='org-a';
hold=new Promise(r=>release=r);const late=submit()();effects.at(-1)();release();await late;hold=null;
assert.equal(cleared,1);assert.equal(navigations.length,1,'unmounted form cannot clear drafts or navigate on a late result');
Object.assign(form,flight,{
  is_round_trip:true,return_departure_airport:'JED',return_arrival_airport:'CAI',
  return_departure_date:'2026-10-12',return_arrival_date:'2026-10-13',
});
await submit()();
const roundTrip = submittedPayloads.at(-1);
assert.equal(roundTrip.start_date,'2026-10-10');
assert.equal(roundTrip.end_date,'2026-10-13');
assert.equal(roundTrip.flightDetails.arrival_date,'2026-10-10');
assert.equal(roundTrip.flightDetails.return_arrival_date,'2026-10-13');
form.is_round_trip=false;
await submit()();
assert.equal(submittedPayloads.at(-1).end_date,'2026-10-10');
assert.ok(!('return_arrival_date' in submittedPayloads.at(-1).flightDetails),'hidden return leg does not reach the API');
console.log('Atomic booking UI passed: canonical/legacy dates, early customer and role checks, return and same-day dates, retry identity and save guards.');
