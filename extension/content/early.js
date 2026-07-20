(() => {
  const STYLE_ID = 'alt-element-remover-early';

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (style) return style;
    style = document.createElement('style');
    style.id = STYLE_ID;
    (document.documentElement || document.head || document.body).appendChild(style);
    return style;
  }

  function applyRemoverCss(enabled, offList) {
    const style = ensureStyle();
    if (!enabled) {
      style.textContent = '';
      return;
    }
    const preset = globalThis.ALT_BUILTIN_PRESET;
    const items = preset && Array.isArray(preset.items) ? preset.items : [];
    const off = new Set(offList || []);
    const selectors = items
      .filter(it => it && it.selector && off.has(it.selector))
      .map(it => it.selector);
    style.textContent = selectors.length
      ? `${selectors.join(',')}{display:none!important;}`
      : '';
  }

  function fixListSizeNow(listSize) {
    if (!/\/np\/search/.test(location.pathname)) return;
    try {
      const url = new URL(location.href);
      if (url.searchParams.get('listSize') === listSize) {
        try { sessionStorage.removeItem('alt:ls:going'); } catch (e) {}
        return;
      }
      url.searchParams.set('listSize', listSize);
      const target = url.toString();
      try {
        if (sessionStorage.getItem('alt:ls:going') === target) return;
        sessionStorage.setItem('alt:ls:going', target);
      } catch (e) {}
      location.replace(target);
    } catch (e) {}
  }

  if (!globalThis.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(
      ['elementRemoverEnabled', 'altPresetOff', 'forceCoupangListSize', 'coupangListSize'],
      result => {
        applyRemoverCss(!!result.elementRemoverEnabled, result.altPresetOff || []);
        if (result.forceCoupangListSize) {
          fixListSizeNow(String(result.coupangListSize || '72'));
        }
      }
    );
  } catch (e) {}
})();
