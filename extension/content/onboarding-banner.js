(() => {
const R = globalThis.AltteuriRuntime;
const BANNER_ID = "alt-onboarding-banner";
const STYLE_ID = "alt-onboarding-banner-styles";
const HEADING_RE = /에\s*대한\s*검색\s*결과/;
const MAX_MOUNT_RETRIES = 24;
const MOUNT_RETRY_MS = 400;

function featureKeys() {
  return globalThis.AltteuriSettings?.FEATURE_TOGGLE_KEYS || [];
}

function isSearchPage() {
  return /\/np\/search/.test(location.pathname);
}

function anyFeatureEnabled(stored) {
  return featureKeys().some((key) => !!stored[key]);
}

function headingText(el) {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

function isSearchResultsHeading(el) {
  return !!el && HEADING_RE.test(headingText(el));
}

/** Prefer the main-column title (e.g. '사과'에 대한 검색결과). */
function findSearchResultsHeading() {
  const explicit = document.querySelector('[class*="searchResult"] h1, [class*="SearchResult"] h1, [class*="searchResult"] h2, [class*="SearchResult"] h2');
  if (explicit && isSearchResultsHeading(explicit)) return explicit;

  for (const el of document.querySelectorAll("h1, h2, h3")) {
    if (isSearchResultsHeading(el)) return el;
  }

  for (const el of document.querySelectorAll('[class*="headline"], [class*="Headline"], [class*="title"], [class*="Title"]')) {
    if (isSearchResultsHeading(el)) return el;
  }

  const productListSel = globalThis.Altteuri?.core?.SELECTORS?.productList;
  const list = productListSel ? document.querySelector(productListSel) : document.querySelector("ul#product-list");
  if (!list) return null;

  let scope = list.parentElement;
  for (let depth = 0; depth < 10 && scope; depth += 1) {
    const local = scope.querySelector("h1, h2, h3");
    if (local && isSearchResultsHeading(local)) return local;
    scope = scope.parentElement;
  }
  return null;
}

function findBannerAnchor() {
  const heading = findSearchResultsHeading();
  if (heading?.parentNode) return { parent: heading.parentNode, before: heading };
  return null;
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

function removeBanner() {
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
    removeBanner();
  });
  return bar;
}

function placeBanner(bar, anchor) {
  if (!bar || !anchor?.parent || !anchor.before) return false;
  if (bar.parentNode !== anchor.parent || bar.nextElementSibling !== anchor.before) {
    anchor.parent.insertBefore(bar, anchor.before);
  }
  return true;
}

function mountBanner(retryCount = 0) {
  const anchor = findBannerAnchor();
  if (!anchor) {
    if (retryCount < MAX_MOUNT_RETRIES) {
      setTimeout(() => mountBanner(retryCount + 1), MOUNT_RETRY_MS);
    }
    return false;
  }

  let bar = document.getElementById(BANNER_ID);
  if (!bar) bar = createBannerElement();
  return placeBanner(bar, anchor);
}

function evaluate() {
  if (!isSearchPage()) {
    removeBanner();
    return;
  }
  R.localGet(["onboardingBannerDismissed"], (local) => {
    if (local.onboardingBannerDismissed) {
      removeBanner();
      return;
    }
    R.syncGet(featureKeys(), (stored) => {
      if (anyFeatureEnabled(stored || {})) {
        removeBanner();
        return;
      }
      mountBanner();
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
  findSearchResultsHeading,
  findBannerAnchor,
  HEADING_RE,
});
})();
