import assert from 'node:assert/strict';
import test from 'node:test';
import * as logic from '../../../shared/pure-logic.mjs';

test('compareNullableNumbers treats missing values as larger', () => {
  assert.equal(logic.compareNullableNumbers(null, 1), 1);
  assert.equal(logic.compareNullableNumbers(1, null), -1);
  assert.equal(logic.compareNullableNumbers(2, 1), 1);
  assert.equal(logic.compareNullableNumbers(1, 2, 'desc'), 1);
});

test('compareDiscountRates deprioritizes zero discount', () => {
  assert.equal(logic.compareDiscountRates(0, 10), 1);
  assert.equal(logic.compareDiscountRates(20, 10), -10);
});

test('canAddExcludedKeyword enforces limits and duplicates', () => {
  assert.deepEqual(logic.canAddExcludedKeyword([], 'abc'), { ok: true, keyword: 'abc' });
  assert.deepEqual(logic.canAddExcludedKeyword(['abc'], 'ABC'), { ok: false, reason: 'duplicate' });
  const full = Array.from({ length: logic.MAX_EXCLUDED_KEYWORDS }, (_, i) => `k${i}`);
  assert.deepEqual(logic.canAddExcludedKeyword(full, 'new'), { ok: false, reason: 'limit' });
});

test('matchesExcludedKeyword is case-insensitive substring', () => {
  assert.equal(logic.matchesExcludedKeyword('ABC Product', ['abc']), true);
  assert.equal(logic.matchesExcludedKeyword('Product', ['xyz']), false);
});

test('normalizeStoredSearchQuery extracts q from param string', () => {
  assert.equal(logic.normalizeStoredSearchQuery('q=milk'), 'milk');
  assert.equal(logic.normalizeStoredSearchQuery('plain'), 'plain');
  assert.equal(logic.normalizeStoredSearchQuery(''), null);
});
