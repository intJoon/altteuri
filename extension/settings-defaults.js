((root) => {
  // Contiguous schema scale. Legacy labels 6/8/9/10 are remapped on update.
  const SETTINGS_VERSION = 4;
  const LEGACY_SETTINGS_VERSIONS = Object.freeze({
    6: 1,
    8: 2,
    9: 3,
    10: 4
  });
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

  function canonicalSettingsVersion(raw) {
    const n = Number(raw);
    const v = Number.isFinite(n) ? Math.trunc(n) : 0;
    if (Object.prototype.hasOwnProperty.call(LEGACY_SETTINGS_VERSIONS, v)) return LEGACY_SETTINGS_VERSIONS[v];
    if (v >= 1 && v <= SETTINGS_VERSION) return v;
    if (v > 0 && v < 6) return 1;
    return 0;
  }

  function needsSettingsMigration(raw) {
    const n = Number(raw);
    const v = Number.isFinite(n) ? Math.trunc(n) : 0;
    if (Object.prototype.hasOwnProperty.call(LEGACY_SETTINGS_VERSIONS, v)) return true;
    return v < SETTINGS_VERSION;
  }

  root.AltteuriSettings = Object.freeze({
    SETTINGS_VERSION,
    LEGACY_SETTINGS_VERSIONS,
    DEFAULT_SETTINGS,
    FEATURE_TOGGLE_KEYS,
    canonicalSettingsVersion,
    needsSettingsMigration
  });
})(globalThis);
