import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSchemeMaster } from './nseMutualFunds.js';

test('scheme master exposes min, max, and configured purchase increment', () => {
  const schemes = parseSchemeMaster([
    'AMC_CODE|SCHEME_CODE|SCHEME_NAME|PLAN|PURCHASE_ALLOWED|SCHEME_STATUS|MINIMUM_PURCHASE_AMOUNT|MAXIMUM_PURCHASE_AMOUNT|PURCHASE_AMOUNT_MULTIPLE',
    'AMC|SCHEME-1|Example Regular Fund|REGULAR|Y|ACTIVE|500|25000|100',
  ].join('\n'));

  assert.equal(schemes.length, 1);
  assert.equal(schemes[0].minPurchaseAmount, 500);
  assert.equal(schemes[0].maxPurchaseAmount, 25000);
  assert.equal(schemes[0].purchaseAmountMultiple, 100);
});

test('scheme master recognizes common NSE minimum and maximum amount header names', () => {
  const schemes = parseSchemeMaster([
    'AMC_CODE|SCHEME_CODE|SCHEME_NAME|PLAN|PURCHASE_ALLOWED|SCHEME_STATUS|MIN_PURCHASE_AMT|MAX_PURCHASE_AMT',
    'AMC|SCHEME-1|Example Regular Fund|REGULAR|Y|ACTIVE|1000|50000',
  ].join('\n'));

  assert.equal(schemes[0].minPurchaseAmount, 1000);
  assert.equal(schemes[0].maxPurchaseAmount, 50000);
});

test('scheme master leaves purchase increment unset when NSE does not supply it', () => {
  const schemes = parseSchemeMaster([
    'AMC_CODE|SCHEME_CODE|SCHEME_NAME|PLAN|PURCHASE_ALLOWED|SCHEME_STATUS|MINIMUM_PURCHASE_AMOUNT|MAXIMUM_PURCHASE_AMOUNT',
    'AMC|SCHEME-1|Example Regular Fund|REGULAR|Y|ACTIVE|500|25000',
  ].join('\n'));

  assert.equal(schemes[0].purchaseAmountMultiple, null);
});
