import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  createFlashTestIntention, flashTestCallbackStatus, flashTestConfig, flashTestReference, FLASH_TEST_INTEGRATION_IDS,
} from '../supabase/functions/_shared/paymob-flash-test.ts';
import { verifyPaymobHmac } from '../supabase/functions/_shared/paymob-signature.ts';

const organizationCheckout = 'be3005c1-367a-4409-aa2e-dd252137e874';
const reference = flashTestReference(organizationCheckout);
const signingFixture = 'local-test-fixture';
const referenceOrigin = 'https://billing-test.example.invalid';
const supabaseOrigin = 'https://qa-project.example.invalid';
const config = flashTestConfig('egy_sk_test_exampleonly', 'egy_pk_test_exampleonly', referenceOrigin, supabaseOrigin);
assert.ok(config);

test('sandbox accepts only test keys and a separate HTTPS return site', () => {
  assert.equal(flashTestConfig('egy_sk_live_exampleonly', config.publicKey, referenceOrigin, supabaseOrigin), null);
  assert.equal(flashTestConfig(config.secretKey, 'egy_pk_live_exampleonly', referenceOrigin, supabaseOrigin), null);
  assert.equal(flashTestConfig(config.secretKey, config.publicKey, 'http://staging.example.invalid', supabaseOrigin), null);
  for (const origin of ['https://safarerp.com','https://www.safarerp.com','https://safarerp.lovable.app']) {
    assert.equal(flashTestConfig(config.secretKey, config.publicKey, origin, supabaseOrigin), null);
  }
});

test('creates one Intention with both test rails and redirects to the hosted Egypt checkout', async () => {
  let calls = 0;
  const mockFetch = async (url, init) => {
    calls++;
    assert.equal(url, 'https://accept.paymob.com/v1/intention/');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Token egy_sk_test_exampleonly');
    assert.equal(init.redirect, 'error');
    const body = JSON.parse(init.body);
    assert.equal(body.currency, 'EGP');
    assert.equal(body.amount, 25000);
    assert.equal(body.items[0].amount, 25000);
    assert.deepEqual(body.payment_methods, [6017673, 6066456]);
    assert.equal(body.special_reference, reference);
    assert.equal(body.notification_url, supabaseOrigin+'/functions/v1/paymob-flash-test-webhook');
    const redirect = new URL(body.redirection_url);
    assert.equal(redirect.origin, referenceOrigin);
    assert.equal(redirect.pathname, '/payment-success');
    assert.equal(redirect.searchParams.get('paymob_mode'), 'flash_test');
    assert.equal(redirect.searchParams.get('checkout'), organizationCheckout);
    assert.ok(body.expiration <= 600 && body.expiration >= 590);
    return Response.json({intention_order_id: 1234, client_secret: 'test-fixture-token'}, {status:201});
  };
  const result = await createFlashTestIntention(config, {
    id: organizationCheckout, amount: 25000, itemName: 'Example plan',
    billing: {first_name:'Example',last_name:'Company',email:'qa@example.invalid',phone_number:'+201010101010',country:'EG',city:'Cairo'},
    expiresAt: new Date(Date.now()+600_000).toISOString(),
  }, mockFetch);
  const checkout = new URL(result.checkoutUrl);
  assert.equal(calls, 1);
  assert.equal(result.orderId, '1234');
  assert.equal(checkout.origin, 'https://eg.checkout.paymob.com');
  assert.equal(checkout.searchParams.get('publicKey'), config.publicKey);
  assert.equal(checkout.searchParams.get('clientSecret'), 'test-fixture-token');
  assert.ok(!result.checkoutUrl.includes(config.secretKey));
});

const checkout = {merchant_order_id:reference,paymob_order_id:'1234',amount_cents:25000,currency:'EGP',
  expires_at:new Date(Date.now()+600_000).toISOString()};
const transaction = {
  amount_cents: 25000, created_at: '2026-11-18T12:00:00Z', currency:'EGP', error_occured:false,
  has_parent_transaction:false, id: 25, is_3d_secure:false, is_auth:false, is_capture:false,
  is_refunded:false, is_standalone_payment:true, is_voided:false, order:{id:1234,merchant_order_id:reference},
  owner: 16, pending:false, source_data:{pan:'0000',sub_type:'test',type:'card'}, success:true,
};

test('both approved rails are confirmed only for the original order, amount and currency', () => {
  for (const integration_id of FLASH_TEST_INTEGRATION_IDS) {
    const t = {...transaction,integration_id};
    assert.equal(flashTestCallbackStatus(t,checkout), 'paid');
    assert.equal(flashTestCallbackStatus({...t,pending:true},checkout), 'pending');
    assert.equal(flashTestCallbackStatus({...t,success:false},checkout), 'failed');
    assert.equal(flashTestCallbackStatus({...t,is_auth:true},checkout), 'pending');
    assert.equal(flashTestCallbackStatus({...t,amount_cents:24999},checkout), null);
    assert.equal(flashTestCallbackStatus({...t,currency:'USD'},checkout), null);
    assert.equal(flashTestCallbackStatus({...t,order:{...t.order,id:777}},checkout), null);
    assert.equal(flashTestCallbackStatus(t,{...checkout,paymob_order_id:null}), null);
    assert.equal(flashTestCallbackStatus(t,{...checkout,expires_at:'2020-01-01T00:00:00Z'}), null);
  }
  assert.equal(flashTestCallbackStatus({...transaction,integration_id:123},checkout), null);
});

test('verifies callback HMAC over the documented field order and rejects modified values', async () => {
  const t = {...transaction,integration_id:6017673};
  const fields = [25000,t.created_at,'EGP',false,false,25,6017673,false,false,false,false,true,false,1234,16,false,'0000','test','card',true];
  const signature = createHmac('sha512', signingFixture).update(fields.join('')).digest('hex');
  assert.ok(await verifyPaymobHmac(t,signature,signingFixture));
  assert.equal(await verifyPaymobHmac({...t,amount_cents:25001},signature,signingFixture),false);
  assert.equal(await verifyPaymobHmac(t,signature,'different-key'),false);
  assert.equal(await verifyPaymobHmac(t,'invalid',signingFixture),false);
});
