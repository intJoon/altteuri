(() => {
const R = globalThis.AltteuriRuntime;
const BANNER_ID = "alt-onboarding-banner";
const STYLE_ID = "alt-onboarding-banner-styles";

function featureKeys() {
  return globalThis.AltteuriSettings?.FEATURE_TOGGLE_KEYS || [];
}

function pageSelectors() {
  return globalThis.Altteuri?.core?.SELECTORS || {};
}

function isSearchPage() {
  return /\/np\/search/.test(location.pathname);
}

function anyFeatureEnabled(stored) {
  return featureKeys().some((key) => !!stored[key]);
}

function findInsertTarget() {
  const SELECTORS = pageSelectors();
  const candidates = [
    () => document.querySelector(SELECTORS.sortWrapper),
    () => {
      const bars = document.querySelectorAll(".filter-function-bar");
      for (const node of bars) {
        if (node.id === BANNER_ID || node.hasAttribute("data-alt-onboarding")) continue;
        if (node.parentNode) return node;
      }
      return null;
    },
    () => document.querySelector('[class*="srp_filterArea"]'),
    () => document.querySelector('[class*="srp_relatedKeywords"]'),
    () => document.querySelector(SELECTORS.productList),
  ];
  for (const getNode of candidates) {
    const node = getNode();
    if (node?.parentNode) return { parent: node.parentNode, before: node };
  }
  return null;
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BANNER_ID} { margin-bottom: 8px; }
    #${BANNER_ID} .alt-onboard-copy {
      margin: 0;
      font: inherit;
      font-size: 13px;
      line-height: 1.55;
      color: #333;
    }
    #${BANNER_ID} .alt-onboard-copy strong { font-weight: 700; }
  `;
  document.head.appendChild(style);
}

function removeBanner() {
  document.getElementById(BANNER_ID)?.remove();
}

function mountBanner(retryCount = 0) {
  if (document.getElementById(BANNER_ID)) return;
  const target = findInsertTarget();
  if (!target) {
    if (retryCount < 15) setTimeout(() => mountBanner(retryCount + 1), 400);
    return;
  }

  ensureStyles();
  const bar = document.createElement("div");
  bar.id = BANNER_ID;
  bar.className = "filter-function-bar";
  bar.setAttribute("data-alt-onboarding", "");
  bar.setAttribute("role", "status");

  const header = document.createElement("div");
  header.className = "filter-function-bar-header";
  const title = document.createElement("h4");
  title.textContent = "알뜰이";
  const actionWrap = document.createElement("div");
  actionWrap.className = "fw-inline";
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "filter-reset-btn alt-onboard-dismiss";
  dismiss.textContent = "닫기";
  actionWrap.appendChild(dismiss);
  header.appendChild(title);
  header.appendChild(actionWrap);

  const body = document.createElement("div");
  body.className = "fw-px-[10px] fw-pb-[8px] fw-pt-[10px]";
  const copy = document.createElement("p");
  copy.className = "alt-onboard-copy";
  copy.innerHTML =
    "기능이 꺼져 있습니다. 브라우저 상단 <strong>확장 프로그램 아이콘</strong>을 눌러 원하는 기능을 켜 보세요.";
  body.appendChild(copy);

  bar.appendChild(header);
  bar.appendChild(body);

  dismiss.addEventListener("click", () => {
    R.localSet({ onboardingBannerDismissed: true });
    removeBanner();
  });

  target.parent.insertBefore(bar, target.before);
}

function shouldShowBanner(done) {
  if (!isSearchPage()) {
    done(false);
    return;
  }
  R.localGet(["onboardingBannerDismissed"], (local) => {
    if (local.onboardingBannerDismissed) {
      done(false);
      return;
    }
    R.syncGet(featureKeys(), (stored) => {
      done(!anyFeatureEnabled(stored || {}));
    });
  });
}

function evaluate() {
  shouldShowBanner((show) => {
    if (!show) {
      removeBanner();
      return;
    }
    mountBanner();
  });
}

function ensurePresent() {
  if (!isSearchPage()) return;
  if (document.getElementById(BANNER_ID)) return;
  shouldShowBanner((show) => {
    if (!show) return;
    mountBanner();
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
  ensurePresent,
  remove: removeBanner,
});
})();
