((root) => {
  const SETTINGS_VERSION = 10;
  const FEATURE_TOGGLE_KEYS = Object.freeze([
    'unitPriceSortEnabled',
    'discountRateSortEnabled',
    'priceSortEnabled',
    'elementRemoverEnabled',
    'forceCoupangListSize',
    'keywordFilterEnabled',
    'quickCartEnabled'
  ]);
  const DEFAULT_SETTINGS = Object.freeze({
    settingsVersion: SETTINGS_VERSION,
    unitPriceSortEnabled: false,
    discountRateSortEnabled: false,
    priceSortEnabled: false,
    elementRemoverEnabled: false,
    altPresetOff: Object.freeze([]),
    forceCoupangListSize: false,
    coupangListSize: '72',
    keywordFilterEnabled: false,
    quickCartEnabled: false
  });

  root.AltteuriSettings = Object.freeze({
    SETTINGS_VERSION,
    DEFAULT_SETTINGS,
    FEATURE_TOGGLE_KEYS
  });
})(globalThis);
