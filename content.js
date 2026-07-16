const SELECTORS = {
  sortList: 'ul[class*="Sort_sort"]',
  unitPriceSortButton: '.unit-price-sort-btn',
  discountRateSortButton: '.discount-rate-sort-btn',
  priceSortButton: '.price-sort-btn',
  productList: 'ul#product-list',
  productItem: 'li[class*="ProductUnit_productUnit"]',
  productName: 'div[class*="ProductUnit_productName"]',
  unitPrice: 'span.UnitPrice_unitPrice__R_ZcA',
  discountRate: 'span.PriceInfo_discountRate__EsQ8I',
  price: 'strong.Price_priceValue__A4KOr',
  sortWrapper: '[class*="srp_sortWrapper"]'
};

function getProductItems(list) {
  const productList = list || document.querySelector(SELECTORS.productList);
  if (!productList) return [];
  const items = productList.querySelectorAll(SELECTORS.productItem);
  if (items.length) return Array.from(items);
  return Array.from(productList.querySelectorAll(':scope > li'));
}

function getProductNameEl(item) {
  return (
    item.querySelector(SELECTORS.productName) ||
    item.querySelector('div[class*="productName"]') ||
    item.querySelector('div.name') ||
    item.querySelector('a[href*="/vp/products/"]')
  );
}

function isExtensionEnabled(callback) {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) {
    callback(true);
    return;
  }
  try {
    chrome.storage.sync.get(['addonEnabled'], result => {
      callback(!!result.addonEnabled);
    });
  } catch (e) {
    callback(true);
  }
}

const UNIT_PRICE_RE = /([\d,]+)\s*([a-zA-Z가-힣]+)\s*당\s*([\d,]+)\s*원/;

function findUnitPriceText(item) {
  const legacy = item.querySelector(SELECTORS.unitPrice);
  if (legacy && UNIT_PRICE_RE.test(legacy.textContent || '')) return legacy.textContent.trim();
  const els = item.querySelectorAll('span, div, em');
  for (const el of els) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (UNIT_PRICE_RE.test(t)) return t;
  }
  return null;
}

function calculateUnitPrice(item) {
  const txt = findUnitPriceText(item);
  if (!txt) return null;
  const m = txt.match(UNIT_PRICE_RE);
  if (!m) return null;
  const baseAmount = parseFloat(m[1].replace(/,/g, ''));
  const baseUnit = m[2];
  const amount = parseFloat(m[3].replace(/,/g, ''));
  if (!baseAmount || isNaN(amount)) return null;
  const value = amount / baseAmount;
  const display = `${m[3]}원/${m[1]}${baseUnit}`;
  return { price: null, baseAmount, baseUnit, coupangUnit: display, value };
}

function calculateDiscountRate(item) {
  const legacy = item.querySelector(SELECTORS.discountRate);
  if (legacy) {
    const m = (legacy.innerText || '').match(/(\d+)%/);
    if (m) return parseFloat(m[1]);
  }
  const els = item.querySelectorAll('span, div, em, strong');
  for (const el of els) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    const m = t.match(/^(\d+)\s*%$/);
    if (m) return parseFloat(m[1]);
  }
  return 0;
}

function getPriceEl(item) {
  const legacy = item.querySelector(SELECTORS.price);
  if (legacy && /^[\d,]+원$/.test((legacy.textContent || '').trim())) return legacy;
  const els = item.querySelectorAll('span, strong, em, div, b');
  for (const el of els) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (/^[\d,]+원$/.test(t) && !el.closest('del')) return el;
  }
  return null;
}

function getPriceValue(item) {
  const el = getPriceEl(item);
  if (!el) return null;
  const v = parseFloat((el.textContent || '').replace(/[^\d]/g, ''));
  return isNaN(v) ? null : v;
}

function formatUnitPrice(calc, item) {
  if (!calc) return '';
  if (calc.coupangUnit) return `단위가: ${calc.coupangUnit}`;
  return '';
}

function updateUnitPriceBadge(item, calc) {
  const old = item.querySelector('.unit-price-badge');
  if (old) old.remove();
  let badgeText = '';
  if (calc && calc.coupangUnit) {
    badgeText = formatUnitPrice(calc, item);
  } else {
    badgeText = '단위가 미제공';
  }
  const badge = document.createElement('span');
  badge.className = 'unit-price-badge';
  badge.textContent = badgeText;
  badge.style.display = 'block';
  badge.style.background = '#e6f0ff';
  badge.style.color = '#346aff';
  badge.style.fontSize = '13px';
  badge.style.fontWeight = 'bold';
  badge.style.margin = '4px 0 0 0';
  badge.style.padding = '2px 6px';
  badge.style.borderRadius = '4px';
  badge.style.width = 'fit-content';
  const imgBox = item.querySelector('figure, .ProductUnit_productImage__Mqcg1, .product-image, .main-image');
  if (imgBox && imgBox.parentNode) {
    if (imgBox.nextSibling) {
      imgBox.parentNode.insertBefore(badge, imgBox.nextSibling);
    } else {
      imgBox.parentNode.appendChild(badge);
    }
  } else {
    const nameEl = getProductNameEl(item);
    if (nameEl) nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
    else item.appendChild(badge);
  }
}

function updateDiscountRateBadge(item, discountRate) {
  const old = item.querySelector('.discount-rate-badge');
  if (old) old.remove();
  if (discountRate > 0) {
    const badge = document.createElement('span');
    badge.className = 'discount-rate-badge';
    badge.textContent = `할인율: ${discountRate}%`;
    badge.style.display = 'block';
    badge.style.background = '#e6f0ff';
    badge.style.color = '#346aff';
    badge.style.fontSize = '13px';
    badge.style.fontWeight = 'bold';
    badge.style.margin = '4px 0 0 0';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '4px';
    badge.style.width = 'fit-content';
    const imgBox = item.querySelector('figure, .ProductUnit_productImage__Mqcg1, .product-image, .main-image');
    if (imgBox && imgBox.parentNode) {
      if (imgBox.nextSibling) {
        imgBox.parentNode.insertBefore(badge, imgBox.nextSibling);
      } else {
        imgBox.parentNode.appendChild(badge);
      }
    } else {
      const nameEl = getProductNameEl(item);
      if (nameEl) nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
      else item.appendChild(badge);
    }
  }
}

function updateRankMark(item, rank, forceShow = false) {
  item.querySelectorAll(".my-rank-mark, span[class^='RankMark_rank']").forEach(e => e.remove());
  const imgBox = item.querySelector('figure, .ProductUnit_productImage__Mqcg1, .product-image, .main-image');
  let markText = '';
  if (forceShow) {
    markText = rank;
  } else {
    const calc = calculateUnitPrice(item);
    if (calc && calc.coupangUnit) {
      markText = rank;
    } else if (rank === '-') {
      markText = '!';
    } else {
      return;
    }
  }
  const mark = document.createElement('span');
  mark.className = 'my-rank-mark';
  mark.textContent = markText;
  mark.style.position = 'absolute';
  mark.style.top = '8px';
  mark.style.left = '8px';
  mark.style.zIndex = '10';
  mark.style.background = 'linear-gradient(90deg, #346aff 60%, #5e9cff 100%)';
  mark.style.color = '#fff';
  mark.style.fontWeight = 'bold';
  mark.style.borderRadius = '50%';
  mark.style.minWidth = '32px';
  mark.style.width = '32px';
  mark.style.height = '32px';
  mark.style.lineHeight = '32px';
  mark.style.textAlign = 'center';
  mark.style.padding = '0';
  mark.style.boxShadow = '0 2px 8px rgba(52,106,255,0.12)';
  mark.style.display = 'inline-block';
  if (imgBox && imgBox.style) {
    imgBox.style.position = 'relative';
    imgBox.appendChild(mark);
  } else {
    const nameEl = getProductNameEl(item);
    if (nameEl) nameEl.parentNode.insertBefore(mark, nameEl);
    else item.insertBefore(mark, item.firstChild);
  }
}

let isUnitPriceSortActive = false;
let isDiscountRateSortActive = false;
let isPriceSortActive = false;
let sortSizeChangeBound = false;

function saveActiveSort(kind) {
  try {
    if (!window.chrome || !chrome.storage || !chrome.storage.local || !chrome.runtime || !chrome.runtime.id) return;
    chrome.storage.local.set({
      craActiveSort: kind || null,
      craSortQuery: kind ? (getSearchQueryKey() || '') : null
    });
  } catch (e) {}
}

