const SELECTORS = {
  sortList: 'ul.Sort_sort__XXQf9',
  unitPriceSortButton: '.unit-price-sort-btn',
  discountRateSortButton: '.discount-rate-sort-btn',
  priceSortButton: '.price-sort-btn',
  productList: 'ul#product-list',
  productItem: 'li.ProductUnit_productUnit__Qd6sv',
  productName: 'div.ProductUnit_productName__gre7e',
  unitPrice: 'span.UnitPrice_unitPrice__R_ZcA',
  discountRate: 'span.PriceInfo_discountRate__EsQ8I',
  price: 'strong.Price_priceValue__A4KOr',
  sortWrapper: '.srp_sortWrapper__qS1ED'
};

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

function isRemoveContentEnabled(callback) {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) {
    callback(false);
    return;
  }
  try {
    chrome.storage.sync.get(['removeUnwantedContent'], result => {
      callback(!!result.removeUnwantedContent);
    });
  } catch (e) {
    callback(false);
  }
}

function removeUnwantedElements() {
  isRemoveContentEnabled(enabled => {
    if (!enabled) return;
    try {
      document.querySelectorAll('.ads-line-banner-container').forEach(el => el.style.display = 'none');
    } catch {}
    try {
      document.querySelectorAll('#srpKeywordTopBanner').forEach(el => el.style.display = 'none');
    } catch {}
    try {
      document.querySelectorAll('[class*="fw-mb-"]').forEach(el => {
        if (el.className.includes('fw-mb-[20px]')) el.style.display = 'none';
      });
    } catch {}
    try {
      document.querySelectorAll('li.best-seller').forEach(el => el.style.display = 'none');
    } catch {}
    try {
      document.querySelectorAll('li.limited-time-offer').forEach(el => el.style.display = 'none');
    } catch {}
    try {
      const el1 = document.getElementById('srp-bottom-carousel-dco-container');
      if (el1) el1.style.display = 'none';
    } catch {}
    try {
      document.querySelectorAll('.srp-bottom-carousel-dco-container, .cmg-dco-template, .cmg-dco-carousel').forEach(el => {
        el.style.display = 'none';
      });
    } catch {}
    try {
      document.querySelectorAll('.jikgu-promo').forEach(el => el.style.display = 'none');
    } catch {}
    try {
      document.querySelectorAll('.also-viewed').forEach(el => el.style.display = 'none');
    } catch {}
    try {
      document.querySelectorAll('.todays-sale, .promotion-decker-carousel, .promotion-title').forEach(el => el.style.display = 'none');
    } catch {}  
    try {
      document.querySelectorAll('footer#wa-footer').forEach(el => el.style.display = 'none');
    } catch {}
    try {
      document.querySelectorAll(`${SELECTORS.productItem}, #product-list > li`).forEach(item => {
        const isAd =
          item.querySelector('button[aria-label="Ad information"]') ||
          Array.from(item.querySelectorAll('span')).some(span => span.textContent.trim() === '광고');
        if (isAd) item.style.display = 'none';
      });
    } catch {}
  });
}

function calculateUnitPrice(item) {
  const unitPriceEl = item.querySelector(SELECTORS.unitPrice);
  if (unitPriceEl) {
    const txt = unitPriceEl.innerText;
    const match = txt.match(/([\d,]+)([a-zA-Z가-힣0-9]+)당\s([\d,]+)원|([\d,]+)원\/([a-zA-Z가-힣0-9]+)/i);
    let display = txt;
    if (match) {
      if (match[1] && match[2] && match[3]) {
        display = `${match[3]}원/${match[1]}${match[2]}`;
      } else if (match[4] && match[5]) {
        display = `${match[4]}원/${match[5]}`;
      }
    }
    return { price: null, baseAmount: null, baseUnit: null, coupangUnit: display };
  }
  return null;
}

