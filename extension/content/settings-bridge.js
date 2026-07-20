((A) => {
let bound = false;

function bind() {
  if (bound) return;
  if (!globalThis.chrome || !chrome.storage || !chrome.storage.onChanged) return;
  bound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    if (changes.unitPriceSortEnabled) {
      A.sort.handleFeatureToggle('unit', !!changes.unitPriceSortEnabled.newValue);
    }
    if (changes.discountRateSortEnabled) {
      A.sort.handleFeatureToggle('discount', !!changes.discountRateSortEnabled.newValue);
    }
    if (changes.priceSortEnabled) {
      A.sort.handleFeatureToggle('price', !!changes.priceSortEnabled.newValue);
    }

    if (changes.forceCoupangListSize || changes.coupangListSize) {
      try { globalThis.AltteuriShared.clearListSizeGoing(); } catch (e) {}
      A.listSize.setFromSettings();
    }

    if (changes.keywordFilterEnabled) {
      A.keyword.handleEnabledChange();
    }

    if (changes.quickCartEnabled) {
      A.quickCart.applyButtons();
    }

    if (changes.altPresetOff || changes.elementRemoverEnabled) {
      A.remover.applyHiddenElements({ reapplySort: true });
    }
  });
}

A.settings = Object.freeze({ bind });
})(globalThis.Altteuri ||= {});
