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
      globalThis.AltteuriRuntime?.runSafe('settings.listSize', () => {
        globalThis.AltteuriShared.clearListSizeGoing();
      });
      A.listSize.setFromSettings();
    }

    if (changes.keywordFilterEnabled) {
      A.keyword.handleEnabledChange();
    }

    if (changes.altPresetOff || changes.elementRemoverEnabled) {
      A.remover.applyHiddenElements({ reapplySort: true });
    }
  });
}

A.settings = Object.freeze({ bind });
})(globalThis.Altteuri ||= {});