function getActiveSort(callback) {
  try {
    if (!window.chrome || !chrome.storage || !chrome.storage.local || !chrome.runtime || !chrome.runtime.id) {
      callback(null);
      return;
    }
    chrome.storage.local.get(['craActiveSort', 'craSortQuery'], r => {
      if (!r.craActiveSort) { callback(null); return; }
      if ((r.craSortQuery || '') !== (getSearchQueryKey() || '')) { callback(null); return; }
      callback(r.craActiveSort);
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

function sortByUnitPrice() {
  isUnitPriceSortActive = true;
  saveActiveSort('unit');
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const items = Array.from(productList.querySelectorAll(SELECTORS.productItem));
  if (items.length === 0) return;
  chrome.storage.sync.get(['unitPriceSortOrder'], result => {
    const sortOrder = result.unitPriceSortOrder || 'asc';
    const compare = (a, b) => {
      if (!a.calc || !a.calc.coupangUnit) return 1;
      if (!b.calc || !b.calc.coupangUnit) return -1;
      const aVal = (typeof a.calc.value === 'number') ? a.calc.value : parseFloat(a.calc.coupangUnit.replace(/[^\d.]+/g, ''));
      const bVal = (typeof b.calc.value === 'number') ? b.calc.value : parseFloat(b.calc.coupangUnit.replace(/[^\d.]+/g, ''));
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    };
    let sortable = items.map(item => {
      const calc = calculateUnitPrice(item);
      return { item, calc };
    }).filter(x => x.calc && x.calc.coupangUnit);
    sortable.sort(compare);
    sortable.forEach((x, i) => {
      updateUnitPriceBadge(x.item, x.calc);
      updateRankMark(x.item, i + 1);
      productList.appendChild(x.item);
    });
    items.filter(item => {
      const calc = calculateUnitPrice(item);
      return !calc || !calc.coupangUnit;
    }).forEach(item => {
      updateUnitPriceBadge(item, null);
      updateRankMark(item, '-');
      productList.appendChild(item);
    });
    updateUnitPriceSortButtonUI();
    applyKeywordFilter();
  });
}

function sortByDiscountRate() {
  isDiscountRateSortActive = true;
  saveActiveSort('discount');
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const items = Array.from(productList.querySelectorAll(SELECTORS.productItem));
  if (items.length === 0) return;
  let sortable = items.map(item => {
    const discountRate = calculateDiscountRate(item);
    return { item, discountRate };
  });
  sortable.sort((a, b) => {
    if (a.discountRate === 0 && b.discountRate === 0) return 0;
    if (a.discountRate === 0) return 1;
    if (b.discountRate === 0) return -1;
    return b.discountRate - a.discountRate;
  });
  sortable.forEach((x, i) => {
    updateDiscountRateBadge(x.item, x.discountRate);
    if (x.discountRate > 0) {
      updateRankMark(x.item, i + 1, true);
    }
    try {
      const refNode = productList.children[i];
      if (refNode && refNode.parentNode === productList && refNode !== x.item) {
        productList.insertBefore(x.item, refNode);
      } else if (productList.children[i] !== x.item) {
        productList.appendChild(x.item);
      }
    } catch (e) {
      productList.appendChild(x.item);
    }
  });
  updateDiscountRateSortButtonUI();
  applyKeywordFilter();
}

function sortByPrice() {
  isPriceSortActive = true;
  saveActiveSort('price');
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const items = Array.from(productList.querySelectorAll(SELECTORS.productItem));
  if (items.length === 0) return;
  chrome.storage.sync.get(['priceSortOrder'], result => {
    const sortOrder = result.priceSortOrder || 'asc';
    const compare = (a, b) => {
      if (a.priceVal == null) return 1;
      if (b.priceVal == null) return -1;
      return sortOrder === 'asc' ? a.priceVal - b.priceVal : b.priceVal - a.priceVal;
    };
    let sortable = items.map(item => {
      return { item, priceVal: getPriceValue(item) };
    }).filter(x => x.priceVal != null);
    sortable.sort(compare);
    sortable.forEach((x, i) => {
      updateRankMark(x.item, i + 1, true);
      productList.appendChild(x.item);
    });
    items.filter(item => {
      return getPriceValue(item) == null;
    }).forEach(item => {
      item.querySelectorAll('.my-rank-mark').forEach(e => e.remove());
      productList.appendChild(item);
    });
    updatePriceSortButtonUI();
    applyKeywordFilter();
  });
}

function updateUnitPriceSortButtonUI() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  const myBtn = sortUl.querySelector(SELECTORS.unitPriceSortButton);
  if (myBtn && isUnitPriceSortActive) {
    myBtn.classList.add('Sort_selected__SBbDW');
    const radio = myBtn.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  } else if (myBtn) {
    myBtn.classList.remove('Sort_selected__SBbDW');
    const radio = myBtn.querySelector('input[type="radio"]');
    if (radio) radio.checked = false;
  }
}

function updateDiscountRateSortButtonUI() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  const myBtn = sortUl.querySelector(SELECTORS.discountRateSortButton);
  if (myBtn && isDiscountRateSortActive) {
    myBtn.classList.add('Sort_selected__SBbDW');
    const radio = myBtn.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  } else if (myBtn) {
    myBtn.classList.remove('Sort_selected__SBbDW');
    const radio = myBtn.querySelector('input[type="radio"]');
    if (radio) radio.checked = false;
  }
}

function updatePriceSortButtonUI() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  const myBtn = sortUl.querySelector(SELECTORS.priceSortButton);
  if (myBtn && isPriceSortActive) {
    myBtn.classList.add('Sort_selected__SBbDW');
    const radio = myBtn.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  } else if (myBtn) {
    myBtn.classList.remove('Sort_selected__SBbDW');
    const radio = myBtn.querySelector('input[type="radio"]');
    if (radio) radio.checked = false;
  }
}

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

function addUnitPriceSortButton() {
  isExtensionEnabled(enabled => {
    if (!enabled) return;
    if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
    try {
      chrome.storage.sync.get(['unitPriceSortEnabled', 'unitPriceSortOrder'], result => {
        const unitPriceSortEnabled = !!result.unitPriceSortEnabled;
        const sortOrder = result.unitPriceSortOrder || 'asc';
        if (!unitPriceSortEnabled) return;
        const productList = document.querySelector(SELECTORS.productList);
        if (!productList) return;
        const items = productList.querySelectorAll(SELECTORS.productItem);
        if (items.length === 0) return;
        const sortUl = document.querySelector(SELECTORS.sortList);
        if (!sortUl) return;
        if (sortUl.querySelector(SELECTORS.unitPriceSortButton)) return;
        const li = document.createElement('li');
        li.className = 'unit-price-sort-btn';
        li.style.cursor = '';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        const input = document.createElement('input');
        input.type = 'radio';
        input.readOnly = true;
        input.name = 'customSortGroup';
        input.id = 'sorter-UNIT_PRICE';
        input.value = 'unitPriceSort';
        input.style.display = 'none';
        const label = document.createElement('label');
        label.setAttribute('for', 'sorter-UNIT_PRICE');
        label.textContent = '단위가격순';
        label.style.fontWeight = '';
        label.style.fontSize = '';
        label.style.padding = '';
        label.style.color = '';
        label.style.cursor = '';
        li.appendChild(input);
        li.appendChild(label);
        const arrowBtn = document.createElement('button');
        arrowBtn.type = 'button';
        arrowBtn.style.marginLeft = '4px';
        arrowBtn.style.background = 'none';
        arrowBtn.style.border = 'none';
        arrowBtn.style.cursor = 'pointer';
        arrowBtn.style.width = '18px';
        arrowBtn.style.height = '18px';
        arrowBtn.style.display = 'flex';
        arrowBtn.style.alignItems = 'center';
        arrowBtn.style.justifyContent = 'center';
        arrowBtn.style.padding = '0 2px';
        arrowBtn.style.verticalAlign = 'middle';
        arrowBtn.style.transition = 'background 0.15s';
        arrowBtn.title = sortOrder === 'asc' ? '단위가격 낮은순(오름차순)' : '단위가격 높은순(내림차순)';
        arrowBtn.setAttribute('aria-label', sortOrder === 'asc' ? '단위가격 낮은순' : '단위가격 높은순');
        arrowBtn.onmouseenter = () => { arrowBtn.style.background = '#f2f4f7'; };
        arrowBtn.onmouseleave = () => { arrowBtn.style.background = 'none'; };
        function getArrowSvg(order) {
          return order === 'asc'
            ? `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;transform:rotate(180deg);" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`;
        }
        let currentOrder = sortOrder;
        arrowBtn.innerHTML = getArrowSvg(currentOrder);
        arrowBtn.onclick = e => {
          e.stopPropagation();
          currentOrder = (currentOrder === 'asc') ? 'desc' : 'asc';
          chrome.storage.sync.set({ unitPriceSortOrder: currentOrder }, () => {
            arrowBtn.innerHTML = getArrowSvg(currentOrder);
            arrowBtn.title = currentOrder === 'asc' ? '단위가격 낮은순(오름차순)' : '단위가격 높은순(내림차순)';
            arrowBtn.setAttribute('aria-label', currentOrder === 'asc' ? '단위가격 낮은순' : '단위가격 높은순');
            if (isUnitPriceSortActive) {
              sortByUnitPrice();
            }
          });
        };
        li.appendChild(arrowBtn);
        li.onclick = e => {
          e.preventDefault();
          const discountBtn = sortUl.querySelector(SELECTORS.discountRateSortButton);
          if (discountBtn) {
            discountBtn.classList.remove('Sort_selected__SBbDW');
            const discountRadio = discountBtn.querySelector('input[type="radio"]');
            if (discountRadio) discountRadio.checked = false;
            isDiscountRateSortActive = false;
            clearDiscountRateSort();
          }
          const priceBtn = sortUl.querySelector(SELECTORS.priceSortButton);
          if (priceBtn) {
            priceBtn.classList.remove('Sort_selected__SBbDW');
            const priceRadio = priceBtn.querySelector('input[type="radio"]');
            if (priceRadio) priceRadio.checked = false;
            isPriceSortActive = false;
            clearPriceSort();
          }
          if (isUnitPriceSortActive) {
            clearUnitPriceSort();
            isUnitPriceSortActive = false;
            saveActiveSort(null);
            li.classList.remove('Sort_selected__SBbDW');
            input.checked = false;
            updateSpecialSortSeparator();
            location.reload();
          } else {
            sortByUnitPrice();
            li.classList.add('Sort_selected__SBbDW');
            input.checked = true;
            updateSpecialSortSeparator();
          }
        };
        sortUl.appendChild(li);
        updateSpecialSortSeparator();
        addSortOptionListeners();
      });
    } catch (e) {}
  });
}

function addDiscountRateSortButton() {
  isExtensionEnabled(enabled => {
    if (!enabled) return;
    if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
    try {
      chrome.storage.sync.get(['discountRateSortEnabled'], result => {
        const discountRateSortEnabled = !!result.discountRateSortEnabled;
        if (!discountRateSortEnabled) return;
        const productList = document.querySelector(SELECTORS.productList);
        if (!productList) return;
        const items = productList.querySelectorAll(SELECTORS.productItem);
        if (items.length === 0) return;
        const sortUl = document.querySelector(SELECTORS.sortList);
        if (!sortUl) return;
        if (sortUl.querySelector(SELECTORS.discountRateSortButton)) return;
        const li = document.createElement('li');
        li.className = 'discount-rate-sort-btn';
        li.style.cursor = '';
        li.style.display = '';
        li.style.alignItems = '';
        const input = document.createElement('input');
        input.type = 'radio';
        input.readOnly = true;
        input.name = 'customSortGroup';
        input.id = 'sorter-DISCOUNT_RATE';
        input.value = 'discountRateSort';
        input.style.display = 'none';
        const label = document.createElement('label');
        label.setAttribute('for', 'sorter-DISCOUNT_RATE');
        label.textContent = '할인율순';
        label.style.fontWeight = '';
        label.style.fontSize = '';
        label.style.padding = '';
        label.style.color = '';
        label.style.cursor = '';
        li.appendChild(input);
        li.appendChild(label);
        li.onclick = e => {
          e.preventDefault();
          const unitBtn = sortUl.querySelector(SELECTORS.unitPriceSortButton);
          if (unitBtn) {
            unitBtn.classList.remove('Sort_selected__SBbDW');
            const unitRadio = unitBtn.querySelector('input[type="radio"]');
            if (unitRadio) unitRadio.checked = false;
            isUnitPriceSortActive = false;
            clearUnitPriceSort();
          }
          const priceBtn = sortUl.querySelector(SELECTORS.priceSortButton);
          if (priceBtn) {
            priceBtn.classList.remove('Sort_selected__SBbDW');
            const priceRadio = priceBtn.querySelector('input[type="radio"]');
            if (priceRadio) priceRadio.checked = false;
            isPriceSortActive = false;
            clearPriceSort();
          }
          if (isDiscountRateSortActive) {
            clearDiscountRateSort();
            isDiscountRateSortActive = false;
            saveActiveSort(null);
            li.classList.remove('Sort_selected__SBbDW');
            input.checked = false;
            updateSpecialSortSeparator();
            location.reload();
          } else {
            sortByDiscountRate();
            li.classList.add('Sort_selected__SBbDW');
            input.checked = true;
            updateSpecialSortSeparator();
          }
        };
        sortUl.appendChild(li);
        updateSpecialSortSeparator();
        addSortOptionListeners();
      });
    } catch (e) {}
  });
}

function addPriceSortButton() {
  isExtensionEnabled(enabled => {
    if (!enabled) return;
    if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
    try {
      chrome.storage.sync.get(['priceSortEnabled', 'priceSortOrder'], result => {
        const priceSortEnabled = !!result.priceSortEnabled;
        const sortOrder = result.priceSortOrder || 'asc';
        if (!priceSortEnabled) return;
        const productList = document.querySelector(SELECTORS.productList);
        if (!productList) return;
        const items = productList.querySelectorAll(SELECTORS.productItem);
        if (items.length === 0) return;
        const sortUl = document.querySelector(SELECTORS.sortList);
        if (!sortUl) return;
        if (sortUl.querySelector(SELECTORS.priceSortButton)) return;
        const li = document.createElement('li');
        li.className = 'price-sort-btn priceSortButton';
        li.style.cursor = '';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        const input = document.createElement('input');
        input.type = 'radio';
        input.readOnly = true;
        input.name = 'customSortGroup';
        input.id = 'sorter-PRICE';
        input.value = 'priceSort';
        input.style.display = 'none';
        const label = document.createElement('label');
        label.setAttribute('for', 'sorter-PRICE');
        label.textContent = '가격순';
        label.style.fontWeight = '';
        label.style.fontSize = '';
        label.style.padding = '';
        label.style.color = '';
        label.style.cursor = '';
        li.appendChild(input);
        li.appendChild(label);
        const arrowBtn = document.createElement('button');
        arrowBtn.type = 'button';
        arrowBtn.style.marginLeft = '4px';
        arrowBtn.style.background = 'none';
        arrowBtn.style.border = 'none';
        arrowBtn.style.cursor = 'pointer';
        arrowBtn.style.width = '18px';
        arrowBtn.style.height = '18px';
        arrowBtn.style.display = 'flex';
        arrowBtn.style.alignItems = 'center';
        arrowBtn.style.justifyContent = 'center';
        arrowBtn.style.padding = '0 2px';
        arrowBtn.style.verticalAlign = 'middle';
        arrowBtn.style.transition = 'background 0.15s';
        arrowBtn.title = sortOrder === 'asc' ? '가격 낮은순(오름차순)' : '가격 높은순(내림차순)';
        arrowBtn.setAttribute('aria-label', sortOrder === 'asc' ? '가격 낮은순' : '가격 높은순');
        arrowBtn.onmouseenter = () => { arrowBtn.style.background = '#f2f4f7'; };
        arrowBtn.onmouseleave = () => { arrowBtn.style.background = 'none'; };
        function getArrowSvg(order) {
          return order === 'asc'
            ? `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 14 14" style="display:block;transform:rotate(180deg);" xmlns="http://www.w3.org/2000/svg"><polygon points="7,4 11,9 3,9" fill="#888"/></svg>`;
        }
        let currentOrder = sortOrder;
        arrowBtn.innerHTML = getArrowSvg(currentOrder);
        arrowBtn.onclick = e => {
          e.stopPropagation();
          currentOrder = (currentOrder === 'asc') ? 'desc' : 'asc';
          chrome.storage.sync.set({ priceSortOrder: currentOrder }, () => {
            arrowBtn.innerHTML = getArrowSvg(currentOrder);
            arrowBtn.title = currentOrder === 'asc' ? '가격 낮은순(오름차순)' : '가격 높은순(내림차순)';
            arrowBtn.setAttribute('aria-label', currentOrder === 'asc' ? '가격 낮은순' : '가격 높은순');
            if (isPriceSortActive) {
              sortByPrice();
            }
          });
        };
        li.appendChild(arrowBtn);
        li.onclick = e => {
          e.preventDefault();
          const unitBtn = sortUl.querySelector(SELECTORS.unitPriceSortButton);
          if (unitBtn) {
            unitBtn.classList.remove('Sort_selected__SBbDW');
            const unitRadio = unitBtn.querySelector('input[type="radio"]');
            if (unitRadio) unitRadio.checked = false;
            isUnitPriceSortActive = false;
            clearUnitPriceSort();
          }
          const discountBtn = sortUl.querySelector(SELECTORS.discountRateSortButton);
          if (discountBtn) {
            discountBtn.classList.remove('Sort_selected__SBbDW');
            const discountRadio = discountBtn.querySelector('input[type="radio"]');
            if (discountRadio) discountRadio.checked = false;
            isDiscountRateSortActive = false;
            clearDiscountRateSort();
          }
          if (isPriceSortActive) {
            clearPriceSort();
            isPriceSortActive = false;
            saveActiveSort(null);
            li.classList.remove('Sort_selected__SBbDW');
            input.checked = false;
            updateSpecialSortSeparator();
            location.reload();
          } else {
            sortByPrice();
            li.classList.add('Sort_selected__SBbDW');
            input.checked = true;
            updateSpecialSortSeparator();
          }
        };
        sortUl.appendChild(li);
        updateSpecialSortSeparator();
        addSortOptionListeners();
      });
    } catch (e) {}
  });
}

function addSortOptionListeners() {
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (!sortUl) return;
  sortUl.querySelectorAll('li').forEach(li => {
    if (li.classList.contains('unit-price-sort-btn') || li.classList.contains('discount-rate-sort-btn') || li.classList.contains('price-sort-btn')) return;
    li.addEventListener('click', () => {
      const myBtn = sortUl.querySelector(SELECTORS.unitPriceSortButton);
      const discountBtn = sortUl.querySelector(SELECTORS.discountRateSortButton);
      const priceBtn = sortUl.querySelector(SELECTORS.priceSortButton);
      if (myBtn && isUnitPriceSortActive) {
        setTimeout(() => {
          sortByUnitPrice();
        }, 100);
      }
      if (discountBtn && isDiscountRateSortActive) {
        setTimeout(() => {
          sortByDiscountRate();
        }, 100);
      }
      if (priceBtn && isPriceSortActive) {
        setTimeout(() => {
          sortByPrice();
        }, 100);
      }
    });
  });
}

function applySubFeatures() {
  const calculateDelay = () => {
    const productList = document.querySelector(SELECTORS.productList);
    if (!productList) return 500;
    const items = productList.querySelectorAll(SELECTORS.productItem);
    const currentCount = items.length;
    if (currentCount === 0) return 1000;
    if (currentCount < 10) return 800;
    return 500;
  };
  const delay = calculateDelay();
  setTimeout(() => {
    applyHiddenElements();
    applyQuickCartButtons();
  }, delay);
}

function isProductListFullyLoaded() {
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return false;
  const items = productList.querySelectorAll(SELECTORS.productItem);
  const expected = getCurrentPageInfo().size;
  return items.length >= expected;
}

function restoreUnitPriceSort() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['unitPriceSortEnabled'], result => {
      if (!result.unitPriceSortEnabled) return;
      getActiveSort(active => {
        if (active !== 'unit') return;
        isUnitPriceSortActive = true;
        const trySort = () => {
          if (isProductListFullyLoaded()) {
            updateUnitPriceSortButtonUI();
            sortByUnitPrice();
          } else {
            setTimeout(trySort, 30);
          }
        };
        trySort();
      });
    });
  } catch (e) {}
}

