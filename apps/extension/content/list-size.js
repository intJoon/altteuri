((A) => {
const S = globalThis.AltteuriShared;

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
  const selectedClass = A.core.SELECTORS.listSizeSelectedClass;
  document.querySelectorAll(`input[type="radio"][name="listSize"]`).forEach(input => {
    const li = input.closest('li');
    if (!li) return;
    li.classList.toggle(selectedClass, input === radio);
  });
  return true;
}

function redirectOnce(listSize) {
  return S.redirectListSizeOnce(listSize);
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
        S.clearListSizeGoing();
        done({ redirected: false, blocked: false });
        return;
      }
      const listSize = String(result.coupangListSize || '72');
      if (!urlMatches(listSize)) {
        const redirected = redirectOnce(listSize);
        done({ redirected, blocked: !redirected });
        return;
      }
      S.clearListSizeGoing();
      syncListSizeRadio(listSize);
      done({ redirected: false, blocked: false });
    });
  } catch (e) {
    done({ redirected: false, blocked: false });
  }
}

A.listSize = Object.freeze({
  setFromSettings,
  syncListSizeRadio,
  redirectOnce,
  urlMatches,
  searchKey
});
})(globalThis.Altteuri ||= {});
