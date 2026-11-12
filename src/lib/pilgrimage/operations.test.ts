import assert from 'node:assert/strict';
import { canRegisterPilgrim, pilgrimageTotals, readinessIssues, validatePilgrimageProgram, outstanding, refundable } from './operations';

const program={status:'open',capacity:2,departure_date:'2027-01-03',return_date:'2027-01-10',makkah_nights:5,madinah_nights:2,price_quad:1000};
const one={id:'one',full_name:'Example A',total_price:1000,paid_amount:1300,status:'registered'};
const two={id:'two',full_name:'Example B',total_price:2000,paid_amount:500,status:'cancelled',cancellation_fee:100};
const totals=pilgrimageTotals([one,two]);
assert.deepEqual(totals,{registered:1,grossDue:1100,collected:1800,outstanding:0,refundExposure:1700});
assert.equal(outstanding({...one,paid_amount:400}),600);
assert.equal(refundable(two),400);
assert.equal(canRegisterPilgrim(program,[one]),null);
assert.match(canRegisterPilgrim({...program,capacity:1},[one])??'',/مكتمل/);
assert.match(canRegisterPilgrim({...program,status:'closed'},[])??'',/مفتوح/);
assert.equal(canRegisterPilgrim(program,[one,two]),null);
assert.equal(validatePilgrimageProgram(program,'برنامج معتمد').length,0);
assert.ok(validatePilgrimageProgram({...program,return_date:'2026-12-25',price_double:-1},'x').length>=3);
const ready={
 full_name:'Sample',name_en:'SAMPLE',passport_number:'P123',
 passport_expiry:'2028-01-10',visa_status:'issued',
 documents_complete:true,makkah_room:'101',madinah_room:'202',
};
assert.deepEqual(readinessIssues(ready,program),[]);
assert.ok(readinessIssues({...ready,passport_expiry:'2026-12-30'},program).includes('الجواز ينتهي قبل العودة'));
assert.ok(readinessIssues({...ready,makkah_room:''},program).includes('غرفة مكة غير محددة'));
console.log('Pilgrimage occupancy, exposure, draft validation and readiness tests passed.');
