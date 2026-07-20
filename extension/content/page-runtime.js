((A) => {
const { SELECTORS } = A.core;
const RECONCILE_MS = 30;

let forcedListSize = null;
let reconcileTimer = null;
let applyBusy = false;
let pageOpts = { resetActive: false, restore: true };
let watchedList = null;
let watchedSort = null;
let watchedCount = -1;

function mergePageApplyOpts(prev, next) {
  const n = next || {};
  if (!prev) {
    return {
      resetActive: !!n.resetActive,
      restore: !!n.restore,
      forceFull: !!n.forceFull
    };
  }
  return {
    resetActive: !!(prev.resetActive || n.resetActive),
    restore: !!(prev.restore || n.restore),
    forceFull: !!(prev.forceFull || n.forceFull)
  };
}

function getCurrentPageInfo() {
  let page = 1;
  let size = 36;
  try {
    const url = new URL(window.location.href);
    const pageParam = url.searchParams.get('page');
    if (pageParam) page = parseInt(pageParam, 10);
  } catch {}
  const selected = document.querySelector(SELECTORS.listSizeSelectedRadio);
  if (selected && selected.value) size = parseInt(selected.value, 10);
  return { page, size };
}

function productListLength() {
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return 0;
  return productList.querySelectorAll(SELECTORS.productItem).length;
}

function refreshForcedListSize(done) {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) {
    forcedListSize = null;
    if (typeof done === 'function') done();
    return;
  }
  try {
    chrome.storage.sync.get(['forceCoupangListSize', 'coupangListSize'], result => {
      forcedListSize = result.forceCoupangListSize
        ? String(result.coupangListSize || '72')
        : null;
      if (typeof done === 'function') done();
    });
  } catch (e) {
    forcedListSize = null;
    if (typeof done === 'function') done();
  }
}

function listSizeUrlMismatch() {
  if (!forcedListSize) return false;
  try {
    return new URL(location.href).searchParams.get('listSize') !== forcedListSize;
  } catch {
    return false;
  }
}

function getExpectedListCount() {
  if (forcedListSize) {
    const n = parseInt(forcedListSize, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return getCurrentPageInfo().size;
}

function isProductListFullyLoaded() {
  const length = productListLength();
  if (length === 0) return false;
  return length >= getExpectedListCount();
}

function whenReady(fn) {
  const step = () => {
    if (listSizeUrlMismatch()) {
      try { A.listSize.setFromSettings(); } catch (e) {}
      setTimeout(step, RECONCILE_MS);
      return;
    }
    if (isProductListFullyLoaded()) {
      try { fn(); } catch (e) {}
      return;
    }
    setTimeout(step, RECONCILE_MS);
  };
  step();
}

function applyPageFeatures(opts, storage) {
  const options = opts || {};
  const sync = storage || {};

  if (options.resetActive) {
    A.sort.clearActiveFlags();
  }

  A.sort.addButtons();
  A.keyword.addFeature();
  A.sort.updateSeparator();
  A.sort.updateAllButtonUIs();

  A.remover.applyHiddenElements({ reapplySort: true });
  A.quickCart.applyButtons();

  let activeKind = null;
  if (options.restore) {
    const q = A.keyword.getSearchQueryKey() || '';
    if (sync.altActiveSort && (sync.altSortQuery || '') === q) {
      activeKind = sync.altActiveSort;
    }
  } else {
    activeKind = A.sort.getActiveKind();
  }

  if (activeKind) {
    const orderKey = activeKind === 'unit' ? 'unitPriceSortOrder'
      : activeKind === 'price' ? 'priceSortOrder'
      : null;
    const order = orderKey ? (sync[orderKey] || 'asc') : null;
    A.sort.runSortWithOrder(activeKind, order);
  } else {
    A.keyword.applyFilter();
  }
}

function mountCustoms(opts, done) {
  const finish = () => { if (typeof done === 'function') done(); };
  const options = opts || {};
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) {
    applyPageFeatures(options, {});
    finish();
    return;
  }
  try {
    chrome.storage.sync.get(
      ['unitPriceSortOrder', 'priceSortOrder'],
      syncResult => {
        chrome.storage.local.get(['altActiveSort', 'altSortQuery'], localResult => {
          applyPageFeatures(options, Object.assign({}, syncResult, localResult));
          pageOpts = {
            resetActive: false,
            restore: !!options.restore,
            forceFull: false
          };
          finish();
        });
      }
    );
  } catch (e) {
    applyPageFeatures(options, {});
    finish();
  }
}

function healMissingCustoms() {
  A.sort.healMissingButtons();
  try { A.keyword.ensurePresent(); } catch (e) {}
  try { A.quickCart.applyButtons(); } catch (e) {}
}

function remountCustoms(opts) {
  if (applyBusy) {
    pageOpts = mergePageApplyOpts(pageOpts, opts);
    return;
  }
  applyBusy = true;
  A.sort.clearOriginalProductOrder();
  mountCustoms(opts || pageOpts, () => { applyBusy = false; });
}

function reconcile() {
  if (listSizeUrlMismatch()) {
    try { A.listSize.setFromSettings(); } catch (e) {}
    return;
  }
  if (!/\/np\/search/.test(location.pathname)) return;

  const list = document.querySelector(SELECTORS.productList);
  const count = productListLength();
  if (!list || count === 0) return;

  const sortUl = document.querySelector(SELECTORS.sortList);
  const chromeChanged = list !== watchedList || sortUl !== watchedSort;

  if (chromeChanged) {
    watchedList = list;
    watchedSort = sortUl;
    watchedCount = count;
    remountCustoms(pageOpts);
    return;
  }

  if (count !== watchedCount) {
    watchedCount = count;
    const activeKind = A.sort.getActiveKind();
    if (activeKind) A.sort.runSort(activeKind);
  }

  healMissingCustoms();
}

function startReconcileLoop() {
  if (reconcileTimer != null) return;
  try {
    document.documentElement.classList.remove('alt-customs-pending');
    const stale = document.getElementById('alt-customs-pending-style');
    if (stale) stale.remove();
    const loader = document.getElementById('alt-swap-loader');
    if (loader) loader.remove();
    const loaderStyle = document.getElementById('alt-swap-loader-style');
    if (loaderStyle) loaderStyle.remove();
  } catch (e) {}
  reconcileTimer = setInterval(reconcile, RECONCILE_MS);
  reconcile();
}

function schedulePageApply(opts) {
  refreshForcedListSize(() => {
    if (listSizeUrlMismatch()) {
      try { A.listSize.setFromSettings(); } catch (e) {}
      return;
    }
    pageOpts = mergePageApplyOpts(pageOpts, opts);
    if (opts && (opts.forceFull || opts.resetActive)) {
      watchedList = null;
      watchedSort = null;
      watchedCount = -1;
      A.sort.clearOriginalProductOrder();
    }
    startReconcileLoop();
    reconcile();
  });
}

function applySubFeatures() {
  schedulePageApply({});
}

function observePageAndListSize() {
  let lastUrl = location.href;
  let lastPageSize = getCurrentPageInfo().size;
  A.keyword.trackCurrentQuery();
  refreshForcedListSize();

  setInterval(() => {
    const currentUrl = location.href;
    const currentPageSize = getCurrentPageInfo().size;

    A.keyword.handleSearchQueryChange();

    const urlChanged = currentUrl !== lastUrl;
    const sizeChanged = currentPageSize !== lastPageSize;

    if (urlChanged) {
      refreshForcedListSize(() => {
        A.listSize.setFromSettings(({ redirected }) => {
          if (redirected) return;
          lastUrl = location.href;
          lastPageSize = getCurrentPageInfo().size;
          schedulePageApply({ resetActive: true, restore: true, forceFull: true });
        });
      });
      lastUrl = currentUrl;
      lastPageSize = currentPageSize;
      return;
    }

    if (sizeChanged) {
      lastPageSize = currentPageSize;
      schedulePageApply({ resetActive: false, restore: true, forceFull: true });
    }
  }, 1000);

  const sortUl = document.querySelector(SELECTORS.sortList);
  if (sortUl) {
    sortUl.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li && !li.classList.contains('unit-price-sort-btn') && !li.classList.contains('discount-rate-sort-btn') && !li.classList.contains('price-sort-btn')) {
        const a = li.querySelector('a[href]');
        if (a && a.href) {
          location.href = a.href;
        }
      }
    });
  }
}

function observeProductList() {
  if (!observeProductList.pageWatchStarted) {
    observeProductList.pageWatchStarted = true;
    observePageAndListSize();
  }

  function onDomMutated() {
    if (listSizeUrlMismatch()) {
      try { A.listSize.setFromSettings(); } catch (e) {}
      return;
    }
    startReconcileLoop();
    reconcile();
  }

  new MutationObserver(onDomMutated).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  refreshForcedListSize(() => {
    schedulePageApply({ resetActive: true, restore: true });
  });
}

A.page = Object.freeze({
  observeProductList,
  schedulePageApply,
  applySubFeatures,
  whenReady,
  isProductListFullyLoaded,
  getCurrentPageInfo
});
})(globalThis.Altteuri ||= {});