function restoreDiscountRateSort() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['discountRateSortEnabled'], result => {
      if (!result.discountRateSortEnabled) return;
      getActiveSort(active => {
        if (active !== 'discount') return;
        isDiscountRateSortActive = true;
        const trySort = () => {
          if (isProductListFullyLoaded()) {
            updateDiscountRateSortButtonUI();
            sortByDiscountRate();
          } else {
            setTimeout(trySort, 30);
          }
        };
        trySort();
      });
    });
  } catch (e) {}
}

function restorePriceSort() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['priceSortEnabled'], result => {
      if (!result.priceSortEnabled) return;
      getActiveSort(active => {
        if (active !== 'price') return;
        isPriceSortActive = true;
        const trySort = () => {
          if (isProductListFullyLoaded()) {
            updatePriceSortButtonUI();
            sortByPrice();
          } else {
            setTimeout(trySort, 30);
          }
        };
        trySort();
      });
    });
  } catch (e) {}
}

function resetUnitPriceSort() {
  if (isUnitPriceSortActive) {
    isUnitPriceSortActive = false;
    updateUnitPriceSortButtonUI();
    const trySort = () => {
      if (isProductListFullyLoaded()) {
        sortByUnitPrice();
      } else {
        setTimeout(trySort, 30);
      }
    };
    trySort();
  }
}

