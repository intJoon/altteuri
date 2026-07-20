((A) => {
const {
  SELECTORS, calculateUnitPrice, calculateDiscountRate,
  getPriceValue, updateUnitPriceBadge, updateDiscountRateBadge,
  getSortableProductItems, clearRankMark, isSortVisibleItem,
  applySortedProductOrder, updateRankMark
} = A.core;
const sortActive = { unit: false, discount: false, price: false };
let originalProductOrder = null;

function captureOriginalProductOrder(productList) {
  if (!productList || originalProductOrder) return;
  originalProductOrder = Array.from(productList.children);
}

function restoreOriginalProductOrder() {
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList || !originalProductOrder || !originalProductOrder.length) return;
  const alive = originalProductOrder.filter(el => el && el.parentNode === productList);
  if (!alive.length) {
    originalProductOrder = null;
    return;
  }
  alive.forEach(item => productList.appendChild(item));
}

function clearOriginalProductOrder() {
  originalProductOrder = null;
}

function saveActiveSort(kind) {
  try {
    if (!window.chrome || !chrome.storage || !chrome.storage.local || !chrome.runtime || !chrome.runtime.id) return;
    chrome.storage.local.set({
      altActiveSort: kind || null,
      altSortQuery: kind ? (A.keyword.getSearchQueryKey() || '') : null
    });
  } catch (e) {}
}

function getActiveSort(callback) {
  try {
    if (!window.chrome || !chrome.storage || !chrome.storage.local || !chrome.runtime || !chrome.runtime.id) {
      callback(null);
      return;
    }
    chrome.storage.local.get(['altActiveSort', 'altSortQuery'], r => {
      if (!r.altActiveSort) { callback(null); return; }
      if ((r.altSortQuery || '') !== (A.keyword.getSearchQueryKey() || '')) { callback(null); return; }
      callback(r.altActiveSort);
    });
  } catch (e) {
    callback(null);
  }
}

function getCurrentPageInfo() {
  let page = 1;
  let size = 36;
  try {
    const url = new URL(window.location.href);
    const pageParam = url.searchParams.get('page');
    if (pageParam) page = parseInt(pageParam, 10);
  } catch {}
  const selected = document.querySelector('.ListSizeOption_selected__Ym5KI input[type="radio"]');
  if (selected && selected.value) size = parseInt(selected.value, 10);
  return { page, size };
}

const SORT_CONFIGS = {
  unit: {
    kind: 'unit',
    enabledKey: 'unitPriceSortEnabled',
    orderKey: 'unitPriceSortOrder',
    defaultOrder: 'asc',
    selector: SELECTORS.unitPriceSortButton,
    className: 'unit-price-sort-btn',
    inputId: 'sorter-UNIT_PRICE',
    inputValue: 'unitPriceSort',
    label: '단위가격순',
    display: 'flex',
    arrowText: {
      asc: { title: '단위가격 낮은순(오름차순)', aria: '단위가격 낮은순' },
      desc: { title: '단위가격 높은순(내림차순)', aria: '단위가격 높은순' }
    },
    read(item) {
      const calc = calculateUnitPrice(item);
      const value = calc && calc.coupangUnit
        ? (typeof calc.value === 'number' ? calc.value : parseFloat(calc.coupangUnit.replace(/[^\d.]+/g, '')))
        : null;
      return { item, calc, value };
    },
    isSortable(row) { return !!(row.calc && row.calc.coupangUnit); },
    compare(a, b, order) { return A.pure.compareNullableNumbers(a.value, b.value, order); },
    decorate(sorted, missing) {
      let rank = 0;
      sorted.forEach(row => {
        updateUnitPriceBadge(row.item, row.calc);
        if (!isSortVisibleItem(row.item)) return clearRankMark(row.item);
        rank += 1;
        updateRankMark(row.item, rank);
      });
      missing.forEach(row => {
        updateUnitPriceBadge(row.item, null);
        if (!isSortVisibleItem(row.item)) return clearRankMark(row.item);
        updateRankMark(row.item, '-');
      });
    },
    badgeSelector: '.unit-price-badge',
    clearRanks: true
  },
  discount: {
    kind: 'discount',
    enabledKey: 'discountRateSortEnabled',
    selector: SELECTORS.discountRateSortButton,
    className: 'discount-rate-sort-btn',
    inputId: 'sorter-DISCOUNT_RATE',
    inputValue: 'discountRateSort',
    label: '할인율순',
    display: '',
    read(item) {
      const value = calculateDiscountRate(item);
      return { item, value };
    },
    isSortable() { return true; },
    compare(a, b) { return A.pure.compareDiscountRates(a.value, b.value); },
    decorate(sorted) {
      let rank = 0;
      sorted.forEach(row => {
        updateDiscountRateBadge(row.item, row.value);
        if (row.value > 0 && isSortVisibleItem(row.item)) {
          rank += 1;
          updateRankMark(row.item, rank, true);
        } else {
          clearRankMark(row.item);
        }
      });
    },
    badgeSelector: '.discount-rate-badge',
    clearRanks: true
  },
  price: {
    kind: 'price',
    enabledKey: 'priceSortEnabled',
    orderKey: 'priceSortOrder',
    defaultOrder: 'asc',
    selector: SELECTORS.priceSortButton,
    className: 'price-sort-btn priceSortButton',
    inputId: 'sorter-PRICE',
    inputValue: 'priceSort',
    label: '가격순',
    display: 'flex',
    arrowText: {
      asc: { title: '가격 낮은순(오름차순)', aria: '가격 낮은순' },
      desc: { title: '가격 높은순(내림차순)', aria: '가격 높은순' }
    },
    read(item) { return { item, value: getPriceValue(item) }; },
    isSortable(row) { return row.value != null; },
    compare(a, b, order) { return A.pure.compareNullableNumbers(a.value, b.value, order); },
    decorate(sorted, missing) {
      let rank = 0;
      sorted.forEach(row => {
        if (!isSortVisibleItem(row.item)) return clearRankMark(row.item);
        rank += 1;
        updateRankMark(row.item, rank, true);
      });
      missing.forEach(row => clearRankMark(row.item));
    },
    badgeSelector: null,
    clearRanks: false
  }
};

function runSort(kind) {
  const config = SORT_CONFIGS[kind];
  sortActive[kind] = true;
  saveActiveSort(kind);
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const items = getSortableProductItems(productList);
  if (items.length === 0) return;
  captureOriginalProductOrder(productList);

  const execute = result => {
    const order = config.orderKey ? (result[config.orderKey] || config.defaultOrder) : null;
    const rows = items.map(config.read);
    const { sorted, missing } = A.pure.partitionAndSort(
      rows,
      config.isSortable,
      (a, b) => config.compare(a, b, order)
    );
    config.decorate(sorted, missing);
    applySortedProductOrder(productList, [...sorted, ...missing].map(row => row.item));
    updateSortButtonUI(kind);
    A.keyword.applyFilter();
  };

  if (config.orderKey) chrome.storage.sync.get([config.orderKey], execute);
  else execute({});
}

function sortByUnitPrice() { runSort('unit'); }
function sortByDiscountRate() { runSort('discount'); }
function sortByPrice() { runSort('price'); }


function updateSortButtonUI(kind) {
  const config = SORT_CONFIGS[kind];
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  const button = sortUl.querySelector(config.selector);
  if (!button) return;
  button.classList.toggle('Sort_selected__SBbDW', sortActive[kind]);
  const radio = button.querySelector('input[type="radio"]');
  if (radio) radio.checked = sortActive[kind];
}

function updateUnitPriceSortButtonUI() { updateSortButtonUI('unit'); }
function updateDiscountRateSortButtonUI() { updateSortButtonUI('discount'); }
function updatePriceSortButtonUI() { updateSortButtonUI('price'); }


function updateSpecialSortSeparator() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  let separator = sortUl.querySelector('.special-sort-separator');
  const hasSpecial = !!sortUl.querySelector('.unit-price-sort-btn') || !!sortUl.querySelector('.discount-rate-sort-btn') || !!sortUl.querySelector(SELECTORS.priceSortButton);
  const allLis = Array.from(sortUl.children);
  const firstSpecialIdx = allLis.findIndex(li => li.classList.contains('unit-price-sort-btn') || li.classList.contains('discount-rate-sort-btn') || li.classList.contains('price-sort-btn'));
  if (hasSpecial) {
    if (!separator) {
      separator = document.createElement('li');
      separator.className = 'special-sort-separator';
      separator.textContent = '+';
      separator.style.color = '#ccc';
      separator.style.fontSize = '12px';
      separator.style.padding = '';
      separator.style.cursor = 'default';
      if (firstSpecialIdx > 0) {
        sortUl.insertBefore(separator, sortUl.children[firstSpecialIdx]);
      } else {
        sortUl.appendChild(separator);
      }
    }
  } else {
    if (separator) separator.remove();
  }
}