function calculateDiscountRate(item) {
  const discountRateEl = item.querySelector(SELECTORS.discountRate);
  if (discountRateEl) {
    const match = discountRateEl.innerText.match(/(\d+)%/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return 0;
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
    const nameEl = item.querySelector(SELECTORS.productName);
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
      const nameEl = item.querySelector(SELECTORS.productName);
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
    const nameEl = item.querySelector(SELECTORS.productName);
    if (nameEl) nameEl.parentNode.insertBefore(mark, nameEl);
    else item.insertBefore(mark, item.firstChild);
  }
}

let isUnitPriceSortActive = false;
let isDiscountRateSortActive = false;
let isPriceSortActive = false;

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
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const items = Array.from(productList.querySelectorAll(SELECTORS.productItem));
  if (items.length === 0) return;
  chrome.storage.sync.get(['unitPriceSortOrder'], result => {
    const sortOrder = result.unitPriceSortOrder || 'asc';
    const compare = (a, b) => {
      if (!a.calc || !a.calc.coupangUnit) return 1;
      if (!b.calc || !b.calc.coupangUnit) return -1;
      const aVal = parseFloat(a.calc.coupangUnit.replace(/[^\d.]+/g, ''));
      const bVal = parseFloat(b.calc.coupangUnit.replace(/[^\d.]+/g, ''));
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
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  const items = Array.from(productList.querySelectorAll(SELECTORS.productItem));
  if (items.length === 0) return;
  chrome.storage.sync.get(['priceSortOrder'], result => {
    const sortOrder = result.priceSortOrder || 'asc';
    const compare = (a, b) => {
      const aPriceEl = a.item.querySelector(SELECTORS.price);
      const bPriceEl = b.item.querySelector(SELECTORS.price);
      if (!aPriceEl) return 1;
      if (!bPriceEl) return -1;
      const aVal = parseFloat(aPriceEl.innerText.replace(/[^\d.]+/g, ''));
      const bVal = parseFloat(bPriceEl.innerText.replace(/[^\d.]+/g, ''));
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    };
    let sortable = items.map(item => {
      const priceEl = item.querySelector(SELECTORS.price);
      return { item, priceEl };
    }).filter(x => x.priceEl);
    sortable.sort(compare);
    sortable.forEach((x, i) => {
      updateRankMark(x.item, i + 1, true);
      productList.appendChild(x.item);
    });
    items.filter(item => {
      const priceEl = item.querySelector(SELECTORS.price);
      return !priceEl;
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
    isRemoveContentEnabled(enabled => {
      if (enabled) removeUnwantedElements();
    });
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
      const unitPriceSortEnabled = !!result.unitPriceSortEnabled;
      if (unitPriceSortEnabled && isUnitPriceSortActive) {
        const trySort = () => {
          if (isProductListFullyLoaded()) {
            sortByUnitPrice();
          } else {
            setTimeout(trySort, 30);
          }
        };
        trySort();
      }
    });
  } catch (e) {}
}

function restoreDiscountRateSort() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['discountRateSortEnabled'], result => {
      const discountRateSortEnabled = !!result.discountRateSortEnabled;
      if (discountRateSortEnabled && isDiscountRateSortActive) {
        const trySort = () => {
          if (isProductListFullyLoaded()) {
            sortByDiscountRate();
          } else {
            setTimeout(trySort, 30);
          }
        };
        trySort();
      }
    });
  } catch (e) {}
}

function restorePriceSort() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['priceSortEnabled'], result => {
      const priceSortEnabled = !!result.priceSortEnabled;
      if (priceSortEnabled && isPriceSortActive) {
        const trySort = () => {
          if (isProductListFullyLoaded()) {
            sortByPrice();
          } else {
            setTimeout(trySort, 30);
          }
        };
        trySort();
      }
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
  
  setInterval(() => {
    const currentUrl = location.href;
    const currentPageSize = getCurrentPageInfo().size;
    
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
}
});

// 키워드 필터링 관련 변수
let excludedKeywords = [];
let keywordFilterContainer = null;

// 키워드 필터링 기능
function loadExcludedKeywords() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['excludedKeywords'], result => {
      excludedKeywords = result.excludedKeywords || [];
      applyKeywordFilter();
    });
  } catch (e) {
    excludedKeywords = [];
  }
}

function saveExcludedKeywords() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.set({ excludedKeywords: excludedKeywords });
  } catch (e) {}
}

function applyKeywordFilter() {
  const productList = document.querySelector(SELECTORS.productList);
  if (!productList) return;
  
  const items = productList.querySelectorAll(SELECTORS.productItem);
  items.forEach(item => {
    const productNameEl = item.querySelector(SELECTORS.productName);
    if (!productNameEl) return;
    
    const productName = productNameEl.textContent.toLowerCase();
    const shouldHide = excludedKeywords.some(keyword => 
      productName.includes(keyword.toLowerCase())
    );
    
    if (shouldHide) {
      item.style.display = 'none';
    } else {
      item.style.display = '';
    }
  });
}

