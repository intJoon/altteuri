((A) => {
let altRemoverEnabled = false;
let altObserverStarted = false;
let altChangeBound = false;
let activeHideSelectors = [];

const ALT_REMOVER_STYLE_ID = 'alt-element-remover-styles';
const ALT_REMOVER_EARLY_ID = 'alt-element-remover-early';

function ensureRemoverStyles() {
  let s = document.getElementById(ALT_REMOVER_STYLE_ID);
  if (s) return s;
  s = document.createElement('style');
  s.id = ALT_REMOVER_STYLE_ID;
  (document.head || document.documentElement).appendChild(s);
  return s;
}

function altPresetItems() {
  const p = (typeof window !== 'undefined' && window.ALT_BUILTIN_PRESET) || null;
  return p && Array.isArray(p.items) ? p.items.filter(it => it && it.selector) : [];
}

function altGetOff(cb) {
  try { chrome.storage.sync.get(['altPresetOff'], r => cb(new Set(r.altPresetOff || []))); }
  catch { cb(new Set()); }
}

function writeHideCss(enabled, off) {
  const style = ensureRemoverStyles();
  const early = document.getElementById(ALT_REMOVER_EARLY_ID);
  if (!enabled) {
    style.textContent = '';
    if (early) early.textContent = '';
    activeHideSelectors = [];
    document.querySelectorAll('.alt-force-hidden').forEach(el => el.classList.remove('alt-force-hidden'));
    return;
  }
  const selectors = altPresetItems()
    .filter(it => off.has(it.selector))
    .map(it => it.selector);
  activeHideSelectors = selectors;
  const css = selectors.length ? `${selectors.join(',')}{display:none!important;}` : '';
  style.textContent = css;
  if (early) early.textContent = css;
}

function isItemHidden(item) {
  if (!item || !altRemoverEnabled || !activeHideSelectors.length) return false;
  for (let i = 0; i < activeHideSelectors.length; i += 1) {
    try {
      if (item.matches(activeHideSelectors[i])) return true;
    } catch (e) {}
  }
  return false;
}

function applyHiddenElements(opts) {
  const reapplySort = !!(opts && opts.reapplySort);
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) {
    if (reapplySort) A.sort.reapplySortIfNeeded();
    return;
  }
  chrome.storage.sync.get(['elementRemoverEnabled'], result => {
    altRemoverEnabled = !!result.elementRemoverEnabled;
    altGetOff(off => {
      writeHideCss(altRemoverEnabled, off);
      if (reapplySort) A.sort.reapplySortIfNeeded();
    });
  });
}

function altObserveForReapply() {
  if (altObserverStarted) return;
  altObserverStarted = true;
}

function initElementRemover() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;

  if (!altChangeBound && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.altPresetOff || changes.elementRemoverEnabled) {
        applyHiddenElements({ reapplySort: true });
      }
    });
    altChangeBound = true;
  }
  applyHiddenElements();
  altObserveForReapply();
}

A.remover = Object.freeze({
  applyHiddenElements,
  isItemHidden,
  init: initElementRemover
});
})(globalThis.Altteuri ||= {});