function arrowSvg(order) {
  return order === 'asc'
    ? `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;transform:rotate(180deg);" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`;
}

function clearSort(kind) {
  const config = SORT_CONFIGS[kind];
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  if (config.clearRanks || config.badgeSelector) {
    productList.querySelectorAll(SELECTORS.productItem).forEach(item => {
      if (config.clearRanks) clearRankMark(item);
      if (config.badgeSelector) item.querySelectorAll(config.badgeSelector).forEach(el => el.remove());
    });
  }
  A.keyword.applyFilter();
}

function deactivateCustomSort(kind) {
  clearSort(kind);
  sortActive[kind] = false;
  saveActiveSort(null);
  restoreOriginalProductOrder();
  clearOriginalProductOrder();
  updateSortButtonUI(kind);
  updateSpecialSortSeparator();
  A.keyword.applyFilter();
}

function deactivateOtherSorts(kind, sortUl) {
  Object.values(SORT_CONFIGS).forEach(other => {
    if (other.kind === kind) return;
    const button = sortUl.querySelector(other.selector);
    if (button) {
      button.classList.remove('Sort_selected__SBbDW');
      const radio = button.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
    }
    sortActive[other.kind] = false;
    clearSort(other.kind);
  });
}

function createArrowButton(config, initialOrder) {
  const button = document.createElement('button');
  button.type = 'button';
  button.style.marginLeft = '4px';
  button.style.background = 'none';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.width = '18px';
  button.style.height = '18px';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.padding = '0 2px';
  button.style.verticalAlign = 'middle';
  button.style.transition = 'background 0.15s';
  button.onmouseenter = () => { button.style.background = '#f2f4f7'; };
  button.onmouseleave = () => { button.style.background = 'none'; };
  let currentOrder = initialOrder;
  const render = () => {
    const copy = config.arrowText[currentOrder];
    button.innerHTML = arrowSvg(currentOrder);
    button.title = copy.title;
    button.setAttribute('aria-label', copy.aria);
  };
  render();
  button.onclick = event => {
    event.stopPropagation();
    currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    chrome.storage.sync.set({ [config.orderKey]: currentOrder }, () => {
      render();
      if (sortActive[config.kind]) runSort(config.kind);
    });
  };
  return button;
}