function resetDiscountRateSort() {
  if (isDiscountRateSortActive) {
    isDiscountRateSortActive = false;
    updateDiscountRateSortButtonUI();
    const trySort = () => {
      if (isProductListFullyLoaded()) {
        sortByDiscountRate();
      } else {
        setTimeout(trySort, 30);
      }
    };
    trySort();
  }
}

function resetPriceSort() {
  if (isPriceSortActive) {
    isPriceSortActive = false;
    updatePriceSortButtonUI();
    const trySort = () => {
      if (isProductListFullyLoaded()) {
        sortByPrice();
      } else {
        setTimeout(trySort, 30);
      }
    };
    trySort();
  }
}

function clearUnitPriceSort() {
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  
  const items = productList.querySelectorAll(SELECTORS.productItem);
  items.forEach(item => {
    item.querySelectorAll(".my-rank-mark, span[class^='RankMark_rank']").forEach(e => e.remove());
    item.querySelectorAll('.unit-price-badge').forEach(e => e.remove());
  });
  applyKeywordFilter();
}

function clearDiscountRateSort() {
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  
  const items = productList.querySelectorAll(SELECTORS.productItem);
  items.forEach(item => {
    item.querySelectorAll(".my-rank-mark, span[class^='RankMark_rank']").forEach(e => e.remove());
    item.querySelectorAll('.discount-rate-badge').forEach(e => e.remove());
  });
  applyKeywordFilter();
}

function clearPriceSort() {
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  applyKeywordFilter();
}

function observePageAndListSize() {
  let lastUrl = location.href;
  let lastPageSize = getCurrentPageInfo().size;
  lastTrackedSearchQuery = getSearchQueryKey();
  
  setInterval(() => {
    const currentUrl = location.href;
    const currentPageSize = getCurrentPageInfo().size;
    
    handleSearchQueryChange();
    ensureKeywordFilterPresent();
    
    if (currentUrl !== lastUrl || currentPageSize !== lastPageSize) {
      lastUrl = currentUrl;
      lastPageSize = currentPageSize;
      
      if (isUnitPriceSortActive) {
        resetUnitPriceSort();
      } else if (isDiscountRateSortActive) {
        resetDiscountRateSort();
      } else if (isPriceSortActive) {
        resetPriceSort();
      } else {
        setTimeout(() => {
          applySubFeatures();
        }, 100);
      }
      // 정렬/필터 변경(URL 변경)으로 상품 목록이 재렌더되면 키워드 필터를 다시 건다.
      reapplyKeywordFilterSoon();
    }
  }, 300);
  
  const listSizeUl = document.querySelector('.ListSizeOption_listSizeOption__j3Y94');
  if (listSizeUl) {
    listSizeUl.addEventListener('change', () => {
      if (isUnitPriceSortActive) {
        resetUnitPriceSort();
      } else if (isDiscountRateSortActive) {
        resetDiscountRateSort();
      } else if (isPriceSortActive) {
        resetPriceSort();
      } else {
        setTimeout(() => {
          applySubFeatures();
        }, 100);
            }
    });
  }
  
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
  let lastList = null;
  let lastLength = 0;
  function tryInit() {
    const list = document.querySelector(SELECTORS.productList);
    if (list && list !== lastList) {
      lastList = list;
      lastLength = list.children.length;
      setTimeout(() => {
        addUnitPriceSortButton();
        addDiscountRateSortButton();
        addPriceSortButton();
        addKeywordFilterFeature();
        observePageAndListSize();
        isUnitPriceSortActive = false;
        isDiscountRateSortActive = false;
        isPriceSortActive = false;
        updateUnitPriceSortButtonUI();
        updateDiscountRateSortButtonUI();
        updatePriceSortButtonUI();
        updateSpecialSortSeparator();
        applySubFeatures();
        restoreUnitPriceSort();
        restoreDiscountRateSort();
        restorePriceSort();
      }, 300);
    }
    if (list && list.children.length !== lastLength) {
      lastLength = list.children.length;
      setTimeout(() => {
        applySubFeatures();
        applyKeywordFilter();
        if (isUnitPriceSortActive) {
          resetUnitPriceSort();
        } else if (isDiscountRateSortActive) {
          resetDiscountRateSort();
        } else if (isPriceSortActive) {
          resetPriceSort();
        }
        updateSpecialSortSeparator();
      }, 100);
    }
  }
  new MutationObserver(tryInit).observe(document.body, { childList: true, subtree: true });
  tryInit();
}

function handleOptionChange() {
  applySubFeatures();
  if (!isUnitPriceSortActive && !isDiscountRateSortActive && !isPriceSortActive) {
    resetUnitPriceSort();
    resetDiscountRateSort();
    resetPriceSort();
  }
  updateSpecialSortSeparator();
}

window.handleOptionChange = handleOptionChange;

