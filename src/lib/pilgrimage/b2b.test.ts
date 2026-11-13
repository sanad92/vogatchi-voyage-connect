import assert from 'node:assert/strict';
import {validateB2BInstallments} from './b2b';

assert.deepEqual(validateB2BInstallments([
  {due_date:'2027-02-01',amount:2000.11},
  {due_date:'2027-02-15',amount:2999.89},
],5000),[]);
assert.deepEqual(validateB2BInstallments([
  {due_date:'2027-02-01',amount:0.29},
  {due_date:'2027-02-15',amount:0.71},
],1),[]);
assert.ok(validateB2BInstallments([
  {due_date:'2027-02-01',amount:2000},
  {due_date:'2027-02-15',amount:2500},
],5000).some(x=>x.includes('مجموع')));
assert.ok(validateB2BInstallments([{due_date:'',amount:5000}],5000)
  .some(x=>x.includes('تاريخ')));
assert.ok(validateB2BInstallments([{due_date:'2027-02-01',amount:1.001}],1.001)
  .some(x=>x.includes('غير صالح')));
assert.ok(validateB2BInstallments([],100).length>0);
assert.ok(validateB2BInstallments([{due_date:'2027-02-01',amount:0}],0).length>0);
assert.ok(validateB2BInstallments(Array.from({length:13},
  ()=>({due_date:'2027-02-01',amount:1})),13).length>0);
console.log('B2B installment dates, quantity and currency minor-unit arithmetic passed.');
