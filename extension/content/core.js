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

const SORT_UI_STYLE_ID = 'alt-sort-ui-styles';

function ensureSortUiStyles() {
  if (document.getElementById(SORT_UI_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SORT_UI_STYLE_ID;
  style.textContent = `
    .my-rank-mark.alt-sort-rank {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 10;
      background: #346aff;
      color: #fff;
      font-weight: bold;
      border-radius: 50%;
      min-width: 32px;
      width: 32px;
      height: 32px;
      line-height: 32px;
      text-align: center;
      padding: 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.18);
      display: inline-block;
      box-sizing: border-box;
    }
    .my-rank-mark.alt-sort-rank--missing {
      background: #6b7280;
    }
    html.alt-custom-sort-active #product-list span[class*="RankMark_rank"] {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function setCustomSortSurface(active) {
  document.documentElement.classList.toggle('alt-custom-sort-active', !!active);
}

function getSortableProductItems(productList) {
  const list = productList || document.querySelector(SELECTORS.productList);
  if (!list) return [];
  return Array.from(list.querySelectorAll(':scope > ' + SELECTORS.productItem));
}

function clearRankMark(item) {
  if (!item) return;
  item.querySelectorAll('.my-rank-mark').forEach(el => el.remove());
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

function updateRankMark(item, rank, opts) {
  let forceShow = false;
  let calc = null;
  if (typeof opts === 'boolean') forceShow = opts;
  else if (opts && typeof opts === 'object') {
    forceShow = !!opts.forceShow;
    calc = opts.calc || null;
  }

  clearRankMark(item);
  ensureSortUiStyles();
  const imgBox = getProductImageBox(item);
  let markText = '';
  let missing = false;
  if (forceShow) {
    markText = String(rank);
    if (rank === '-') {
      markText = '!';
      missing = true;
    }
  } else {
    const resolved = calc || calculateUnitPrice(item);
    if (resolved && resolved.coupangUnit) {
      markText = String(rank);
    } else if (rank === '-') {
      markText = '!';
      missing = true;
    } else {
      return;
    }
  }
  const mark = document.createElement('span');
  mark.className = missing ? 'my-rank-mark alt-sort-rank alt-sort-rank--missing' : 'my-rank-mark alt-sort-rank';
  mark.textContent = markText;
  if (imgBox && imgBox.style) {
    if (getComputedStyle(imgBox).position === 'static') imgBox.style.position = 'relative';
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
  getSortableProductItems,
  clearRankMark,
  isSortVisibleItem,
  applySortedProductOrder,
  setCustomSortSurface,
  updateRankMark
});
})(globalThis.Altteuri ||= {});