function setListSizeFromAddon() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  // 검색 결과 페이지에서만 listSize를 강제한다(장바구니 등 다른 페이지에서 리로드 루프 방지).
  if (!/\/np\/search/.test(location.pathname)) return;
  try {
    chrome.storage.sync.get(['coupangListSize'], result => {
      const listSize = result.coupangListSize || '72';
      const url = new URL(window.location.href);
      if (url.searchParams.get('listSize') !== listSize) {
        url.searchParams.set('listSize', listSize);
        window.location.replace(url.toString());
        return;
      }
      const radio = document.querySelector(`input[type="radio"][name="listSize"][value="${listSize}"]`);
      if (radio && !radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  } catch (e) {}
}

initSortAndSizeSync();
isExtensionEnabled(enabled => {
if (enabled) {
  chrome.storage.sync.get(['forceCoupangListSize'], result => {
    if (result.forceCoupangListSize !== false) {
      setListSizeFromAddon();
    }
  });
  observeProductList();
  addUnitPriceSortButton();
  addDiscountRateSortButton();
  addPriceSortButton();
  addKeywordFilterFeature();
  applySubFeatures();
  restoreUnitPriceSort();
  restoreDiscountRateSort();
  restorePriceSort();
  applyQuickCartButtons();
}
});

// 키워드 필터링 관련 변수
let excludedKeywords = [];
let keywordFilterContainer = null;
let keywordFilterEnabled = true;
let lastTrackedSearchQuery = null;
let kwChangeBound = false;

const KEYWORD_FILTER_STYLE_ID = 'cra-keyword-filter-styles';

function getSearchQueryKey(urlString = window.location.href) {
  try {
    const url = new URL(urlString);
    if (!url.pathname.includes('/np/search')) return null;
    return url.searchParams.get('q') || '';
  } catch {
    return null;
  }
}

function normalizeStoredSearchQuery(stored) {
  if (stored === null || stored === undefined || stored === '') return null;
  if (!String(stored).includes('=')) return String(stored);
  try {
    return new URLSearchParams(String(stored)).get('q') ?? String(stored);
  } catch {
    return String(stored);
  }
}

function renderKeywordFilterTags() {
  // 태그 블록은 입력창과 분리되어 원래 위치(정렬바 아래)에 있으므로 document 기준으로 찾는다.
  const tagsContainer = document.querySelector('[data-cra-keyword-tags]');
  if (!tagsContainer) { updateKeywordResetButton(); return; }
  tagsContainer.querySelectorAll('.fw-inline').forEach(el => el.remove());
  tagsContainer.classList.toggle('cra-tags-empty', excludedKeywords.length === 0);
  const wrap = tagsContainer.closest('[data-cra-keyword-tags-wrap]');
  if (wrap) wrap.style.display = excludedKeywords.length ? '' : 'none';
  excludedKeywords.forEach(keyword => {
    const fw = document.createElement('div');
    fw.className = 'fw-inline';
    const link = document.createElement('a');
    link.href = '#';
    link.title = '삭제 ' + keyword;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      excludedKeywords = excludedKeywords.filter(k => k !== keyword);
      saveExcludedKeywords();
      renderKeywordFilterTags();
      applyProductVisibility();
      setTimeout(reapplySortIfNeeded, 0);
    });
    link.append(document.createTextNode(keyword));
    const del = document.createElement('span');
    del.textContent = '삭제';
    link.appendChild(del);
    fw.appendChild(link);
    tagsContainer.appendChild(fw);
  });
  updateKeywordResetButton();
}

function reapplySortIfNeeded() {
  if (isUnitPriceSortActive && typeof sortByUnitPrice === 'function') sortByUnitPrice();
  else if (isDiscountRateSortActive && typeof sortByDiscountRate === 'function') sortByDiscountRate();
  else if (isPriceSortActive && typeof sortByPrice === 'function') sortByPrice();
}

function resetExcludedKeywordsForSearchChange() {
  excludedKeywords = [];
  saveExcludedKeywords();
  renderKeywordFilterTags();
  applyProductVisibility();
  isUnitPriceSortActive = false;
  isDiscountRateSortActive = false;
  isPriceSortActive = false;
  saveActiveSort(null);
}

function handleSearchQueryChange() {
  const currentQuery = getSearchQueryKey();
  if (currentQuery === null) return;
  if (lastTrackedSearchQuery === null) {
    lastTrackedSearchQuery = currentQuery;
    return;
  }
  if (currentQuery !== lastTrackedSearchQuery) {
    lastTrackedSearchQuery = currentQuery;
    resetExcludedKeywordsForSearchChange();
  }
}

function observeSearchResubmit() {
  if (observeSearchResubmit.initialized) return;
  observeSearchResubmit.initialized = true;

  const onSearchAction = () => {
    lastTrackedSearchQuery = getSearchQueryKey();
    resetExcludedKeywordsForSearchChange();
  };

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.querySelector('[name="q"]') || (form.getAttribute('action') || '').includes('/np/search')) {
      onSearchAction();
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const target = e.target;
    if (target instanceof HTMLInputElement && target.name === 'q') {
      onSearchAction();
    }
  }, true);
}

function ensureKeywordFilterStyles() {
  if (document.getElementById(KEYWORD_FILTER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = KEYWORD_FILTER_STYLE_ID;
  style.textContent = `
    /* 쿠팡 필터 박스(.filter-function-bar) 최상단에 편입 — 원본 필터 스타일 재사용 */
    .cra-keyword-filter {
      font-family: inherit;
    }
    .cra-keyword-filter__row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    .cra-keyword-filter__input {
      flex: 1 1 auto;
      min-width: 0;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
      background: #fff;
      box-sizing: border-box;
    }
    .cra-keyword-filter__input:focus { border-color: #346aff; }
    .cra-keyword-filter__btn {
      flex: 0 0 auto;
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      background: #f5f5f5;
      color: #333;
      white-space: nowrap;
      box-sizing: border-box;
    }
    .cra-keyword-filter__btn:hover { background: #eee; }
    /* 재사용한 쿠팡 기본 태그 행(.selected-filters)의 native 여백을 우리 영역에서 리셋 */
    [data-cra-keyword-tags] {
      margin: 0;
      padding: 0;
    }
    /* 제외 키워드가 없으면 태그 행 자체를 숨겨 빈 여백 제거 */
    [data-cra-keyword-tags].cra-tags-empty {
      display: none;
    }
    /* 태그 블록은 원래 위치(정렬바 아래)에 유지 — 상단 여백 제거(앞 요소와 겹침 방지) */
    .cra-keyword-tags {
      margin: 0 0 12px;
    }
  `;
  document.head.appendChild(style);
}

function findKeywordFilterInsertTarget() {
  const selectors = [
    '[class*="srp_relatedKeywords"]',
    '[class*="srp_filterArea"]',
    '.selected-filters',
    SELECTORS.sortWrapper
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && !el.closest('[data-cra-keyword-filter]')) return el;
  }
  const productList = document.querySelector(SELECTORS.productList);
  return productList ? productList.parentElement : null;
}

function shouldHideByKeyword(item) {
  if (!excludedKeywords.length) return false;
  const productNameEl = getProductNameEl(item);
  if (!productNameEl) return false;
  const productName = productNameEl.textContent.toLowerCase();
  return excludedKeywords.some(keyword => productName.includes(keyword.toLowerCase()));
}

function applyProductVisibility() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['keywordFilterEnabled'], result => {
      keywordFilterEnabled = result.keywordFilterEnabled !== false;
      const productList = document.querySelector(SELECTORS.productList);
      if (!productList) return;
      getProductItems(productList).forEach(item => {
        const hideKeyword = keywordFilterEnabled && shouldHideByKeyword(item);
        item.style.display = hideKeyword ? 'none' : '';
      });
    });
  } catch (e) {}
}

// 쿠팡 자체 정렬/필터로 URL만 바뀌고 상품 목록이 같은 개수로 재렌더될 때,
// 새로 그려진 상품들에 키워드 필터가 안 걸리는 문제를 보완한다(짧게 반복 재적용).
function reapplyKeywordFilterSoon() {
  let tries = 0;
  const run = () => {
    applyProductVisibility();
    if (++tries < 12) setTimeout(run, 200);
  };
  run();
}

// 키워드 필터링 기능
function loadExcludedKeywords() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['excludedKeywords', 'excludedKeywordsForQuery', 'excludedKeywordsSessionKey'], result => {
      const currentQuery = getSearchQueryKey();
      const storedQuery = normalizeStoredSearchQuery(
        result.excludedKeywordsForQuery ?? result.excludedKeywordsSessionKey ?? null
      );
      if (currentQuery !== null && storedQuery !== null && storedQuery !== currentQuery) {
        excludedKeywords = [];
        chrome.storage.sync.set({
          excludedKeywords: [],
          excludedKeywordsForQuery: currentQuery
        });
      } else {
        excludedKeywords = result.excludedKeywords || [];
      }
      lastTrackedSearchQuery = currentQuery;
      renderKeywordFilterTags();
      applyProductVisibility();
    });
  } catch (e) {
    excludedKeywords = [];
  }
}

function saveExcludedKeywords() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.set({
      excludedKeywords: excludedKeywords,
      excludedKeywordsForQuery: getSearchQueryKey() ?? ''
    });
  } catch (e) {}
}

function applyKeywordFilter() {
  applyProductVisibility();
}

