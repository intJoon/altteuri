((A) => {
let changeBound = false;

function searchKey() {
  try {
    const u = new URL(location.href);
    return `${u.pathname}:${u.searchParams.get('q') || ''}`;
  } catch {
    return '';
  }
}

function syncListSizeRadio(listSize) {
  if (!/\/np\/search/.test(location.pathname)) return false;
  const radio = document.querySelector(`input[type="radio"][name="listSize"][value="${listSize}"]`);
  if (!radio || radio.checked) return false;
  radio.checked = true;
  const selectedClass = 'ListSizeOption_selected__Ym5KI';
  document.querySelectorAll(`input[type="radio"][name="listSize"]`).forEach(input => {
    const li = input.closest('li');
    if (!li) return;
    li.classList.toggle(selectedClass, input === radio);
  });
  return true;
}

function redirectOnce(listSize) {
  if (!/\/np\/search/.test(location.pathname)) return false;
  const url = new URL(location.href);
  if (url.searchParams.get('listSize') === listSize) {
    try { sessionStorage.removeItem('alt:ls:going'); } catch (e) {}
    return false;
  }

  url.searchParams.set('listSize', listSize);
  const target = url.toString();
  try {
    if (sessionStorage.getItem('alt:ls:going') === target) return false;
    sessionStorage.setItem('alt:ls:going', target);
  } catch (e) {}

  location.replace(target);
  return true;
}

function urlMatches(listSize) {
  try {
    return new URL(location.href).searchParams.get('listSize') === listSize;
  } catch {
    return false;
  }
}

function setFromSettings(callback) {
  const done = typeof callback === 'function' ? callback : () => {};
  if (!globalThis.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) {
    done({ redirected: false, blocked: false });
    return;
  }
  if (!/\/np\/search/.test(location.pathname)) {
    done({ redirected: false, blocked: false });
    return;
  }
  try {
    chrome.storage.sync.get(['forceCoupangListSize', 'coupangListSize'], result => {
      if (!result.forceCoupangListSize) {
        try { sessionStorage.removeItem('alt:ls:going'); } catch (e) {}
        done({ redirected: false, blocked: false });
        return;
      }
      const listSize = String(result.coupangListSize || '72');
      if (!urlMatches(listSize)) {
        const redirected = redirectOnce(listSize);
        done({ redirected, blocked: !redirected });
        return;
      }
      try { sessionStorage.removeItem('alt:ls:going'); } catch (e) {}
      syncListSizeRadio(listSize);
      done({ redirected: false, blocked: false });
    });
  } catch (e) {
    done({ redirected: false, blocked: false });
  }
}

function initSync() {
  if (changeBound || !globalThis.chrome || !chrome.storage || !chrome.storage.onChanged) return;
  changeBound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.unitPriceSortEnabled) A.sort.handleFeatureToggle('unit', !!changes.unitPriceSortEnabled.newValue);
    if (changes.discountRateSortEnabled) A.sort.handleFeatureToggle('discount', !!changes.discountRateSortEnabled.newValue);
    if (changes.priceSortEnabled) A.sort.handleFeatureToggle('price', !!changes.priceSortEnabled.newValue);
    if (changes.forceCoupangListSize || changes.coupangListSize) {
      try { sessionStorage.removeItem('alt:ls:going'); } catch (e) {}
      setFromSettings();
    }
  });
}

A.listSize = Object.freeze({
  setFromSettings,
  initSync,
  syncListSizeRadio,
  redirectOnce,
  urlMatches,
  searchKey
});
})(globalThis.Altteuri ||= {});
