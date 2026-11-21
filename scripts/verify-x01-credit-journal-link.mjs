import assert from 'node:assert/strict';

// A cancellation credit is recognized only when its own journal entry is posted.
// An unrelated posted journal for the same booking cannot authorize the credit.
function datedCredits({credits, journals, invoiceId, bookingId, orgId, currency, asOf}) {
  const seen = new Map();
  return credits.filter(c => c.invoiceId === invoiceId && c.bookingId === bookingId && c.orgId === orgId && c.currency === currency)
    .reduce((sum, c) => {
      if (seen.has(c.id)) {
        assert.deepEqual(c, seen.get(c.id), 'conflicting duplicate cancellation credit identity');
        return sum;
      }
      seen.set(c.id, c);
      const matched = journals.filter(j => j.sourceType === 'booking_cancellation_invoice_credit' &&
        j.sourceId === c.id && j.bookingId === bookingId && j.orgId === orgId && j.currency === currency &&
        j.status === 'posted' && j.locked && j.date <= asOf &&
        j.debit === c.amount && j.credit === c.amount);
      assert.ok(matched.length <= 1, 'duplicate posted journal for cancellation credit');
      return sum + (matched.length ? c.amount : 0);
    }, 0);
}
const credit = {id:'credit-A',invoiceId:'invoice-A',bookingId:'booking-A',orgId:'org-A',currency:'EGP',amount:250};
const journal = {sourceType:'booking_cancellation_invoice_credit',sourceId:'credit-A',bookingId:'booking-A',orgId:'org-A',currency:'EGP',status:'posted',locked:true,date:'2026-11-20',debit:250,credit:250};
const input = {credits:[credit,{...credit}],journals:[journal],invoiceId:'invoice-A',bookingId:'booking-A',orgId:'org-A',currency:'EGP'};
assert.equal(datedCredits({...input,asOf:'2026-11-19'}),0);
assert.equal(datedCredits({...input,asOf:'2026-11-20'}),250);
for(const change of [{sourceId:'other-credit'},{bookingId:'booking-B'},{orgId:'org-B'},{currency:'SAR'},{status:'draft'},{locked:false},{date:'2026-11-22'},{debit:249},{credit:249}]) {
  assert.equal(datedCredits({...input,journals:[{...journal,...change}],asOf:'2026-11-21'}),0,JSON.stringify(change));
}
assert.equal(datedCredits({...input,invoiceId:'invoice-B',asOf:'2026-11-21'}),0);
assert.equal(datedCredits({...input,bookingId:'booking-B',asOf:'2026-11-21'}),0);
assert.equal(datedCredits({...input,credits:[{...credit,bookingId:'booking-B'}],asOf:'2026-11-21'}),0);
assert.throws(()=>datedCredits({...input,journals:[journal,{...journal}],asOf:'2026-11-21'}),/duplicate posted journal/);
assert.throws(()=>datedCredits({...input,credits:[credit,{...credit,amount:200}],asOf:'2026-11-21'}),/conflicting duplicate cancellation credit identity/);
console.log('PASS X01 credit/journal identity, posted date, lock, amount, tenant, currency, booking, invoice, duplicate guards');