function createKeywordFilterUI() {
  document.querySelectorAll('[data-cra-keyword-filter], [data-cra-keyword-tags-wrap], .keyword-filter-container').forEach(el => el.remove());

  // 입력 블록: 1순위로 쿠팡 필터 박스 최상단에 편입. 태그 블록: 원래 위치(정렬바 아래)에 유지.
  const filterBar = document.querySelector('.filter-function-bar');
  const tagTarget = findKeywordFilterInsertTarget();
  if (!filterBar && (!tagTarget || !tagTarget.parentNode)) return false;

  ensureKeywordFilterStyles();

  // ── 입력 블록(헤더 + 입력) ──
  const inputBlock = document.createElement('div');
  inputBlock.className = 'cra-keyword-filter';
  inputBlock.setAttribute('data-cra-keyword-filter', '');

  const header = document.createElement('div');
  header.className = 'filter-function-bar-header';
  const title = document.createElement('h4');
  title.textContent = '제외 키워드';
  const resetWrap = document.createElement('div');
  resetWrap.className = 'fw-inline';
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'filter-reset-btn cra-reset-btn';
  resetButton.textContent = '전체해제';
  resetWrap.appendChild(resetButton);
  header.appendChild(title);
  header.appendChild(resetWrap);
  inputBlock.appendChild(header);

  const body = document.createElement('div');
  body.className = 'fw-px-[10px] fw-pb-[8px] fw-pt-[10px]';
  const inputRow = document.createElement('div');
  inputRow.className = 'cra-keyword-filter__row';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '제외할 키워드 입력';
  input.className = 'cra-keyword-filter__input';
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.textContent = '추가';
  addButton.className = 'cra-keyword-filter__btn';
  inputRow.appendChild(input);
  inputRow.appendChild(addButton);
  body.appendChild(inputRow);
  inputBlock.appendChild(body);

  // ── 태그 블록(제외된 키워드) — 원래 위치 유지 ──
  const tagsBlock = document.createElement('div');
  tagsBlock.className = 'cra-keyword-tags';
  tagsBlock.setAttribute('data-cra-keyword-tags-wrap', '');
  const tagsRow = document.createElement('div');
  tagsRow.className = 'selected-filters';
  tagsRow.setAttribute('data-cra-keyword-tags', '');
  const label = document.createElement('span');
  label.textContent = '제외된 키워드:';
  tagsRow.appendChild(label);
  tagsBlock.appendChild(tagsRow);

  const addKeyword = () => {
    const keyword = input.value.trim();
    if (!keyword) return;
    if (excludedKeywords.includes(keyword)) {
      input.placeholder = '이미 추가된 키워드입니다';
      input.value = '';
      setTimeout(() => { input.placeholder = '제외할 키워드 입력'; }, 2000);
      return;
    }
    excludedKeywords.push(keyword);
    saveExcludedKeywords();
    renderKeywordFilterTags();
    applyProductVisibility();
    setTimeout(reapplySortIfNeeded, 0);
    input.value = '';
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  });
  addButton.addEventListener('click', addKeyword);
  resetButton.addEventListener('click', () => {
    // 원본 "전체해제"가 있으면 눌러 쿠팡 필터도 함께 초기화
    const native = document.querySelector('.filter-reset-btn:not(.cra-reset-btn)');
    excludedKeywords = [];
    saveExcludedKeywords();
    renderKeywordFilterTags();
    applyProductVisibility();
    setTimeout(reapplySortIfNeeded, 0);
    if (native) native.click();
  });

  // 태그 블록을 원래 위치에 삽입(정렬바 등 뒤). 위치를 못 찾으면 입력 블록 안에 붙여 유실 방지.
  const placeTags = () => {
    if (tagTarget && tagTarget.parentNode) {
      if (tagTarget.nextSibling) tagTarget.parentNode.insertBefore(tagsBlock, tagTarget.nextSibling);
      else tagTarget.parentNode.appendChild(tagsBlock);
      return true;
    }
    return false;
  };

  if (filterBar) {
    // 입력 블록: 사이드바 최상단, 아래 원본 "필터" 섹션과 구분선(hr) 추가
    const hr = document.createElement('hr');
    hr.className = 'fw-shrink-0 fw-border-0 fw-w-full fw-bg-[#DFE3E8] fw-h-[1px]';
    inputBlock.appendChild(hr);
    filterBar.insertBefore(inputBlock, filterBar.firstChild);
    if (!placeTags()) inputBlock.appendChild(tagsBlock);
  } else {
    // 폴백: 입력+태그를 원래 위치에 함께
    if (tagTarget.nextSibling) tagTarget.parentNode.insertBefore(inputBlock, tagTarget.nextSibling);
    else tagTarget.parentNode.appendChild(inputBlock);
    inputBlock.appendChild(tagsBlock);
  }

  keywordFilterContainer = inputBlock;
  renderKeywordFilterTags();
  return true;
}

// "전체해제" 버튼 노출/통합 관리: 원본 전체해제는 숨기고, 우리 상단 버튼으로 통합.
// 노출 조건: 제외 키워드가 있거나(키워드만으로도) 원본 필터가 선택됨(원본 전체해제 존재).
function updateKeywordResetButton() {
  if (!keywordFilterContainer) return;
  const ourBtn = keywordFilterContainer.querySelector('.cra-reset-btn');
  if (!ourBtn) return;
  const native = document.querySelector('.filter-reset-btn:not(.cra-reset-btn)');
  if (native) native.style.display = 'none';
  const show = excludedKeywords.length > 0 || !!native;
  ourBtn.style.display = show ? '' : 'none';
}

// 쿠팡 SPA 재렌더로 필터 박스가 새로 그려지면 키워드 필터가 사라진다. 주기적으로 재삽입/동기화.
function ensureKeywordFilterPresent() {
  if (!keywordFilterEnabled) return;
  const filterBar = document.querySelector('.filter-function-bar');
  const hasInput = document.querySelector('[data-cra-keyword-filter]');
  const hasTags = document.querySelector('[data-cra-keyword-tags-wrap]');
  // 사이드바가 있으면 입력+태그 둘 다, 폴백이면 입력 블록만 있으면 됨
  const ok = hasInput && (!filterBar || hasTags);
  if (!ok) {
    if (createKeywordFilterUI()) loadExcludedKeywords();
    return;
  }
  updateKeywordResetButton();
}

// 키워드 UI(입력 블록 + 태그 블록)를 제거하고, 상단 통합으로 숨겼던 원본 전체해제를 복원.
function removeKeywordFilterUI() {
  document.querySelectorAll('[data-cra-keyword-filter], [data-cra-keyword-tags-wrap], .keyword-filter-container').forEach(el => el.remove());
  const native = document.querySelector('.filter-reset-btn:not(.cra-reset-btn)');
  if (native) native.style.display = '';
  keywordFilterContainer = null;
}

function unhideAllProducts() {
  const productList = document.querySelector(SELECTORS.productList);
  if (productList) getProductItems(productList).forEach(it => { it.style.display = ''; });
}

// 팝업에서 기능/애드온 토글 시 새로고침 없이 즉시 반영. 키워드 필터를 껐다 켜면 제외 키워드 초기화.
function initKeywordFilterSync() {
  if (kwChangeBound) return;
  if (!window.chrome || !chrome.storage || !chrome.storage.onChanged) return;
  kwChangeBound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.keywordFilterEnabled) {
      // 껐다 켰다 하면(양방향) 제외 키워드 초기화 — 직관성
      excludedKeywords = [];
      saveExcludedKeywords();
      addKeywordFilterFeature();
    } else if (changes.addonEnabled) {
      addKeywordFilterFeature();
    }
  });
}

function handleSortFeatureToggle(kind, enabled) {
  const map = {
    unit: { add: addUnitPriceSortButton, sel: SELECTORS.unitPriceSortButton, active: () => isUnitPriceSortActive },
    discount: { add: addDiscountRateSortButton, sel: SELECTORS.discountRateSortButton, active: () => isDiscountRateSortActive },
    price: { add: addPriceSortButton, sel: SELECTORS.priceSortButton, active: () => isPriceSortActive }
  }[kind];
  if (!map) return;
  if (enabled) {
    map.add();
    updateSpecialSortSeparator();
    return;
  }
  const wasActive = map.active();
  const sortUl = document.querySelector(SELECTORS.sortList);
  if (sortUl) {
    const btn = sortUl.querySelector(map.sel);
    if (btn) btn.remove();
  }
  updateSpecialSortSeparator();
  if (wasActive) {
    saveActiveSort(null);
    location.reload();
  }
}

function initSortAndSizeSync() {
  if (sortSizeChangeBound) return;
  if (!window.chrome || !chrome.storage || !chrome.storage.onChanged) return;
  sortSizeChangeBound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.unitPriceSortEnabled) handleSortFeatureToggle('unit', !!changes.unitPriceSortEnabled.newValue);
    if (changes.discountRateSortEnabled) handleSortFeatureToggle('discount', !!changes.discountRateSortEnabled.newValue);
    if (changes.priceSortEnabled) handleSortFeatureToggle('price', !!changes.priceSortEnabled.newValue);
    if (changes.forceCoupangListSize || changes.coupangListSize) {
      chrome.storage.sync.get(['forceCoupangListSize'], r => {
        if (r.forceCoupangListSize !== false) setListSizeFromAddon();
      });
    }
  });
}

