(() => {
  const GOING_KEY = 'alt:ls:going';
  const EARLY_STYLE_ID = 'alt-element-remover-early';
  const IDLE_STYLE_ID = 'alt-element-remover-styles';

  function clearListSizeGoing() {
    try { sessionStorage.removeItem(GOING_KEY); } catch (e) {}
  }

  function redirectListSizeOnce(listSize) {
    if (!/\/np\/search/.test(location.pathname)) return false;
    try {
      const url = new URL(location.href);
      if (url.searchParams.get('listSize') === listSize) {
        clearListSizeGoing();
        return false;
      }
      url.searchParams.set('listSize', listSize);
      const target = url.toString();
      try {
        if (sessionStorage.getItem(GOING_KEY) === target) return false;
        sessionStorage.setItem(GOING_KEY, target);
      } catch (e) {}
      location.replace(target);
      return true;
    } catch (e) {
      return false;
    }
  }

  function buildRemoverHideCss(enabled, offList, items) {
    if (!enabled) return '';
    const off = offList instanceof Set ? offList : new Set(offList || []);
    const selectors = (items || [])
      .filter(it => it && it.selector && off.has(it.selector))
      .map(it => it.selector);
    return selectors.length
      ? `${selectors.join(',')}{display:none!important;}`
      : '';
  }

  function ensureStyleElement(id, parent) {
    let style = document.getElementById(id);
    if (style) return style;
    style = document.createElement('style');
    style.id = id;
    (parent || document.documentElement || document.head || document.body).appendChild(style);
    return style;
  }

  globalThis.AltteuriShared = Object.freeze({
    GOING_KEY,
    EARLY_STYLE_ID,
    IDLE_STYLE_ID,
    clearListSizeGoing,
    redirectListSizeOnce,
    buildRemoverHideCss,
    ensureStyleElement
  });
})();
