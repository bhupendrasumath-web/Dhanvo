import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPurchaseOrderPayload,
  buildPurchasePaymentPayload,
  getPurchaseAmountError,
  getPurchaseDematPhysical,
  isValidNseEuin,
  validatePurchaseFields,
} from './nsePurchase.js';

test('purchase amount enforces scheme minimum, maximum, and configured increment', () => {
  const scheme = {
    minPurchaseAmount: 500,
    maxPurchaseAmount: 2500,
    purchaseAmountMultiple: 100,
  };
  assert.equal(getPurchaseAmountError(499, scheme), 'The minimum first investment for this scheme is ₹500.');
  assert.equal(getPurchaseAmountError(2600, scheme), 'The maximum first investment for this scheme is ₹2,500.');
  assert.match(getPurchaseAmountError(650, scheme), /increments of ₹100 above the minimum ₹500/);
  assert.equal(getPurchaseAmountError(700, scheme), '');
  assert.equal(getPurchaseAmountError(600, { minPurchaseAmount: null, maxPurchaseAmount: null, purchaseAmountMultiple: 200 }), '');
  assert.match(getPurchaseAmountError(650, { minPurchaseAmount: null, maxPurchaseAmount: null, purchaseAmountMultiple: 200 }), /multiples of ₹200/);
  assert.match(getPurchaseAmountError('100.001', scheme), /up to two decimal places/);
  assert.match(getPurchaseAmountError('0.50', scheme), /minimum investment amount is ₹1/);
});

test('NSE EUIN must be E followed by six digits', () => {
  assert.equal(isValidNseEuin('E123456'), true);
  assert.equal(isValidNseEuin(' e123456 '), true);
  assert.equal(isValidNseEuin('123456'), false);
  assert.equal(isValidNseEuin('E12345'), false);
  assert.equal(isValidNseEuin('E1234567'), false);
});

test('UPI payment requires and includes a valid VPA', () => {
  assert.match(validatePurchaseFields({ paymentMode: 'UPI' }).error, /UPI ID/);
  assert.match(validatePurchaseFields({ paymentMode: 'UPI', vpa: 'invalid-vpa' }).error, /UPI ID/);
  const payment = validatePurchaseFields({ paymentMode: 'upi', vpa: 'investor.name@bank' });
  assert.deepEqual(payment, { paymentMode: 'UPI', vpa: 'investor.name@bank' });
  assert.equal(
    buildPurchasePaymentPayload(
      payment,
      { bankAccountNo: '0012345678', bankIfsc: 'ABCD0123456' },
      'CLIENT001',
      '123456789',
    ).vpa,
    'investor.name@bank',
  );
});

test('NETBANKING payment does not add an unused UPI VPA', () => {
  const payment = validatePurchaseFields({ paymentMode: 'NETBANKING' });
  assert.equal(payment.error, undefined);
  const payload = buildPurchasePaymentPayload(
    payment,
    { bankAccountNo: '0012345678', bankIfsc: 'ABCD0123456' },
    'CLIENT001',
    '123456789',
  );
  assert.equal(payload.payment_mode, 'NETBANKING');
  assert.equal(Object.hasOwn(payload, 'vpa'), false);
});

test('purchase order uses the client registered physical or depository mode', () => {
  assert.equal(getPurchaseDematPhysical({ dematActive: false }), 'P');
  assert.equal(getPurchaseDematPhysical({ dematActive: true, dpTransactionMode: 'C' }), 'C');
  assert.equal(getPurchaseDematPhysical({ dematActive: true, dpTransactionMode: 'N' }), 'N');
  assert.throws(
    () => getPurchaseDematPhysical({ dematActive: true, dpTransactionMode: '' }),
    /valid default depository/,
  );
  const payload = buildPurchaseOrderPayload({
    scheme: { schemeCode: 'ABC-REG' },
    user: { nse_client_code: 'CLIENT001', email: 'user@example.com', phone: '+919876543210' },
    clientDetails: { dematActive: true, dpTransactionMode: 'C' },
    amount: 1250.5,
    euin: 'E123456',
    arn: 'ARN-12345',
    reference: '1234567890123456789012345',
  }).transaction_details[0];
  assert.equal(payload.demat_physical, 'C');
  assert.equal(payload.order_amount, '1250.50');
  assert.equal(payload.buy_sell_type, 'FRESH');
  assert.equal(payload.trxn_type, 'P');
  assert.equal(payload.euin_number, 'E123456');
  assert.equal(payload.member_unique_id.length, 25);
  assert.equal(Object.hasOwn(payload, 'order_ref_number'), false);
});
