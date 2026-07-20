((A) => {
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
  sortWrapper: '[class*="srp_sortWrapper"]',
  listSizeSelectedClass: 'ListSizeOption_selected__Ym5KI',
  listSizeSelectedRadio: '.ListSizeOption_selected__Ym5KI input[type="radio"]',
  productImage: 'figure, [class*="productImage"], .product-image, .main-image'
};

function getProductImageBox(item) {
  if (!item) return null;
  return item.querySelector(SELECTORS.productImage);
}

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
  const value = A.pure.normalizedUnitPrice(amount, baseAmount);
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
  const imgBox = getProductImageBox(item);
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
    const imgBox = getProductImageBox(item);
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

function getSortableProductItems(productList) {
  const list = productList || document.querySelector(SELECTORS.productList);
  if (!list) return [];
  return Array.from(list.querySelectorAll(':scope > ' + SELECTORS.productItem));
}

function clearRankMark(item) {
  if (!item) return;
  item.querySelectorAll(".my-rank-mark, span[class^='RankMark_rank']").forEach(e => e.remove());
}

function isSortVisibleItem(item) {
  if (!item) return false;
  if (item.classList.contains('alt-force-hidden')) return false;
  if (item.style && item.style.display === 'none') return false;
  if (A.remover && typeof A.remover.isItemHidden === 'function' && A.remover.isItemHidden(item)) {
    return false;
  }
  try {
    if (getComputedStyle(item).display === 'none') return false;
  } catch (e) {}
  if (A.keyword && A.keyword.isEnabled() && A.keyword.shouldHideByKeyword(item)) {
    return false;
  }
  return true;
}

function applySortedProductOrder(productList, orderedItems) {
  if (!productList || !orderedItems.length) return;
  const orderedSet = new Set(orderedItems);
  const others = Array.from(productList.children).filter(el => !orderedSet.has(el));
  orderedItems.forEach(item => productList.appendChild(item));
  others.forEach(el => productList.appendChild(el));
}

function updateRankMark(item, rank, forceShow = false) {
  clearRankMark(item);
  const imgBox = getProductImageBox(item);
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
  mark.style.background = '#346aff';
  mark.style.color = '#fff';
  mark.style.fontWeight = 'bold';
  mark.style.borderRadius = '50%';
  mark.style.minWidth = '32px';
  mark.style.width = '32px';
  mark.style.height = '32px';
  mark.style.lineHeight = '32px';
  mark.style.textAlign = 'center';
  mark.style.padding = '0';
  mark.style.boxShadow = '0 1px 2px rgba(0,0,0,0.18)';
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

A.core = Object.freeze({
  SELECTORS,
  getProductItems,
  getProductNameEl,
  getProductImageBox,
  calculateUnitPrice,
  calculateDiscountRate,
  getPriceValue,
  updateUnitPriceBadge,
  updateDiscountRateBadge,
  getSortableProductItems,
  clearRankMark,
  isSortVisibleItem,
  applySortedProductOrder,
  updateRankMark
});
})(globalThis.Altteuri ||= {});
