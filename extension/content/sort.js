((A) => {
const {
  SELECTORS, calculateUnitPrice, calculateDiscountRate,
  getPriceValue,
  getSortableProductItems, clearRankMark, isSortVisibleItem,
  applySortedProductOrder, setCustomSortSurface, updateRankMark
} = A.core;

const SORT_KINDS = ['unit', 'discount', 'price'];
const LEGACY_BADGE_SELECTORS = {
  unit: '.unit-price-badge',
  discount: '.discount-rate-badge'
};

let activeKind = null;
let originalProductOrder = null;

function getActiveKind() {
  return activeKind;
}

function syncCustomSortSurface() {
  setCustomSortSurface(!!activeKind);
}

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
      const value = calc && calc.coupangUnit && typeof calc.value === 'number' ? calc.value : null;
      return { item, calc, value };
    },
    isSortable(row) { return !!(row.calc && row.calc.coupangUnit); },
    compare(a, b, order) { return A.pure.compareNullableNumbers(a.value, b.value, order); },
    decorate(sorted, missing) {
      let rank = 0;
      sorted.forEach(row => {
        if (!isSortVisibleItem(row.item)) return clearRankMark(row.item);
        rank += 1;
        updateRankMark(row.item, rank, { calc: row.calc });
      });
      missing.forEach(row => {
        if (!isSortVisibleItem(row.item)) return clearRankMark(row.item);
        updateRankMark(row.item, '-', { calc: row.calc });
      });
    }
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
        if (row.value > 0 && isSortVisibleItem(row.item)) {
          rank += 1;
          updateRankMark(row.item, rank, true);
        } else {
          clearRankMark(row.item);
        }
      });
    }
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
    }
  }
};

function executeSort(kind, order) {
  const config = SORT_CONFIGS[kind];
  if (!config) return;
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
  syncCustomSortSurface();
  A.keyword.applyFilter();
}

function runSort(kind, orderOverride) {
  const config = SORT_CONFIGS[kind];
  if (!config) return;
  activeKind = kind;
  saveActiveSort(kind);

  const execute = result => {
    const order = orderOverride ?? (config.orderKey ? (result[config.orderKey] || config.defaultOrder) : null);
    executeSort(kind, order);
  };

  if (orderOverride != null || !config.orderKey) execute({});
  else chrome.storage.sync.get([config.orderKey], execute);
}

function runSortWithOrder(kind, order) {
  runSort(kind, order);
}

function updateSortButtonUI(kind) {
  const config = SORT_CONFIGS[kind];
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  const button = sortUl.querySelector(config.selector);
  if (!button) return;
  const selected = activeKind === kind;
  button.classList.toggle('Sort_selected__SBbDW', selected);
  const radio = button.querySelector('input[type="radio"]');
  if (radio) radio.checked = selected;
}

function updateSpecialSortSeparator() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  let separator = sortUl.querySelector('.special-sort-separator');
  const hasSpecial = !!sortUl.querySelector('.unit-price-sort-btn')
    || !!sortUl.querySelector('.discount-rate-sort-btn')
    || !!sortUl.querySelector(SELECTORS.priceSortButton);
  const allLis = Array.from(sortUl.children);
  const firstSpecialIdx = allLis.findIndex(li =>
    li.classList.contains('unit-price-sort-btn')
    || li.classList.contains('discount-rate-sort-btn')
    || li.classList.contains('price-sort-btn')
  );
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
  } else if (separator) {
    separator.remove();
  }
}

function arrowSvg(order) {
  return order === 'asc'
    ? `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;transform:rotate(180deg);" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`;
}

function clearLegacyBadges(kind, productList) {
  const selector = LEGACY_BADGE_SELECTORS[kind];
  if (!selector || !productList) return;
  productList.querySelectorAll(SELECTORS.productItem).forEach(item => {
    item.querySelectorAll(selector).forEach(el => el.remove());
  });
}

function clearSort(kind) {
  const config = SORT_CONFIGS[kind];
  if (!config) return;
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const clearingActive = activeKind === kind;
  if (clearingActive) {
    productList.querySelectorAll(SELECTORS.productItem).forEach(item => clearRankMark(item));
  }
  clearLegacyBadges(kind, productList);
  A.keyword.applyFilter();
}