function createKeywordFilterUI() {
  // 기존 UI 완전 제거
  document.querySelectorAll('.keyword-filter-container').forEach(el => el.remove());

  // 삽입 위치 동적 결정 (항상 아래에)
  let insertTarget = document.querySelector('.selected-filters') || document.querySelector('.srp_relatedKeywords__DJiuK');
  if (!insertTarget) return;

  // 컨테이너
  const container = document.createElement('div');
  container.className = 'keyword-filter-container';

  // 입력 영역 (한 줄)
  const inputRow = document.createElement('div');
  inputRow.className = 'fw-flex fw-items-center fw-gap-2 fw-mb-2';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '제외할 키워드 입력';
  input.className = 'fw-flex-1 fw-min-w-20 fw-max-w-45 fw-px-2 fw-py-1 fw-border fw-border-gray-300 fw-rounded fw-text-sm fw-outline-none fw-bg-gray-50';
  const addButton = document.createElement('button');
  addButton.textContent = '추가';
  addButton.className = 'fw-px-4 fw-py-1 fw-bg-gray-100 fw-text-gray-700 fw-border fw-border-gray-300 fw-rounded fw-text-sm fw-cursor-pointer fw-font-normal fw-transition-colors';
  const resetButton = document.createElement('button');
  resetButton.textContent = '초기화';
  resetButton.className = 'fw-px-4 fw-py-1 fw-bg-gray-50 fw-text-gray-500 fw-border fw-border-gray-200 fw-rounded fw-text-sm fw-cursor-pointer fw-font-normal fw-transition-colors';
  
  inputRow.appendChild(input);
  inputRow.appendChild(addButton);
  inputRow.appendChild(resetButton);
  container.appendChild(inputRow);

  // '제외된 키워드:' + 태그들 (쿠팡 selected-filters 구조)
  const filterDiv = document.createElement('div');
  filterDiv.className = 'selected-filters';
  const label = document.createElement('span');
  label.textContent = '제외된 키워드:';
  label.className = 'fw-text-sm fw-text-gray-700 fw-font-normal fw-mr-1';
  filterDiv.appendChild(label);
  container.appendChild(filterDiv);

  // 태그 생성 (쿠팡 fw-inline 구조)
  function updateKeywordList() {
    // 기존 태그 제거
    filterDiv.querySelectorAll('.fw-inline').forEach(e => e.remove());
    excludedKeywords.forEach(keyword => {
      const fw = document.createElement('div');
      fw.className = 'fw-inline';
      const a = document.createElement('a');
      a.href = '#';
      a.title = '삭제 ' + keyword;
      a.className = 'fw-inline-flex fw-items-center fw-h-7 fw-leading-7 fw-px-3 fw-bg-gray-100 fw-text-gray-700 fw-border fw-border-gray-300 fw-rounded-full fw-text-sm fw-font-normal fw-no-underline fw-cursor-pointer fw-transition-colors fw-relative fw-mb-0.5';
      a.onclick = (e) => {
        e.preventDefault();
        excludedKeywords = excludedKeywords.filter(k => k !== keyword);
        saveExcludedKeywords();
        updateKeywordList();
        applyKeywordFilter();
        setTimeout(reapplySortIfNeeded, 0);
      };
      const txt = document.createElement('span');
      txt.textContent = keyword;
      txt.className = 'fw-mr-2';
      const del = document.createElement('span');
      del.textContent = '삭제';
      del.className = 'fw-text-blue-600 fw-text-xs fw-ml-0.5 fw-transition-colors';
      a.appendChild(txt);
      a.appendChild(del);
      fw.appendChild(a);
      filterDiv.appendChild(fw);
    });
  }

  // 정렬 재적용 함수 (전역 변수 직접 사용)
  function reapplySortIfNeeded() {
    if (isUnitPriceSortActive && typeof sortByUnitPrice === 'function') sortByUnitPrice();
    else if (isDiscountRateSortActive && typeof sortByDiscountRate === 'function') sortByDiscountRate();
    else if (isPriceSortActive && typeof sortByPrice === 'function') sortByPrice();
  }

  // 키워드 추가 함수
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
    updateKeywordList();
    applyKeywordFilter();
    setTimeout(reapplySortIfNeeded, 0);
    input.value = '';
  };

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addKeyword();
    }
  });
  addButton.addEventListener('click', addKeyword);

  resetButton.addEventListener('click', () => {
    excludedKeywords = [];
    saveExcludedKeywords();
    updateKeywordList();
    applyKeywordFilter();
    setTimeout(reapplySortIfNeeded, 0);
  });

  // 최초 목록
  updateKeywordList();

  // 삽입 (항상 아래에 고정)
  if (insertTarget.nextSibling) {
    insertTarget.parentNode.insertBefore(container, insertTarget.nextSibling);
  } else {
    insertTarget.parentNode.appendChild(container);
  }
  keywordFilterContainer = container;
}

function addKeywordFilterFeature() {
  isExtensionEnabled(enabled => {
    if (!enabled) return;
    
    if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
    try {
      chrome.storage.sync.get(['keywordFilterEnabled'], result => {
        const keywordFilterEnabled = result.keywordFilterEnabled !== false; // 기본값 true
        if (!keywordFilterEnabled) return;
        
        // 키워드 필터 UI 생성
        createKeywordFilterUI();
        
        // 저장된 키워드 로드
        loadExcludedKeywords();
      });
    } catch (e) {}
  });
}