function addSortButton(kind) {
  const config = SORT_CONFIGS[kind];
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  const keys = config.orderKey ? [config.enabledKey, config.orderKey] : [config.enabledKey];
  try {
    chrome.storage.sync.get(keys, result => {
      if (!result[config.enabledKey]) return;
      const productList = document.querySelector(SELECTORS.productList);
      if (!productList || productList.querySelectorAll(SELECTORS.productItem).length === 0) return;
      const sortUl = document.querySelector(SELECTORS.sortList);
      if (!sortUl || sortUl.querySelector(config.selector)) return;

      const li = document.createElement('li');
      li.className = config.className;
      li.style.cursor = '';
      li.style.display = config.display;
      li.style.alignItems = config.display === 'flex' ? 'center' : '';
      const input = document.createElement('input');
      input.type = 'radio';
      input.readOnly = true;
      input.name = 'customSortGroup';
      input.id = config.inputId;
      input.value = config.inputValue;
      input.style.display = 'none';
      const label = document.createElement('label');
      label.setAttribute('for', config.inputId);
      label.textContent = config.label;
      label.style.fontWeight = '';
      label.style.fontSize = '';
      label.style.padding = '';
      label.style.color = '';
      label.style.cursor = '';
      li.append(input, label);
      if (config.orderKey) {
        li.appendChild(createArrowButton(config, result[config.orderKey] || config.defaultOrder));
      }
      li.onclick = event => {
        event.preventDefault();
        deactivateOtherSorts(kind, sortUl);
        if (sortActive[kind]) {
          deactivateCustomSort(kind);
        } else {
          runSort(kind);
          updateSortButtonUI(kind);
          updateSpecialSortSeparator();
        }
      };
      sortUl.appendChild(li);
      updateSpecialSortSeparator();
      addSortOptionListeners();
    });
  } catch (e) {}
}

