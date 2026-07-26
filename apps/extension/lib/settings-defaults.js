((root) => {
  const SETTINGS_VERSION = 11;
  const FEATURE_TOGGLE_KEYS = Object.freeze([
    'unitPriceSortEnabled',
    'discountRateSortEnabled',
    'priceSortEnabled',
    'elementRemoverEnabled',
    'forceCoupangListSize',
    'keywordFilterEnabled'
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
    keywordFilterEnabled: false
  });

  root.AltteuriSettings = Object.freeze({
    SETTINGS_VERSION,
    DEFAULT_SETTINGS,
    FEATURE_TOGGLE_KEYS,
    ONBOARDING_FEATURE_EVER_ENABLED: 'onboardingFeatureEverEnabled'
  });
})(globalThis);
