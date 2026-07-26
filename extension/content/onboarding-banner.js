(() => {
const R = globalThis.AltteuriRuntime;
const SHELL_ID = "alt-onboarding-banner";
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
    #${SHELL_ID} {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #f0f7ff;
      border-bottom: 1px solid #dfe3e8;
      font-family: "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;
      box-sizing: border-box;
    }
    #${SHELL_ID} .alt-onboarding-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 44px;
      margin: 0 auto;
      padding: 10px var(--alt-onboard-pad-right, 16px) 10px var(--alt-onboard-pad-left, 16px);
      max-width: var(--alt-onboard-max-width, none);
      box-sizing: border-box;
    }
    #${SHELL_ID} .alt-onboarding-msg {
      margin: 0;
      flex: 1;
      min-width: 0;
      font-size: 14px;
      line-height: 1.45;
      font-weight: 400;
      color: #333;
      letter-spacing: -0.01em;
    }
    #${SHELL_ID} .alt-onboarding-msg strong {
      font-weight: 700;
      color: #111;
    }
    #${SHELL_ID} .alt-onboard-dismiss {
      flex: none;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      padding: 8px 14px;
      background: #346aff;
      color: #fff;
    }
    #${SHELL_ID} .alt-onboard-dismiss:hover { background: #2a58d6; }
    #${SHELL_ID} .alt-onboard-dismiss:active { background: #244fc4; }
  `;
  document.head.appendChild(style);
}

function readLayoutMetrics() {
  const contents = document.querySelector("#contents");
  const filter = document.querySelector('[class*="srp_filterArea"]');
  const productList = document.querySelector(globalThis.Altteuri?.core?.SELECTORS?.productList || "#product-list");

  if (contents) {
    const rect = contents.getBoundingClientRect();
    const cs = getComputedStyle(contents);
    let padLeft = parseFloat(cs.paddingLeft) || 0;
    let padRight = parseFloat(cs.paddingRight) || 0;

    if (filter && productList) {
      const filterRect = filter.getBoundingClientRect();
      const listRect = productList.getBoundingClientRect();
      padLeft = Math.max(0, Math.round(filterRect.left - rect.left));
      padRight = Math.max(0, Math.round(rect.right - listRect.right));
    }

    const maxWidth = cs.maxWidth && cs.maxWidth !== "none" ? cs.maxWidth : `${Math.round(rect.width)}px`;
    return { maxWidth, padLeft, padRight };
  }

  return { maxWidth: "1024px", padLeft: 16, padRight: 16 };
}

function applyLayoutMetrics(shell) {
  const { maxWidth, padLeft, padRight } = readLayoutMetrics();
  shell.style.setProperty("--alt-onboard-max-width", maxWidth);
  shell.style.setProperty("--alt-onboard-pad-left", `${padLeft}px`);
  shell.style.setProperty("--alt-onboard-pad-right", `${padRight}px`);
}

function findMountRoot() {
  return document.querySelector("#contents");
}

function removeBanner() {
  document.getElementById(SHELL_ID)?.remove();
  if (removeBanner.resizeHandler) {
    window.removeEventListener("resize", removeBanner.resizeHandler);
    removeBanner.resizeHandler = null;
  }
}

function mountBanner(retryCount = 0) {
  if (document.getElementById(SHELL_ID)) return true;

  const root = findMountRoot();
  if (!root) {
    if (retryCount < 20) {
      setTimeout(() => mountBanner(retryCount + 1), 250);
    }
    return false;
  }

  ensureStyles();
  const shell = document.createElement("div");
  shell.id = SHELL_ID;
  shell.setAttribute("role", "status");
  shell.innerHTML =
    '<div class="alt-onboarding-inner">' +
    '<p class="alt-onboarding-msg">알뜰이 기능이 모두 꺼져 있습니다. 브라우저 <strong>확장 프로그램 아이콘</strong>을 눌러 원하는 기능을 켜 보세요.</p>' +
    '<button type="button" class="alt-onboard-dismiss">확인</button>' +
    "</div>";

  shell.querySelector(".alt-onboard-dismiss").addEventListener("click", () => {
    R.localSet({ onboardingBannerDismissed: true });
    removeBanner();
  });

  applyLayoutMetrics(shell);
  root.insertBefore(shell, root.firstChild);

  const onResize = () => {
    const live = document.getElementById(SHELL_ID);
    if (live) applyLayoutMetrics(live);
  };
  removeBanner.resizeHandler = onResize;
  window.addEventListener("resize", onResize, { passive: true });

  return true;
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
  readLayoutMetrics,
});
})();
