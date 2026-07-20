import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const logic = require('../../extension/pure-logic.js');

test('nullable numeric comparison keeps missing values last in both directions', () => {
  assert.ok(logic.compareNullableNumbers(10, 20, 'asc') < 0);
  assert.ok(logic.compareNullableNumbers(10, 20, 'desc') > 0);
  assert.ok(logic.compareNullableNumbers(null, 10, 'desc') > 0);
  assert.equal(logic.compareNullableNumbers(null, Number.NaN), 0);
});

test('discount comparison sorts positive rates descending and zero last', () => {
  assert.ok(logic.compareDiscountRates(30, 10) < 0);
  assert.ok(logic.compareDiscountRates(0, 10) > 0);
  assert.equal(logic.compareDiscountRates(0, Number.NaN), 0);
});

test('partitioned numeric sorts keep missing rows last and preserve their order', () => {
  const rows = [
    { id: 'missing-a', value: null },
    { id: 'high', value: 30 },
    { id: 'low', value: 10 },
    { id: 'missing-b', value: Number.NaN }
  ];
  const result = logic.partitionAndSort(
    rows,
    row => Number.isFinite(row.value),
    (a, b) => logic.compareNullableNumbers(a.value, b.value, 'asc')
  );

  assert.deepEqual(result.sorted.map(row => row.id), ['low', 'high']);
  assert.deepEqual(result.missing.map(row => row.id), ['missing-a', 'missing-b']);
});

test('discount rows put zero last and preserve ties stably', () => {
  const rows = [
    { id: 'twenty-a', value: 20 },
    { id: 'zero', value: 0 },
    { id: 'thirty', value: 30 },
    { id: 'twenty-b', value: 20 }
  ];
  const result = logic.partitionAndSort(
    rows,
    () => true,
    (a, b) => logic.compareDiscountRates(a.value, b.value)
  );

  assert.deepEqual(
    result.sorted.map(row => row.id),
    ['thirty', 'twenty-a', 'twenty-b', 'zero']
  );
  assert.deepEqual(result.missing, []);
});

test('unit-price normalization handles quantities and invalid bases', () => {
  assert.equal(logic.normalizedUnitPrice(3000, 500), 6);
  assert.equal(logic.normalizedUnitPrice(1000, 0), null);
  assert.equal(logic.normalizedUnitPrice(Number.NaN, 100), null);
});

test('keyword matching is case-insensitive substring matching', () => {
  assert.equal(logic.matchesExcludedKeyword('Fresh APPLE Juice', ['apple']), true);
  assert.equal(logic.matchesExcludedKeyword('사과주스', ['사과']), true);
  assert.equal(logic.matchesExcludedKeyword('banana', []), false);
  assert.equal(logic.matchesExcludedKeyword('', ['apple']), false);
});

test('stored search query normalization preserves current migration semantics', () => {
  assert.equal(logic.normalizeStoredSearchQuery(null), null);
  assert.equal(logic.normalizeStoredSearchQuery('사과'), '사과');
  assert.equal(logic.normalizeStoredSearchQuery('q=%EC%82%AC%EA%B3%BC&page=2'), '사과');
  assert.equal(logic.normalizeStoredSearchQuery('page=2'), 'page=2');
});