function addKeywordFilterFeature(retryCount = 0) {
  initKeywordFilterSync();
  isExtensionEnabled(enabled => {
    if (!enabled) {
      // 애드온 꺼짐: 키워드 UI 제거 + 상품 표시 복원
      removeKeywordFilterUI();
      unhideAllProducts();
      return;
    }

    if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
    try {
      chrome.storage.sync.get(['keywordFilterEnabled'], result => {
        keywordFilterEnabled = result.keywordFilterEnabled !== false;
        if (!keywordFilterEnabled) {
          // 기능 꺼짐: 키워드 UI 제거 + 상품 표시 복원
          removeKeywordFilterUI();
          unhideAllProducts();
          return;
        }

        const created = createKeywordFilterUI();
        if (!created && retryCount < 15) {
          setTimeout(() => addKeywordFilterFeature(retryCount + 1), 400);
          return;
        }
        observeSearchResubmit();
        loadExcludedKeywords();
      });
    } catch (e) {}
  });
}

/* ===== 장바구니 바로 담기 (검색 결과 그리드) ===== */
let quickCartChangeBound = false;
const CRA_QUICK_CART_STYLE_ID = 'cra-quick-cart-styles';

function quickCartSleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureQuickCartStyles() {
  let s = document.getElementById(CRA_QUICK_CART_STYLE_ID);
  if (!s) {
    s = document.createElement('style');
    s.id = CRA_QUICK_CART_STYLE_ID;
    (document.head || document.documentElement).appendChild(s);
  }
  s.textContent = [
    '@keyframes cra-quick-cart-spin { to { transform: rotate(360deg); } }',
    '.cra-quick-cart-btn {',
    '  position: absolute; right: 8px; bottom: 8px; z-index: 12;',
    '  width: 36px; height: 36px; padding: 0; border: none; border-radius: 50%;',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  background: rgba(255,255,255,0.96); color: #346aff;',
    '  box-shadow: 0 2px 8px rgba(0,0,0,0.18); cursor: pointer;',
    '  opacity: 0; pointer-events: none; transition: opacity 0.15s, transform 0.12s, background 0.12s;',
    '}',
    'li[class*="ProductUnit_productUnit"]:hover .cra-quick-cart-btn,',
    '.cra-quick-cart-btn:focus-visible,',
    '.cra-quick-cart-btn[data-state="loading"],',
    '.cra-quick-cart-btn[data-state="done"],',
    '.cra-quick-cart-btn[data-state="error"] { opacity: 1; pointer-events: auto; }',
    '.cra-quick-cart-btn:hover { transform: scale(1.06); background: #fff; }',
    '.cra-quick-cart-btn[data-state="loading"] { cursor: wait; opacity: 0.85; }',
    '.cra-quick-cart-btn[data-state="loading"] svg { animation: cra-quick-cart-spin 0.75s linear infinite; transform-origin: center; }',
    '.cra-quick-cart-btn[data-state="done"] { color: #1a9f5c; }',
    '.cra-quick-cart-btn[data-state="error"] { color: #e53935; }',
    '.cra-quick-cart-btn svg { width: 18px; height: 18px; display: block; }'
  ].join('\n');
}

function craQuickCartIcon(kind) {
  if (kind === 'check') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>';
  }
  if (kind === 'spin') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-opacity="0.3"/><path d="M21 12a9 9 0 0 0-9-9" stroke-linecap="round"/></svg>';
  }
  if (kind === 'error') {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6h15l-1.5 9h-11z"/><path d="M6 6l-1-2H2"/><circle cx="9" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="17" cy="19" r="1.4" fill="currentColor" stroke="none"/></svg>';
}

function parseProductCartIds(item) {
  const a = item.querySelector('a[href*="/vp/products/"]');
  if (!a) return null;
  let url;
  try { url = new URL(a.getAttribute('href') || a.href, location.origin); } catch { return null; }
  const m = url.pathname.match(/\/vp\/products\/(\d+)/);
  if (!m) return null;
  const productId = m[1];
  const itemId = url.searchParams.get('itemId') || item.getAttribute('data-item-id');
  const vendorItemId = url.searchParams.get('vendorItemId') || item.getAttribute('data-vendor-item-id');
  if (!itemId || !vendorItemId) return null;
  return { productId, itemId, vendorItemId };
}

function getProductImageBox(item) {
  return item.querySelector('figure, [class*="productImage"], .product-image, .main-image');
}

function setQuickCartBtnState(btn, state) {
  btn.dataset.state = state;
  if (state === 'loading') btn.innerHTML = craQuickCartIcon('spin');
  else if (state === 'done') btn.innerHTML = craQuickCartIcon('check');
  else if (state === 'error') btn.innerHTML = craQuickCartIcon('error');
  else btn.innerHTML = craQuickCartIcon('cart');
}

let quickCartOpChain = Promise.resolve();

function enqueueQuickCartOp(fn) {
  const run = quickCartOpChain.then(fn, fn);
  quickCartOpChain = run.catch(() => {});
  return run;
}

function buildQuickCartProductUrl(ids) {
  const url = new URL('/vp/products/' + ids.productId, location.origin);
  url.searchParams.set('itemId', ids.itemId);
  url.searchParams.set('vendorItemId', ids.vendorItemId);
  return url.href;
}

function readHeaderCartCount() {
  const el = document.querySelector('#headerCartCount, .cart-count, em.cart-count, .mycart-preview-module em.cart-count');
  if (!el) return null;
  const n = parseInt((el.textContent || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function clipQuickCartText(el, maxLen) {
  return (el?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, maxLen || 3000);
}

function findProdCartButton(doc) {
  if (!doc) return null;
  return doc.querySelector('button.prod-cart-btn')
    || [...doc.querySelectorAll('button')].find((b) => /장바구니\s*담기/.test((b.textContent || '').trim()));
}

function detectQuickCartPreflightBlock(doc) {
  if (!doc) return null;
  const text = clipQuickCartText(doc.body, 4000);
  const hasCartBtn = !!findProdCartButton(doc);
  if (!hasCartBtn && /로그인이\s*필요|로그인\s*후\s*이용|로그인하고/.test(text)) return 'login_required';
  if (!hasCartBtn && /와우\s*회원\s*(?:전용|만)|로켓\s*와우\s*(?:회원|멤버십)\s*(?:전용|만)/.test(text)) return 'wow_required';
  if (!hasCartBtn && /옵션을?\s*선택|선택해\s*주세요/.test(text)) return 'option_required';
  return null;
}

function detectQuickCartUiFailure(doc) {
  if (!doc) return null;
  const text = clipQuickCartText(doc.body, 4000);
  if (/더\s*이상\s*담을\s*수\s*없|구매\s*가능\s*수량을?\s*초과|수량\s*제한을?\s*초과|담을\s*수\s*없습니다/.test(text)) return 'purchase_limit';
  if (/장바구니에\s*담을\s*수\s*없|담기\s*실패/.test(text)) return 'cart_blocked';
  return null;
}

function detectQuickCartUiSuccess(doc) {
  const text = clipQuickCartText(doc?.body, 4000);
  return /장바구니에\s*(?:상품을?\s*)?담았습니다|장바구니\s*담기\s*완료|장바구니로\s*이동하기/.test(text);
}

/** iframe page context에 담기 API 응답 감시 설치 → data-cra-cart=ok|fail */
function installCartResponseWatcher(doc) {
  try {
    doc.documentElement.removeAttribute('data-cra-cart');
    const script = doc.createElement('script');
    script.textContent = `(function(){
      function isCartUrl(u){return /cart|addCart|add-cart|addtocart|basket|buybox/i.test(String(u||''));}
      function lookOk(text, status){
        if(!(status>=200&&status<300)) return false;
        if(!text) return true;
        try{
          var j=JSON.parse(text);
          if(j.success===false||j.error===true||j.rCode==='FAIL') return false;
          if(j.success===true||j.rCode==='RET0000'||j.result==='SUCCESS'||j.ret==='OK'||j.code===0) return true;
        }catch(e){}
        if(/"ret"\\s*:\\s*"OK"|성공|SUCCESS|"rCode"\\s*:\\s*"RET0000"/i.test(text)) return true;
        return true;
      }
      function mark(ok){
        try{document.documentElement.setAttribute('data-cra-cart', ok?'ok':'fail');}catch(e){}
      }
      if(window.fetch){
        var of=window.fetch;
        window.fetch=function(){
          var a=arguments;
          var url=typeof a[0]==='string'?a[0]:(a[0]&&a[0].url);
          return of.apply(this,a).then(function(res){
            if(isCartUrl(url)||isCartUrl(res&&res.url)){
              res.clone().text().then(function(t){mark(lookOk(t,res.status));}).catch(function(){mark(!!res.ok);});
            }
            return res;
          });
        };
      }
      var xo=XMLHttpRequest.prototype.open;
      var xs=XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open=function(m,u){this.__craU=u;return xo.apply(this,arguments);};
      XMLHttpRequest.prototype.send=function(b){
        this.addEventListener('load',function(){ if(isCartUrl(this.__craU)) mark(lookOk(this.responseText,this.status)); });
        this.addEventListener('error',function(){ if(isCartUrl(this.__craU)) mark(false); });
        return xs.apply(this,arguments);
      };
    })();`;
    (doc.documentElement || doc.head || doc.body).appendChild(script);
    script.remove();
  } catch {}
}

function readCartWatchFlag(doc) {
  try { return doc.documentElement.getAttribute('data-cra-cart'); } catch { return null; }
}

function dispatchRealClick(el, win) {
  if (!el) return;
  const view = win || el.ownerDocument?.defaultView || window;
  const opts = { bubbles: true, cancelable: true, view, button: 0, buttons: 1 };
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    try { el.dispatchEvent(new MouseEvent(type, opts)); } catch {}
  }
  try { el.click(); } catch {}
}

function clickProdCartButton(doc, btn) {
  dispatchRealClick(btn, doc.defaultView);
  try {
    const script = doc.createElement('script');
    script.textContent = '(function(){var b=document.querySelector("button.prod-cart-btn")||Array.from(document.querySelectorAll("button")).find(function(x){return /장바구니\\s*담기/.test((x.textContent||"").trim());});if(b)b.click();})();';
    (doc.documentElement || doc.head || doc.body).appendChild(script);
    script.remove();
  } catch {}
}

async function waitForPdpCartButton(iframe, maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    let doc;
    try { doc = iframe.contentDocument; } catch { await quickCartSleep(80); continue; }
    if (!doc) { await quickCartSleep(80); continue; }
    const btn = findProdCartButton(doc);
    if (btn && !btn.disabled) return doc;
    const blocker = detectQuickCartPreflightBlock(doc);
    if (blocker && Date.now() > deadline - maxMs + 2000) throw new Error(blocker);
    await quickCartSleep(80);
  }
  throw new Error('cart_failed');
}

async function waitForFastCartResult(doc, beforeCount, maxMs) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn) => {
      if (done) return;
      done = true;
      try { obs.disconnect(); } catch {}
      clearInterval(poll);
      clearTimeout(hard);
      fn();
    };

    const check = () => {
      const flag = readCartWatchFlag(doc);
      if (flag === 'ok') return finish(resolve);
      if (flag === 'fail') return finish(() => reject(new Error('cart_failed')));

      const after = readHeaderCartCount();
      if (beforeCount != null && after != null && after > beforeCount) return finish(resolve);
      if (detectQuickCartUiSuccess(doc)) return finish(resolve);

      const fail = detectQuickCartUiFailure(doc);
      if (fail) return finish(() => reject(new Error(fail)));
    };

    const obs = new MutationObserver(check);
    try {
      obs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-cra-cart'] });
      obs.observe(doc.body || doc.documentElement, { childList: true, subtree: true, characterData: true });
    } catch {}

    const poll = setInterval(check, 32);
    const hard = setTimeout(() => {
      check();
      if (!done) finish(resolve);
    }, maxMs);

    check();
  });
}

