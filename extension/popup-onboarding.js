(() => {
const R = globalThis.AltteuriRuntime;
const FEATURE_KEYS = globalThis.AltteuriSettings.FEATURE_TOGGLE_KEYS;
const BANNER_ID = "popup-onboarding";

function anyFeatureEnabled(stored) {
  return FEATURE_KEYS.some((key) => !!stored[key]);
}

function removeBanner() {
  document.getElementById(BANNER_ID)?.remove();
}

function renderBanner() {
  if (document.getElementById(BANNER_ID)) return;
  const bar = document.createElement("div");
  bar.id = BANNER_ID;
  bar.className = "onboarding-banner";
  bar.setAttribute("role", "status");
  bar.innerHTML =
    '<p><strong>기능이 모두 꺼져 있습니다.</strong> 원하는 항목만 켜 보세요. 추천: <button type="button" class="onboarding-tip" data-tip="unit">단위가격순</button></p>' +
    '<button type="button" class="onboarding-dismiss" aria-label="안내 닫기">✕</button>';
  bar.querySelector(".onboarding-dismiss").addEventListener("click", () => {
    R.localSet({ onboardingPopupDismissed: true });
    removeBanner();
  });
  bar.querySelector(".onboarding-tip").addEventListener("click", () => {
    const toggle = document.getElementById("toggle-unit-price-sort");
    if (toggle) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    }
    R.localSet({ onboardingPopupDismissed: true });
    removeBanner();
  });
  const titleBar = document.querySelector(".title-bar");
  if (titleBar?.parentNode) titleBar.parentNode.insertBefore(bar, titleBar.nextSibling);
  else document.body.prepend(bar);
}

function evaluate() {
  R.localGet(["onboardingPopupDismissed"], (local) => {
    if (local.onboardingPopupDismissed) {
      removeBanner();
      return;
    }
    R.syncGet(FEATURE_KEYS, (stored) => {
      if (anyFeatureEnabled(stored || {})) {
        removeBanner();
        return;
      }
      renderBanner();
    });
  });
}

function bind() {
  evaluate();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && FEATURE_KEYS.some((key) => changes[key])) evaluate();
    if (area === "local" && changes.onboardingPopupDismissed) evaluate();
  });
}

globalThis.AltteuriPopupOnboarding = Object.freeze({ bind, evaluate });
})();