function addUnitPriceSortButton() { addSortButton('unit'); }
function addDiscountRateSortButton() { addSortButton('discount'); }
function addPriceSortButton() { addSortButton('price'); }


function addSortOptionListeners() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  sortUl.querySelectorAll('li').forEach(li => {
    if (li.classList.contains('unit-price-sort-btn') || li.classList.contains('discount-rate-sort-btn') || li.classList.contains('price-sort-btn')) return;
    li.addEventListener('click', () => {
      const kind = sortActive.unit ? 'unit'
        : sortActive.discount ? 'discount'
        : sortActive.price ? 'price'
        : null;
      if (!kind) return;
      whenProductListReady(() => runSort(kind));
    });
  });
}

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

function whenProductListReady(fn) {
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

function runSortWithOrder(kind, order) {
  const config = SORT_CONFIGS[kind];
  if (!config) return;
  sortActive[kind] = true;
  saveActiveSort(kind);
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const items = getSortableProductItems(productList);
  if (items.length === 0) return;
  captureOriginalProductOrder(productList);

  const resolvedOrder = config.orderKey ? (order || config.defaultOrder) : null;
  const rows = items.map(config.read);
  const { sorted, missing } = A.pure.partitionAndSort(
    rows,
    config.isSortable,
    (a, b) => config.compare(a, b, resolvedOrder)
  );
  config.decorate(sorted, missing);
  applySortedProductOrder(productList, [...sorted, ...missing].map(row => row.item));
  updateSortButtonUI(kind);
  A.keyword.applyFilter();
}

function applyPageFeatures(opts, storage) {
  const options = opts || {};
  const sync = storage || {};

  if (options.resetActive) {
    sortActive.unit = false;
    sortActive.discount = false;
    sortActive.price = false;
  }

  addUnitPriceSortButton();
  addDiscountRateSortButton();
  addPriceSortButton();
  A.keyword.addFeature();
  updateSpecialSortSeparator();
  updateUnitPriceSortButtonUI();
  updateDiscountRateSortButtonUI();
  updatePriceSortButtonUI();

  A.remover.applyHiddenElements({ reapplySort: true });
  A.quickCart.applyButtons();

  let activeKind = null;
  if (options.restore) {
    const q = A.keyword.getSearchQueryKey() || '';
    if (sync.altActiveSort && (sync.altSortQuery || '') === q) {
      activeKind = sync.altActiveSort;
    }
  } else if (sortActive.unit) activeKind = 'unit';
  else if (sortActive.discount) activeKind = 'discount';
  else if (sortActive.price) activeKind = 'price';

  if (activeKind && SORT_CONFIGS[activeKind]) {
    const config = SORT_CONFIGS[activeKind];
    const order = config.orderKey ? (sync[config.orderKey] || config.defaultOrder) : null;
    runSortWithOrder(activeKind, order);
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
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (sortUl) {
    if (!sortUl.querySelector('.unit-price-sort-btn')) addUnitPriceSortButton();
    if (!sortUl.querySelector('.discount-rate-sort-btn')) addDiscountRateSortButton();
    if (!sortUl.querySelector('.price-sort-btn')) addPriceSortButton();
    updateSpecialSortSeparator();
  }
  try { A.keyword.ensurePresent(); } catch (e) {}
  try { A.quickCart.applyButtons(); } catch (e) {}
}

function remountCustoms(opts) {
  if (applyBusy) {
    pageOpts = mergePageApplyOpts(pageOpts, opts);
    return;
  }
  applyBusy = true;
  clearOriginalProductOrder();
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
    if (sortActive.unit || sortActive.discount || sortActive.price) {
      if (sortActive.unit) runSort('unit');
      else if (sortActive.discount) runSort('discount');
      else if (sortActive.price) runSort('price');
    }
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
      clearOriginalProductOrder();
    }
    startReconcileLoop();
    reconcile();
  });
}

