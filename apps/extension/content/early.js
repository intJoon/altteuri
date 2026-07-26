(() => {
  const S = globalThis.AltteuriShared;
  const R = globalThis.AltteuriRuntime;
  if (!S || !R?.isContextValid()) return;

  function applyRemoverCss(enabled, offList) {
    const style = S.ensureStyleElement(S.EARLY_STYLE_ID);
    const preset = globalThis.ALT_BUILTIN_PRESET;
    const items = preset && Array.isArray(preset.items) ? preset.items : [];
    style.textContent = S.buildRemoverHideCss(enabled, offList, items);
  }

  R.syncGet(
    ['elementRemoverEnabled', 'altPresetOff', 'forceCoupangListSize', 'coupangListSize'],
    result => {
      applyRemoverCss(!!result.elementRemoverEnabled, result.altPresetOff || []);
      if (result.forceCoupangListSize) {
        S.redirectListSizeOnce(String(result.coupangListSize || '72'));
      }
    }
  );
})();
