(() => {
  const S = globalThis.AltteuriShared;
  if (!S) return;

  function applyRemoverCss(enabled, offList) {
    const style = S.ensureStyleElement(S.EARLY_STYLE_ID);
    const preset = globalThis.ALT_BUILTIN_PRESET;
    const items = preset && Array.isArray(preset.items) ? preset.items : [];
    style.textContent = S.buildRemoverHideCss(enabled, offList, items);
  }

  if (!globalThis.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(
      ['elementRemoverEnabled', 'altPresetOff', 'forceCoupangListSize', 'coupangListSize'],
      result => {
        applyRemoverCss(!!result.elementRemoverEnabled, result.altPresetOff || []);
        if (result.forceCoupangListSize) {
          S.redirectListSizeOnce(String(result.coupangListSize || '72'));
        }
      }
    );
  } catch (e) {}
})();
