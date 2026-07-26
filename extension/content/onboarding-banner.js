(() => {
const R = globalThis.AltteuriRuntime;
const BANNER_ID = "alt-onboarding-banner";
const STYLE_ID = "alt-onboarding-banner-styles";

function featureKeys() {
  return globalThis.AltteuriSettings?.FEATURE_TOGGLE_KEYS || [];
}

function isSearchPage() {
  return /\/np\/search/.test(location.pathname);
}

function anyFeatureEnabled(stored) {
  return featureKeys().some((key) => !!stored[key]);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BANNER_ID} {
      position: sticky; top: 0; z-index: 2147483646;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 14px; margin: 0 0 8px;
      background: #edf2ff; border-bottom: 1px solid #c9d8ff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif;
      font-size: 13px; line-height: 1.45; color: #244fc4;
      box-shadow: 0 4px 16px rgba(36, 79, 196, 0.08);
    }
    #${BANNER_ID} strong { font-weight: 700; }
    #${BANNER_ID} .alt-onboard-actions { display: flex; gap: 8px; flex-shrink: 0; }
    #${BANNER_ID} button {
      border: none; border-radius: 8px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
      padding: 8px 12px;
    }
    #${BANNER_ID} .alt-onboard-dismiss { background: #346aff; color: #fff; }
  `;
  document.head.appendChild(style);
}

function removeBanner() {
  document.getElementById(BANNER_ID)?.remove();
}

function mountBanner() {
  if (document.getElementById(BANNER_ID)) return;
  ensureStyles();
  const bar = document.createElement("div");
  bar.id = BANNER_ID;
  bar.setAttribute("role", "status");
  bar.innerHTML =
    '<span>알뜰이가 설치되었습니다. 브라우저 <strong>확장 프로그램 아이콘</strong>을 눌러 원하는 기능을 켜 보세요.</span>' +
    '<span class="alt-onboard-actions">' +
    '<button type="button" class="alt-onboard-dismiss">확인</button>' +
    "</span>";
  bar.querySelector(".alt-onboard-dismiss").addEventListener("click", () => {
    R.localSet({ onboardingBannerDismissed: true });
    removeBanner();
  });
  let anchor = document.querySelector("#contents") || document.querySelector("main");
  const productListSel = globalThis.Altteuri?.core?.SELECTORS?.productList;
  if (!anchor && productListSel) {
    const list = document.querySelector(productListSel);
    if (list?.parentElement) anchor = list.parentElement;
  }
  if (!anchor) anchor = document.body.firstElementChild;
  if (anchor?.parentNode) anchor.parentNode.insertBefore(bar, anchor);
  else document.body.prepend(bar);
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

globalThis.AltteuriOnboardingBanner = Object.freeze({ init, evaluate, remove: removeBanner });
})();