function deactivateCustomSort(kind) {
  clearSort(kind);
  activeKind = null;
  saveActiveSort(null);
  restoreOriginalProductOrder();
  clearOriginalProductOrder();
  updateSortButtonUI(kind);
  updateSpecialSortSeparator();
  syncCustomSortSurface();
  A.keyword.applyFilter();
}

function deactivateOtherSorts(kind, sortUl) {
  SORT_KINDS.forEach(otherKind => {
    if (otherKind === kind) return;
    const other = SORT_CONFIGS[otherKind];
    const button = sortUl.querySelector(other.selector);
    if (button) {
      button.classList.remove('Sort_selected__SBbDW');
      const radio = button.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
    }
    clearSort(otherKind);
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
      if (activeKind === config.kind) runSort(config.kind, currentOrder);
    });
  };
  return button;
}

function isCustomSortLi(li) {
  return li.classList.contains('unit-price-sort-btn')
    || li.classList.contains('discount-rate-sort-btn')
    || li.classList.contains('price-sort-btn');
}

function ensureSortOptionListener(sortUl) {
  if (!sortUl || sortUl.dataset.altSortOptionBound) return;
  sortUl.dataset.altSortOptionBound = '1';
  sortUl.addEventListener('click', event => {
    const li = event.target.closest('li');
    if (!li || isCustomSortLi(li)) return;
    const kind = getActiveKind();
    if (!kind) return;
    whenProductListReady(() => runSort(kind));
  });
}

function whenProductListReady(fn) {
  if (A.page && typeof A.page.whenReady === 'function') {
    A.page.whenReady(fn);
    return;
  }
  try { fn(); } catch (e) {}
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
        if (activeKind === kind) {
          deactivateCustomSort(kind);
        } else {
          runSort(kind);
          updateSortButtonUI(kind);
          updateSpecialSortSeparator();
        }
      };
      sortUl.appendChild(li);
      updateSpecialSortSeparator();
      ensureSortOptionListener(sortUl);
    });
  } catch (e) {}
}

function restoreSort(kind) {
  const config = SORT_CONFIGS[kind];
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get([config.enabledKey], result => {
      if (!result[config.enabledKey]) return;
      getActiveSort(storedKind => {
        if (storedKind !== kind) return;
        const trySort = () => {
          if (A.page.isProductListFullyLoaded()) {
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

function healMissingButtons() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  SORT_KINDS.forEach(kind => {
    const config = SORT_CONFIGS[kind];
    if (!sortUl.querySelector(config.selector)) addSortButton(kind);
  });
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
  const wasActive = activeKind === kind;
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (sortUl) {
    const btn = sortUl.querySelector(config.selector);
    if (btn) btn.remove();
  }
  updateSpecialSortSeparator();
  if (wasActive) {
    clearSort(kind);
    activeKind = null;
    saveActiveSort(null);
    restoreOriginalProductOrder();
    clearOriginalProductOrder();
  } else {
    clearLegacyBadges(kind, document.querySelector(SELECTORS.productList));
  }
  syncCustomSortSurface();
  A.keyword.applyFilter();
}

A.sort = Object.freeze({
  addButtons() {
    SORT_KINDS.forEach(kind => addSortButton(kind));
  },
  restoreAll() {
    SORT_KINDS.forEach(kind => restoreSort(kind));
  },
  updateSeparator: updateSpecialSortSeparator,
  updateAllButtonUIs() {
    SORT_KINDS.forEach(kind => updateSortButtonUI(kind));
  },
  clearActiveFlags() {
    if (activeKind) clearSort(activeKind);
    activeKind = null;
    syncCustomSortSurface();
  },
  getActiveKind,
  runSort,
  runSortWithOrder,
  clearOriginalProductOrder,
  healMissingButtons,
  reapplySortIfNeeded() {
    if (activeKind) runSort(activeKind);
  },
  deactivateAll() {
    if (activeKind) {
      clearSort(activeKind);
      restoreOriginalProductOrder();
      clearOriginalProductOrder();
    }
    activeKind = null;
    saveActiveSort(null);
    syncCustomSortSurface();
  },
  isActive(kind) {
    return activeKind === kind;
  },
  handleFeatureToggle
});
})(globalThis.Altteuri ||= {});
