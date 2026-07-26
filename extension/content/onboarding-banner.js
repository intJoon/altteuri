(() => {
const R = globalThis.AltteuriRuntime;
const TOAST_ID = "alt-onboarding-toast";
const STYLE_ID = "alt-onboarding-toast-styles";
const FEATURE_EVER_KEY = globalThis.AltteuriSettings?.ONBOARDING_FEATURE_EVER_ENABLED
  || "onboardingFeatureEverEnabled";

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
    #${TOAST_ID} {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 2147483646;
      width: min(360px, calc(100vw - 40px));
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 18px;
      border-radius: 14px;
      border: 1px solid #c9d8ff;
      background: #fff;
      color: #212b36;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif;
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 16px 40px rgba(36, 79, 196, 0.18), 0 4px 12px rgba(26, 36, 51, 0.08);
      transform: translateY(16px);
      opacity: 0;
      animation: alt-onboard-in 0.35s ease forwards;
      pointer-events: auto;
    }
    @keyframes alt-onboard-in {
      to { transform: translateY(0); opacity: 1; }
    }
    #${TOAST_ID}.alt-onboard-out {
      animation: alt-onboard-out 0.25s ease forwards;
    }
    @keyframes alt-onboard-out {
      to { transform: translateY(12px); opacity: 0; }
    }
    #${TOAST_ID} .alt-onboard-head {
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; font-weight: 700; color: #244fc4;
    }
    #${TOAST_ID} .alt-onboard-icon {
      width: 28px; height: 28px; border-radius: 8px;
      flex: none; display: block; object-fit: contain;
      background: #346aff;
      box-shadow: 0 2px 8px rgba(47, 95, 240, 0.2);
    }
    #${TOAST_ID} .alt-onboard-copy { margin: 0; color: #454b53; }
    #${TOAST_ID} .alt-onboard-copy strong { color: #212b36; font-weight: 700; }
    #${TOAST_ID} .alt-onboard-actions { display: flex; justify-content: flex-end; gap: 8px; }
    #${TOAST_ID} button {
      border: none; border-radius: 8px; cursor: pointer;
      font: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px;
    }
    #${TOAST_ID} .alt-onboard-dismiss { background: #346aff; color: #fff; }
    #${TOAST_ID} .alt-onboard-dismiss:hover { background: #2a58d6; }
  `;
  document.head.appendChild(style);
}

function removeToast(immediate) {
  const el = document.getElementById(TOAST_ID);
  if (!el) return;
  if (immediate) {
    el.remove();
    return;
  }
  el.classList.add("alt-onboard-out");
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

function dismissToast() {
  R.localSet({ onboardingBannerDismissed: true });
  removeToast(false);
}

function mountToast() {
  if (document.getElementById(TOAST_ID)) return;
  ensureStyles();
  const iconUrl = chrome.runtime.getURL("icon48.png");
  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML =
    '<div class="alt-onboard-head">' +
    `<img class="alt-onboard-icon" src="${iconUrl}" width="28" height="28" alt="" decoding="async">` +
    "<span>알뜰이가 설치되었습니다</span></div>" +
    '<p class="alt-onboard-copy">브라우저 <strong>확장 프로그램 아이콘</strong>을 눌러 원하는 기능을 켜 보세요.</p>' +
    '<div class="alt-onboard-actions">' +
    '<button type="button" class="alt-onboard-dismiss">확인</button>' +
    "</div>";
  toast.querySelector(".alt-onboard-dismiss").addEventListener("click", dismissToast);
  document.body.appendChild(toast);
}

function markOnboardingComplete() {
  R.localSet({ [FEATURE_EVER_KEY]: true, onboardingBannerDismissed: true });
}

function evaluate() {
  if (!isSearchPage()) {
    removeToast(true);
    return;
  }
  R.localGet(["onboardingBannerDismissed", FEATURE_EVER_KEY], (local) => {
    if (local.onboardingBannerDismissed || local[FEATURE_EVER_KEY]) {
      removeToast(true);
      return;
    }
    R.syncGet(featureKeys(), (stored) => {
      if (anyFeatureEnabled(stored || {})) {
        markOnboardingComplete();
        removeToast(true);
        return;
      }
      mountToast();
    });
  });
}

function init() {
  if (!window.chrome?.storage?.sync) return;
  evaluate();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && featureKeys().some((key) => changes[key])) evaluate();
    if (area === "local" && (changes.onboardingBannerDismissed || changes[FEATURE_EVER_KEY])) evaluate();
  });
}

globalThis.AltteuriOnboardingBanner = Object.freeze({
  init,
  evaluate,
  remove: () => removeToast(true),
});
})();
