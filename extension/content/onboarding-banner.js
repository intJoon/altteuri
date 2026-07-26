(() => {
const R = globalThis.AltteuriRuntime;
const BANNER_ID = "alt-onboarding-banner";
const STYLE_ID = "alt-onboarding-banner-styles";
const HEADING_RE = /에\s*대한\s*검색\s*결과/;
const MAX_MOUNT_RETRIES = 30;
const MOUNT_RETRY_MS = 350;
const ENSURE_DEBOUNCE_MS = 120;

let shouldShowBanner = false;
let domObserver = null;
let ensureTimer = null;
let retryTimer = null;

function featureKeys() {
  return globalThis.AltteuriSettings?.FEATURE_TOGGLE_KEYS || [];
}

function isSearchPage() {
  return /\/np\/search/.test(location.pathname);
}

function anyFeatureEnabled(stored) {
  const keys = featureKeys();
  if (!keys.length) return false;
  return keys.some((key) => !!stored[key]);
}

function headingText(el) {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

function isSearchResultsHeading(el) {
  return !!el && el.isConnected && HEADING_RE.test(headingText(el));
}

function getProductList() {
  const sel = globalThis.Altteuri?.core?.SELECTORS?.productList || "ul#product-list";
  return document.querySelector(sel);
}

/** Main results column — never the left filter sidebar. */
function findMainResultsScope() {
  const list = getProductList();
  if (!list) return null;
  return (
    list.closest('[class*="srp_search"]') ||
    list.closest('[class*="searchResult"]') ||
    list.closest('[class*="SearchResult"]') ||
    list.closest("main") ||
    list.parentElement?.parentElement ||
    list.parentElement
  );
}

function findSearchResultsHeading() {
  const scope = findMainResultsScope();
  if (!scope) return null;
  for (const el of scope.querySelectorAll("h1, h2, h3")) {
    if (isSearchResultsHeading(el)) return el;
  }
  return null;
}

function findBannerAnchor() {
  const list = getProductList();
  const heading = findSearchResultsHeading();
  if (!list || !heading?.parentNode) return null;
  const scope = findMainResultsScope();
  if (scope && !scope.contains(heading)) return null;
  return { parent: heading.parentNode, before: heading };
}

function isBannerPlaced(bar, anchor) {
  return !!bar?.isConnected && bar.parentNode === anchor.parent && bar.nextElementSibling === anchor.before;
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BANNER_ID} {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      box-sizing: border-box; width: 100%; max-width: 100%;
      margin: 0 0 12px; padding: 11px 14px;
      border: 1px solid #dfe3e8; border-radius: 4px;
      background: #f7f8fa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      font-size: 13px; line-height: 1.45; color: #333;
    }
    #${BANNER_ID} strong { font-weight: 700; color: #111; }
    #${BANNER_ID} .alt-onboard-copy { flex: 1; min-width: 0; }
    #${BANNER_ID} .alt-onboard-actions { display: flex; gap: 8px; flex-shrink: 0; }
    #${BANNER_ID} button {
      border: none; border-radius: 4px; cursor: pointer; font: inherit;
      font-size: 13px; font-weight: 700; padding: 7px 14px; white-space: nowrap;
    }
    #${BANNER_ID} .alt-onboard-dismiss {
      background: #0074e9; color: #fff;
    }
    #${BANNER_ID} .alt-onboard-dismiss:hover { background: #0064c8; }
  `;
  document.head.appendChild(style);
}

function clearRetryTimer() {
  if (retryTimer != null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function clearEnsureTimer() {
  if (ensureTimer != null) {
    clearTimeout(ensureTimer);
    ensureTimer = null;
  }
}

function removeBanner() {
  clearRetryTimer();
  document.getElementById(BANNER_ID)?.remove();
}

function createBannerElement() {
  ensureStyles();
  const bar = document.createElement("div");
  bar.id = BANNER_ID;
  bar.setAttribute("role", "status");
  bar.innerHTML =
    '<span class="alt-onboard-copy">알뜰이가 설치되었습니다. 브라우저 <strong>확장 프로그램 아이콘</strong>을 눌러 원하는 기능을 켜 보세요.</span>' +
    '<span class="alt-onboard-actions">' +
    '<button type="button" class="alt-onboard-dismiss">확인</button>' +
    "</span>";
  bar.querySelector(".alt-onboard-dismiss").addEventListener("click", () => {
    R.localSet({ onboardingBannerDismissed: true });
    stopDomWatch();
    shouldShowBanner = false;
    removeBanner();
  });
  return bar;
}

function placeBanner(bar, anchor) {
  if (!bar || !anchor?.parent || !anchor.before) return false;
  if (!isBannerPlaced(bar, anchor)) {
    anchor.parent.insertBefore(bar, anchor.before);
  }
  return true;
}

function ensureBannerVisible() {
  if (!shouldShowBanner || !isSearchPage()) return;

  const anchor = findBannerAnchor();
  if (!anchor) {
    mountBanner(0);
    return;
  }

  let bar = document.getElementById(BANNER_ID);
  if (!bar || !bar.isConnected) bar = createBannerElement();
  placeBanner(bar, anchor);
}

function scheduleEnsureBanner() {
  if (!shouldShowBanner) return;
  clearEnsureTimer();
  ensureTimer = setTimeout(ensureBannerVisible, ENSURE_DEBOUNCE_MS);
}

function startDomWatch() {
  if (domObserver) return;
  domObserver = new MutationObserver(() => scheduleEnsureBanner());
  domObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function stopDomWatch() {
  domObserver?.disconnect();
  domObserver = null;
  clearEnsureTimer();
}

function mountBanner(retryCount = 0) {
  if (!shouldShowBanner || !isSearchPage()) return false;

  const anchor = findBannerAnchor();
  if (!anchor) {
    if (retryCount < MAX_MOUNT_RETRIES) {
      clearRetryTimer();
      retryTimer = setTimeout(() => mountBanner(retryCount + 1), MOUNT_RETRY_MS);
    }
    return false;
  }

  clearRetryTimer();
  let bar = document.getElementById(BANNER_ID);
  if (!bar || !bar.isConnected) bar = createBannerElement();
  return placeBanner(bar, anchor);
}

function evaluate() {
  if (!isSearchPage()) {
    shouldShowBanner = false;
    stopDomWatch();
    removeBanner();
    return;
  }

  R.localGet(["onboardingBannerDismissed"], (local) => {
    if (local.onboardingBannerDismissed) {
      shouldShowBanner = false;
      stopDomWatch();
      removeBanner();
      return;
    }

    const keys = featureKeys();
    if (!keys.length) {
      shouldShowBanner = true;
      startDomWatch();
      mountBanner(0);
      return;
    }

    R.syncGet(keys, (stored) => {
      if (anyFeatureEnabled(stored || {})) {
        shouldShowBanner = false;
        stopDomWatch();
        removeBanner();
        return;
      }
      shouldShowBanner = true;
      startDomWatch();
      mountBanner(0);
    });
  });
}

function init() {
  if (!window.chrome?.storage?.sync) return;
  evaluate();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && featureKeys().some((key) => changes[key])) evaluate();
    if (area === "local" && changes.onboardingBannerDismissed) evaluate();
  });
}

globalThis.AltteuriOnboardingBanner = Object.freeze({
  init,
  evaluate,
  remove: removeBanner,
  ensureBannerVisible,
  findSearchResultsHeading,
  findBannerAnchor,
  findMainResultsScope,
  HEADING_RE,
});
})();
