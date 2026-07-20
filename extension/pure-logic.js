((root, factory) => {
  const api = Object.freeze(factory());
  root.Altteuri = root.Altteuri || {};
  root.Altteuri.pure = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this, () => {
  function compareNullableNumbers(a, b, order = 'asc') {
    const aMissing = a === null || a === undefined || Number.isNaN(a);
    const bMissing = b === null || b === undefined || Number.isNaN(b);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return order === 'desc' ? b - a : a - b;
  }

  function compareDiscountRates(a, b) {
    const aRate = Number.isFinite(a) ? a : 0;
    const bRate = Number.isFinite(b) ? b : 0;
    if (aRate === 0 && bRate === 0) return 0;
    if (aRate === 0) return 1;
    if (bRate === 0) return -1;
    return bRate - aRate;
  }

  function partitionAndSort(rows, isSortable, compare) {
    const sorted = [];
    const missing = [];
    rows.forEach(row => {
      (isSortable(row) ? sorted : missing).push(row);
    });
    sorted.sort(compare);
    return { sorted, missing };
  }

  function normalizedUnitPrice(amount, baseAmount) {
    if (!Number.isFinite(amount) || !Number.isFinite(baseAmount) || baseAmount <= 0) return null;
    return amount / baseAmount;
  }

  function matchesExcludedKeyword(productName, keywords) {
    if (!Array.isArray(keywords) || keywords.length === 0) return false;
    const normalizedName = String(productName || '').toLowerCase();
    return keywords.some(keyword => normalizedName.includes(String(keyword).toLowerCase()));
  }

  function normalizeStoredSearchQuery(stored) {
    if (stored === null || stored === undefined || stored === '') return null;
    const value = String(stored);
    if (!value.includes('=')) return value;
    try {
      return new URLSearchParams(value).get('q') ?? value;
    } catch {
      return value;
    }
  }

  return {
    compareNullableNumbers,
    compareDiscountRates,
    partitionAndSort,
    normalizedUnitPrice,
    matchesExcludedKeyword,
    normalizeStoredSearchQuery
  };
});
