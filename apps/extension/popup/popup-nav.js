(() => {
const R = globalThis.AltteuriRuntime;

const pageMain = document.getElementById("page-main");
const pageDetail = document.getElementById("page-detail");
const pageFeedback = document.getElementById("page-feedback");
const navRemove = document.getElementById("nav-remove");
const navBack = document.getElementById("nav-back");
const navFeedback = document.getElementById("nav-feedback");
const navBackFeedback = document.getElementById("nav-back-feedback");
const POPUP_PAGE_KEY = "altPopupPage";

let detailHeightLock = 0;
let currentPage = "main";

function measureExpandedMainHeight() {
  if (!pageMain) return 0;
  const wasMainHidden = !!pageMain.hidden;
  if (!wasMainHidden) return pageMain.offsetHeight;
  const prevBodyVisibility = document.body.style.visibility;
  document.body.style.visibility = "hidden";
  pageMain.hidden = false;
  const height = pageMain.offsetHeight;
  pageMain.hidden = true;
  document.body.style.visibility = prevBodyVisibility;
  return height;
}

function persistPopupPage(name) {
  R.sessionSet({ [POPUP_PAGE_KEY]: name });
}

function restorePopupPage(done) {
  R.sessionGet([POPUP_PAGE_KEY], (result) => {
    const name = result && result[POPUP_PAGE_KEY];
    done(name === "detail" || name === "feedback" ? name : "main");
  }, {});
}

function showPage(name, opts) {
  const options = opts || {};
  const prev = currentPage;
  if (name !== "feedback" && prev === "feedback" && globalThis.AltteuriPopupFeedback) {
    globalThis.AltteuriPopupFeedback.abortFetch();
  }
  if (prev === "detail" && name !== "detail" && globalThis.AltteuriPopupPresets) {
    globalThis.AltteuriPopupPresets.clearSearch();
  }

  if (name === "detail") {
    detailHeightLock = pageMain.offsetHeight;
  } else {
    if (pageDetail) pageDetail.style.height = "";
    detailHeightLock = 0;
  }

  if (pageFeedback) {
    pageFeedback.style.height = "";
    if (name === "feedback") {
      const cap = measureExpandedMainHeight();
      pageFeedback.style.maxHeight = cap ? cap + "px" : "";
    } else {
      pageFeedback.style.maxHeight = "";
    }
  }

  if (pageMain) pageMain.hidden = name !== "main";
  if (pageDetail) pageDetail.hidden = name !== "detail";
  if (pageFeedback) pageFeedback.hidden = name !== "feedback";
  currentPage = name;
  if (!options.skipPersist) persistPopupPage(name);

  if (name === "detail" && globalThis.AltteuriPopupSettings) {
    globalThis.AltteuriPopupSettings.syncRemoveBody();
  }
  if (name === "feedback" && globalThis.AltteuriPopupFeedback) {
    globalThis.AltteuriPopupFeedback.enterPage();
  }
  window.scrollTo(0, 0);
}

function bindNavigation() {
  if (navRemove) {
    navRemove.addEventListener("click", () => showPage("detail"));
    navRemove.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showPage("detail");
      }
    });
  }
  if (navBack) navBack.addEventListener("click", () => showPage("main"));
  if (navFeedback) navFeedback.addEventListener("click", () => showPage("feedback"));
  if (navBackFeedback) navBackFeedback.addEventListener("click", () => showPage("main"));
}

globalThis.AltteuriPopupNav = Object.freeze({
  showPage,
  restorePopupPage,
  getDetailHeightLock: () => detailHeightLock,
  bindNavigation,
});
})();
