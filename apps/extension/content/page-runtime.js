((A) => {
const { SELECTORS } = A.core;
const R = globalThis.AltteuriRuntime;
const RECONCILE_MS = 30;
const RECONCILE_DEBOUNCE_MS = 50;
const URL_WATCH_MS = 1000;
const UNDERFILL_STABLE_MS = 120;

let forcedListSize = null;
let reconcileDebounceTimer = null;
let loadWaitTimer = null;
let domObserver = null;
let applyBusy = false;
let pageOpts = { resetActive: false, restore: true };
let watchedList = null;
let watchedSort = null;
let watchedCount = -1;
let searchObserversActive = false;
let underfillStableCount = -1;
let underfillStableSince = 0;

function resetListLoadState() {
  underfillStableCount = -1;
  underfillStableSince = 0;
}

function isUnderfilledListStable(length) {
  const now = Date.now();
  if (length !== underfillStableCount) {
    underfillStableCount = length;
    underfillStableSince = now;
    return false;
  }
  return now - underfillStableSince >= UNDERFILL_STABLE_MS;
}

function isSearchPage() {
  return /\/np\/search/.test(location.pathname);
}

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
  if (!R?.isContextValid()) {
    forcedListSize = null;
    if (typeof done === 'function') done();
    return;
  }
  R.syncGet(['forceCoupangListSize', 'coupangListSize'], result => {
    forcedListSize = result.forceCoupangListSize
      ? String(result.coupangListSize || '72')
      : null;
    if (typeof done === 'function') done();
  });
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
  if (listSizeUrlMismatch()) return false;
  const expected = getExpectedListCount();
  if (length >= expected) return true;
  // Coupang never pads the grid past the last matching product.
  return isUnderfilledListStable(length);
}

function whenReady(fn) {
  const step = () => {
    if (!isSearchPage()) return;
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
  if (!R?.isContextValid()) {
    applyPageFeatures(options, {});
    finish();
    return;
  }
  R.syncGet(['unitPriceSortOrder', 'priceSortOrder'], syncResult => {
    R.localGet(['altActiveSort', 'altSortQuery'], localResult => {
      applyPageFeatures(options, Object.assign({}, syncResult, localResult));
      pageOpts = {
        resetActive: false,
        restore: !!options.restore,
        forceFull: false
      };
      finish();
    });
  });
}

function healMissingCustoms() {
  A.sort.healMissingButtons();
  try { A.keyword.ensurePresent(); } catch (e) {}
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

function stopLoadWaitReconcile() {
  if (loadWaitTimer != null) {
    clearTimeout(loadWaitTimer);
    loadWaitTimer = null;
  }
}

function scheduleLoadWaitReconcile() {
  if (loadWaitTimer != null || !isSearchPage()) return;
  const tick = () => {
    loadWaitTimer = null;
    if (!isSearchPage()) return;
    reconcile();
    if (!isProductListFullyLoaded()) {
      loadWaitTimer = setTimeout(tick, RECONCILE_MS);
    }
  };
  loadWaitTimer = setTimeout(tick, RECONCILE_MS);
}

function scheduleDebouncedReconcile() {
  if (!isSearchPage()) return;
  if (reconcileDebounceTimer != null) clearTimeout(reconcileDebounceTimer);
  reconcileDebounceTimer = setTimeout(() => {
    reconcileDebounceTimer = null;
    reconcile();
  }, RECONCILE_DEBOUNCE_MS);
}

function requestReconcile(opts) {
  if (!isSearchPage()) return;
  clearPendingReconcileStyles();
  if (opts && opts.immediate) {
    reconcile();
  } else {
    scheduleDebouncedReconcile();
  }
  if (!isProductListFullyLoaded()) scheduleLoadWaitReconcile();
}

function clearPendingReconcileStyles() {
  try {
    document.documentElement.classList.remove('alt-customs-pending');
    const stale = document.getElementById('alt-customs-pending-style');
    if (stale) stale.remove();
    const loader = document.getElementById('alt-swap-loader');
    if (loader) loader.remove();
    const loaderStyle = document.getElementById('alt-swap-loader-style');
    if (loaderStyle) loaderStyle.remove();
  } catch (e) {}
}

function reconcile() {
  if (!isSearchPage()) return;
  if (listSizeUrlMismatch()) {
    try { A.listSize.setFromSettings(); } catch (e) {}
    return;
  }

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

  if (isProductListFullyLoaded()) stopLoadWaitReconcile();
}

function stopReconcileLoop() {
  stopLoadWaitReconcile();
  if (reconcileDebounceTimer != null) {
    clearTimeout(reconcileDebounceTimer);
    reconcileDebounceTimer = null;
  }
}

function stopSearchObservers() {
  stopReconcileLoop();
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
  searchObserversActive = false;
  watchedList = null;
  watchedSort = null;
  watchedCount = -1;
  resetListLoadState();
}

function startReconcileLoop() {
  if (!isSearchPage()) return;
  requestReconcile({ immediate: true });
}

function onDomMutated() {
  if (!isSearchPage()) return;
  if (listSizeUrlMismatch()) {
    try { A.listSize.setFromSettings(); } catch (e) {}
    return;
  }
  requestReconcile({});
}

function ensureDomObserver() {
  if (domObserver || !isSearchPage()) return;
  domObserver = new MutationObserver(onDomMutated);
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function activateSearchObservers() {
  if (!isSearchPage() || searchObserversActive) return;
  searchObserversActive = true;
  ensureDomObserver();
  refreshForcedListSize(() => {
    schedulePageApply({ resetActive: true, restore: true });
  });
}

function schedulePageApply(opts) {
  if (!isSearchPage()) return;
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
      resetListLoadState();
      A.sort.clearOriginalProductOrder();
    }
    startReconcileLoop();
  });
}

function applySubFeatures() {
  schedulePageApply({});
}

function observePageAndListSize() {
  let lastUrl = location.href;
  let lastPageSize = getCurrentPageInfo().size;
  let lastWasSearch = isSearchPage();

  if (lastWasSearch) {
    A.keyword.trackCurrentQuery();
    refreshForcedListSize();
    activateSearchObservers();
  }

  setInterval(() => {
    const currentUrl = location.href;
    const onSearch = isSearchPage();
    const currentPageSize = getCurrentPageInfo().size;

    if (!onSearch) {
      if (lastWasSearch) {
        stopSearchObservers();
        lastWasSearch = false;
      }
      lastUrl = currentUrl;
      return;
    }

    if (!lastWasSearch) {
      lastWasSearch = true;
      A.keyword.trackCurrentQuery();
      refreshForcedListSize();
      activateSearchObservers();
    }

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
  }, URL_WATCH_MS);

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
    return;
  }
  if (isSearchPage()) activateSearchObservers();
}

A.page = Object.freeze({
  observeProductList,
  schedulePageApply,
  applySubFeatures,
  whenReady,
  isProductListFullyLoaded,
  getCurrentPageInfo,
  isSearchPage,
  stopSearchObservers
});
})(globalThis.Altteuri ||= {});
