import assert from 'node:assert/strict';
import { validateSaleDraft, quoteReadiness, quoteMetrics, type SaleDraft } from './sales';

const customer='00000000-0000-4000-8000-000000000101';
const program={id:'program',program_type:'umrah',currency:'EGP'};
const base:SaleDraft={
  name:'برنامج رمضان',program_type:'umrah',sale_model:'group_seat',
  fulfillment_role:'organizer',program_id:'program',buyer_customer_id:customer,
  buyer_agency_id:null,upstream_supplier_id:null,party_size:2,currency:'EGP',
  departure_date:'2027-01-02',return_date:'2027-01-09',notes:null
};
assert.deepEqual(validateSaleDraft(base,program),[]);
assert.ok(validateSaleDraft({...base,currency:'SAR'},program).length>0);
assert.ok(validateSaleDraft({...base,party_size:0},program).length>0);
assert.ok(validateSaleDraft({...base,departure_date:'2027-03-02',return_date:'2027-02-03'},program).length>0);
assert.ok(validateSaleDraft({...base,sale_model:'fit'},null).length>0);
const fit:SaleDraft={...base,sale_model:'fit',name:'عمرة خاصة',program_id:null,party_size:3};
assert.deepEqual(validateSaleDraft(fit,null),[]);
const b2b:SaleDraft={
  ...base,name:'شركة سياحة 10 مقاعد',sale_model:'b2b_group',party_size:10,
  buyer_customer_id:null,buyer_agency_id:'agency',
  fulfillment_role:'distributor',upstream_supplier_id:'upstream'
};
assert.deepEqual(validateSaleDraft(b2b,program),[]);
assert.ok(validateSaleDraft({...b2b,upstream_supplier_id:null},program).length>0);
assert.ok(quoteReadiness(base,[]).length>0);
assert.ok(quoteReadiness(base,[{item_kind:'program_seat',quantity:1,unit_sell:1000}]).length>0);
assert.deepEqual(quoteReadiness(base,[
  {item_kind:'program_seat',quantity:2,unit_sell:2000,room_type:'double'}]),[]);
const lines=[
  {id:'a',item_kind:'hotel' as const,quantity:1,unit_sell:1500},
  {id:'b',item_kind:'flight' as const,quantity:3,unit_sell:125.55}
];
assert.deepEqual(quoteMetrics(lines,[]),{
  selling:1876.65,estimatedCost:null,estimatedMargin:null,missingCostLines:2
});
assert.deepEqual(quoteMetrics(lines,[{item_id:'a',unit_cost:1000},{item_id:'b',unit_cost:90}]),{
  selling:1876.65,estimatedCost:1270,estimatedMargin:606.65,missingCostLines:0
});
assert.ok(quoteReadiness(fit,[{item_kind:'hotel',quantity:0,unit_sell:200}]).length>0);
console.log('Three pilgrimage sale model validators and financial calculations passed.');
