import assert from 'node:assert/strict';
import test from 'node:test';
import { isSchemePublished } from './mfPublication.js';
import {
  getSchemeCategoryIds,
  getUniqueSchemeCodesForCategory,
} from './mfCategories.js';

const equityScheme = {
  schemeCode: '101',
  schemeType: 'Open Ended',
  schemeCategory: 'Equity Scheme',
  schemeSubCategory: 'Large Cap',
};

test('scheme category ids use the shared publication classifier', () => {
  assert.deepEqual(getSchemeCategoryIds(equityScheme), ['equity']);
  assert.deepEqual(getSchemeCategoryIds({
    schemeCategory: 'Equity Linked Savings Scheme',
    schemeSubCategory: 'ELSS Tax Saver',
  }), ['equity', 'elss']);
});

test('disabled categories and individual overrides both suppress a scheme', () => {
  assert.equal(isSchemePublished(equityScheme, {
    categoryVisibility: { equity: false },
    fundVisibility: {},
  }), false);
  assert.equal(isSchemePublished(equityScheme, {
    categoryVisibility: { equity: true },
    fundVisibility: { '101': false },
  }), false);
  assert.equal(isSchemePublished(equityScheme, {
    categoryVisibility: { equity: true },
    fundVisibility: {},
  }), true);
});

test('category bulk scope includes only valid unique NSE scheme codes', () => {
  const catalogue = [
    equityScheme,
    { ...equityScheme, schemeCode: 'DUP' },
    { ...equityScheme, schemeCode: 'dup' },
    { ...equityScheme, schemeCode: 'bad code' },
    { ...equityScheme, schemeCode: '202', schemeCategory: 'Debt' },
  ];
  assert.deepEqual(getUniqueSchemeCodesForCategory(catalogue, 'equity'), ['101']);
});