async function iframeAddToCart(ids) {
  const beforeCount = readHeaderCartCount();
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-cra-ui', '');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-10000px;top:0';

  document.body.appendChild(iframe);
  try {
    await new Promise((resolve, reject) => {
      iframe.addEventListener('load', resolve, { once: true });
      iframe.addEventListener('error', reject, { once: true });
      iframe.src = buildQuickCartProductUrl(ids);
    });

    const doc = await waitForPdpCartButton(iframe, 8000);
    const btn = findProdCartButton(doc);
    if (!btn || btn.disabled) throw new Error('cart_failed');

    installCartResponseWatcher(doc);
    clickProdCartButton(doc, btn);
    await waitForFastCartResult(doc, beforeCount, 2500);
  } finally {
    setTimeout(() => iframe.remove(), 60);
  }
}

async function requestAddToCart(ids) {
  return enqueueQuickCartOp(() => iframeAddToCart(ids));
}

function attachQuickCartButton(item) {
  if (!item || item.querySelector('.cra-quick-cart-btn')) return;
  const ids = parseProductCartIds(item);
  if (!ids) return;
  const imgBox = getProductImageBox(item);
  if (!imgBox) return;
  if (getComputedStyle(imgBox).position === 'static') imgBox.style.position = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cra-quick-cart-btn';
  btn.setAttribute('data-cra-ui', '');
  btn.setAttribute('aria-label', '장바구니 담기');
  btn.title = '장바구니 담기';
  setQuickCartBtnState(btn, 'idle');

  const stopNav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  };

  ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'dblclick', 'click'].forEach((type) => {
    btn.addEventListener(type, (e) => {
      stopNav(e);
      if (type !== 'click') return;
      if (btn.dataset.state === 'loading') return;
      setQuickCartBtnState(btn, 'loading');
      requestAddToCart(ids).then(() => {
        setQuickCartBtnState(btn, 'done');
        setTimeout(() => setQuickCartBtnState(btn, 'idle'), 4000);
      }).catch(() => {
        setQuickCartBtnState(btn, 'error');
        setTimeout(() => setQuickCartBtnState(btn, 'idle'), 4000);
      });
    }, true);
  });

  imgBox.appendChild(btn);
}

function removeQuickCartButtons() {
  document.querySelectorAll('.cra-quick-cart-btn, .cra-quick-cart-wrap').forEach(el => el.remove());
}

function applyQuickCartButtons() {
  if (!/\/np\/search/.test(location.pathname)) {
    removeQuickCartButtons();
    return;
  }
  isExtensionEnabled(enabled => {
    if (!enabled) {
      removeQuickCartButtons();
      return;
    }
    if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
    try {
      chrome.storage.sync.get(['quickCartEnabled'], result => {
        if (result.quickCartEnabled === false) {
          removeQuickCartButtons();
          return;
        }
        ensureQuickCartStyles();
        getProductItems().forEach(attachQuickCartButton);
      });
    } catch (e) {}
  });
}

function initQuickCartSync() {
  if (quickCartChangeBound) return;
  if (!window.chrome || !chrome.storage || !chrome.storage.onChanged) return;
  quickCartChangeBound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.quickCartEnabled || changes.addonEnabled) applyQuickCartButtons();
  });
}

initQuickCartSync();

/* ===== 광고 요소 숨기기 (기본 프리셋 기반) ===== */
/* 숨길 요소는 기본 프리셋(preset-data.js)에 고정. 사용자는 설정 팝업에서
   각 항목을 켜고 끄고(craPresetOff), 이 스크립트는 그 결과를 화면에 반영만 한다. */
let craRemoverEnabled = true;
let craObserverStarted = false;
let craChangeBound = false;

const CRA_REMOVER_STYLE_ID = 'cra-element-remover-styles';

function ensureRemoverStyles() {
  if (document.getElementById(CRA_REMOVER_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = CRA_REMOVER_STYLE_ID;
  s.textContent = '.cra-force-hidden { display: none !important; }';
  (document.head || document.documentElement).appendChild(s);
}

function craIsOwnUI(el) {
  return !!(el && el.closest && el.closest('[data-cra-ui], [data-cra-keyword-filter], [data-cra-keyword-tags-wrap]'));
}

/* preset-data.js 의 기본 프리셋 항목 목록 */
function craPresetItems() {
  const p = (typeof window !== 'undefined' && window.CRA_BUILTIN_PRESET) || null;
  return p && Array.isArray(p.items) ? p.items.filter(it => it && it.selector) : [];
}

/* 사용자가 '보이기(끔)'로 돌린 셀렉터만 저장한다(설정 팝업에서 관리). 기본값은 전부 숨김. */
function craGetOff(cb) {
  try { chrome.storage.sync.get(['craPresetOff'], r => cb(new Set(r.craPresetOff || []))); }
  catch { cb(new Set()); }
}

/* 기본 프리셋 항목을 화면에서 숨긴다(사용자가 끈 항목은 제외). */
function applyHiddenElements() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  ensureRemoverStyles();
  chrome.storage.sync.get(['elementRemoverEnabled'], result => {
    craRemoverEnabled = result.elementRemoverEnabled !== false;
    craGetOff(off => {
      document.querySelectorAll('.cra-force-hidden').forEach(el => el.classList.remove('cra-force-hidden'));
      if (!craRemoverEnabled) return;
      craPresetItems().forEach(it => {
        if (off.has(it.selector)) return; // 사용자가 '보이기'로 켠 항목은 숨기지 않음
        try {
          document.querySelectorAll(it.selector).forEach(el => {
            if (!craIsOwnUI(el)) el.classList.add('cra-force-hidden');
          });
        } catch {}
      });
    });
  });
}

function craObserveForReapply() {
  if (craObserverStarted) return;
  craObserverStarted = true;
  let t = null;
  const obs = new MutationObserver(() => {
    if (t) return;
    t = setTimeout(() => { t = null; applyHiddenElements(); }, 400);
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
}

function initElementRemover() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  /* 설정 팝업에서 항목 토글·기능 on/off 시 새로고침 없이 즉시 반영 */
  if (!craChangeBound && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.craPresetOff || changes.elementRemoverEnabled || changes.addonEnabled) {
        applyHiddenElements();
      }
    });
    craChangeBound = true;
  }
  isExtensionEnabled(enabled => {
    if (!enabled) {
      document.querySelectorAll('.cra-force-hidden').forEach(el => el.classList.remove('cra-force-hidden'));
      return;
    }
    applyHiddenElements();
    craObserveForReapply();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initElementRemover);
} else {
  initElementRemover();
}