function applySubFeatures() {
  schedulePageApply({});
}

function restoreSort(kind) {
  const config = SORT_CONFIGS[kind];
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get([config.enabledKey], result => {
      if (!result[config.enabledKey]) return;
      getActiveSort(active => {
        if (active !== kind) return;
        sortActive[kind] = true;
        const trySort = () => {
          if (isProductListFullyLoaded()) {
            updateSortButtonUI(kind);
            runSort(kind);
          } else {
            setTimeout(trySort, 30);
          }
        };
        trySort();
      });
    });
  } catch (e) {}
}

function resetSort(kind) {
  if (!sortActive[kind]) return;
  sortActive[kind] = false;
  updateSortButtonUI(kind);
  const trySort = () => {
    if (isProductListFullyLoaded()) runSort(kind);
    else setTimeout(trySort, 30);
  };
  trySort();
}

function restoreUnitPriceSort() { restoreSort('unit'); }
function restoreDiscountRateSort() { restoreSort('discount'); }
function restorePriceSort() { restoreSort('price'); }
function resetUnitPriceSort() { resetSort('unit'); }
function resetDiscountRateSort() { resetSort('discount'); }
function resetPriceSort() { resetSort('price'); }
function clearUnitPriceSort() { clearSort('unit'); }
function clearDiscountRateSort() { clearSort('discount'); }
function clearPriceSort() { clearSort('price'); }


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

function handleOptionChange() {
  applySubFeatures();
  if (!sortActive.unit && !sortActive.discount && !sortActive.price) {
    resetUnitPriceSort();
    resetDiscountRateSort();
    resetPriceSort();
  }
  updateSpecialSortSeparator();
}



function handleFeatureToggle(kind, enabled) {
  const config = SORT_CONFIGS[kind];
  if (!config) return;
  if (enabled) {
    addSortButton(kind);
    updateSpecialSortSeparator();
    return;
  }
  const wasActive = sortActive[kind];
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (sortUl) {
    const btn = sortUl.querySelector(config.selector);
    if (btn) btn.remove();
  }
  updateSpecialSortSeparator();
  if (wasActive) {
    saveActiveSort(null);
    restoreOriginalProductOrder();
    clearOriginalProductOrder();
    A.keyword.applyFilter();
  }
}

A.sort = Object.freeze({
  addButtons() {
    addUnitPriceSortButton();
    addDiscountRateSortButton();
    addPriceSortButton();
  },
  observeProductList,
  restoreAll() {
    restoreUnitPriceSort();
    restoreDiscountRateSort();
    restorePriceSort();
  },
  applySubFeatures,
  schedulePageApply,
  updateSeparator: updateSpecialSortSeparator,
  reapplySortIfNeeded() {
    if (sortActive.unit) sortByUnitPrice();
    else if (sortActive.discount) sortByDiscountRate();
    else if (sortActive.price) sortByPrice();
  },
  deactivateAll() {
    sortActive.unit = false;
    sortActive.discount = false;
    sortActive.price = false;
    saveActiveSort(null);
  },
  isActive(kind) {
    return kind === 'unit' ? sortActive.unit
      : kind === 'discount' ? sortActive.discount
      : kind === 'price' ? sortActive.price
      : false;
  },
  handleFeatureToggle,
  handleOptionChange
});
})(globalThis.Altteuri ||= {});
