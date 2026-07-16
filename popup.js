const addonToggle = document.getElementById('addon-toggle');
const toggleUnitPriceSort = document.getElementById('toggle-unit-price-sort');
const toggleDiscountRateSort = document.getElementById('toggle-discount-rate-sort');
const togglePriceSort = document.getElementById('toggle-price-sort');
const toggleRemoveContent = document.getElementById('toggle-remove-content');
const forceListSizeToggle = document.getElementById('force-list-size');
const sizeControl = document.getElementById('size-control');
const sizeSeg = document.getElementById('size-seg');
const sizeChips = sizeSeg ? Array.from(sizeSeg.querySelectorAll('.size-chip')) : [];
const toggleKeywordFilter = document.getElementById('toggle-keyword-filter');
const toggleQuickCart = document.getElementById('toggle-quick-cart');

function syncSizeControl(force, size) {
  if (forceListSizeToggle) forceListSizeToggle.checked = !!force;
  if (sizeControl) sizeControl.classList.toggle('on', !!force);
  const s = String(size || '72');
  sizeChips.forEach(c => c.classList.toggle('active', c.dataset.size === s));
}

function updateToggleState() {
  try {
    chrome.storage.sync.get([
      'lastPreset',
      'addonEnabled',
      'unitPriceSortEnabled',
      'discountRateSortEnabled',
      'priceSortEnabled',
      'elementRemoverEnabled', 
      'forceCoupangListSize',
      'coupangListSize',
      'keywordFilterEnabled',
      'quickCartEnabled'
    ], result => {
      const isEnabled = !!result.addonEnabled;
      const unitPriceSort = !!result.unitPriceSortEnabled;
      const discountRateSort = !!result.discountRateSortEnabled;
      const priceSort = !!result.priceSortEnabled;
      const removeContent = result.elementRemoverEnabled !== false;
      const forceListSize = !!result.forceCoupangListSize;
      const listSize = result.coupangListSize || '72';
      const keywordFilter = result.keywordFilterEnabled !== false; 
      const quickCart = result.quickCartEnabled !== false;
      updateAddonToggleBtn(isEnabled);
      toggleUnitPriceSort.checked = unitPriceSort;
      toggleDiscountRateSort.checked = discountRateSort;
      togglePriceSort.checked = priceSort;
      toggleRemoveContent.checked = removeContent;
      syncRemoveBody();
      syncSizeControl(forceListSize, listSize);
      if(toggleKeywordFilter) toggleKeywordFilter.checked = keywordFilter;
      if(toggleQuickCart) toggleQuickCart.checked = quickCart;
    });
  } catch (e) {
  }
}

function updateAddonToggleBtn(isEnabled) {
  if (addonToggle) {
    addonToggle.textContent = isEnabled ? '애드온 끄기' : '애드온 켜기';
    addonToggle.classList.toggle('off', !isEnabled);
  }
  
  const body = document.getElementById('feature-body');
  if (body) body.style.display = isEnabled ? '' : 'none';
}

function syncRemoveBody() {
  const on = !!(toggleRemoveContent && toggleRemoveContent.checked);
  const body = document.getElementById('remove-body');
  if (body) body.style.display = on ? '' : 'none';
}

function saveLastPreset() {
  try {
    chrome.storage.sync.get([
      'unitPriceSortEnabled',
      'discountRateSortEnabled',
      'priceSortEnabled',
      'elementRemoverEnabled', 
      'forceCoupangListSize',
      'keywordFilterEnabled',
      'quickCartEnabled'
    ], result => {
      const lastPreset = {
        unitPriceSort: !!result.unitPriceSortEnabled,
        discountRateSort: !!result.discountRateSortEnabled,
        priceSort: !!result.priceSortEnabled,
        removeContent: result.elementRemoverEnabled !== false,
        forceListSize: !!result.forceCoupangListSize,
        keywordFilter: result.keywordFilterEnabled !== false,
        quickCart: result.quickCartEnabled !== false
      };
      chrome.storage.sync.set({ lastPreset });
    });
  } catch (e) {
  }
}

function restoreLastPreset() {
  try {
    chrome.storage.sync.get(['lastPreset'], result => {
      const lastPreset = result.lastPreset || {
        unitPriceSort: true,
        discountRateSort: true,
        priceSort: true,
        removeContent: true,
        forceListSize: true,
        keywordFilter: true,
        quickCart: true
      };
      chrome.storage.sync.set({
        unitPriceSortEnabled: lastPreset.unitPriceSort,
        discountRateSortEnabled: lastPreset.discountRateSort,
        priceSortEnabled: lastPreset.priceSort,
        elementRemoverEnabled: lastPreset.removeContent,
        forceCoupangListSize: lastPreset.forceListSize,
        keywordFilterEnabled: lastPreset.keywordFilter,
        quickCartEnabled: lastPreset.quickCart
      }, () => {
        toggleUnitPriceSort.checked = lastPreset.unitPriceSort;
        toggleDiscountRateSort.checked = lastPreset.discountRateSort;
        togglePriceSort.checked = lastPreset.priceSort;
        toggleRemoveContent.checked = lastPreset.removeContent;
        chrome.storage.sync.get(['coupangListSize'], r => syncSizeControl(lastPreset.forceListSize, r.coupangListSize));
        if(toggleKeywordFilter) toggleKeywordFilter.checked = lastPreset.keywordFilter;
        if(toggleQuickCart) toggleQuickCart.checked = lastPreset.quickCart;
      });
    });
  } catch (e) {
  }
}

function checkAndUpdateMainToggle() {
  try {
    chrome.storage.sync.get([
      'unitPriceSortEnabled',
      'discountRateSortEnabled',
      'priceSortEnabled',
      'elementRemoverEnabled', 
      'forceCoupangListSize',
      'keywordFilterEnabled',
      'quickCartEnabled'
    ], result => {
      const unitPriceSort = !!result.unitPriceSortEnabled;
      const discountRateSort = !!result.discountRateSortEnabled;
      const priceSort = !!result.priceSortEnabled;
      const removeContent = result.elementRemoverEnabled !== false;
      const forceListSize = !!result.forceCoupangListSize;
      const keywordFilter = result.keywordFilterEnabled !== false;
      const quickCart = result.quickCartEnabled !== false;
      const shouldEnable = unitPriceSort || discountRateSort || priceSort || removeContent || forceListSize || keywordFilter || quickCart;
      chrome.storage.sync.set({ addonEnabled: shouldEnable }, () => {
        updateAddonToggleBtn(shouldEnable);
      });
    });
  } catch (e) {
  }
}

function handleAddonToggleClick() {
  try {
    chrome.storage.sync.get(['addonEnabled'], result => {
      const isEnabled = !!result.addonEnabled;
      if (isEnabled) {
        saveLastPreset();
        chrome.storage.sync.set({
          addonEnabled: false,
          unitPriceSortEnabled: false,
          discountRateSortEnabled: false,
          priceSortEnabled: false,
          elementRemoverEnabled: false,
          forceCoupangListSize: false,
          keywordFilterEnabled: false,
          quickCartEnabled: false
        }, () => {
          try { chrome.storage.local.set({ craActiveSort: null, craSortQuery: null }); } catch (e) {}
          toggleUnitPriceSort.checked = false;
          toggleDiscountRateSort.checked = false;
          togglePriceSort.checked = false;
          toggleRemoveContent.checked = false;
          syncSizeControl(false);
          if(toggleKeywordFilter) toggleKeywordFilter.checked = false;
          if(toggleQuickCart) toggleQuickCart.checked = false;
          updateAddonToggleBtn(false);
          syncRemoveBody();
          syncRemoveNav();
          chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
            tabs.forEach(tab => chrome.tabs.reload(tab.id));
          });
        });
      } else {
        restoreLastPreset();
        chrome.storage.sync.set({ addonEnabled: true }, () => {
          updateAddonToggleBtn(true);
          syncRemoveBody();
          syncRemoveNav();
          chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
            tabs.forEach(tab => chrome.tabs.reload(tab.id));
          });
        });
      }
    });
  } catch (e) {
  }
}

function handleUnitPriceSortChange() {
  const unitPriceSort = toggleUnitPriceSort.checked;
  try {
    chrome.storage.sync.set({ unitPriceSortEnabled: unitPriceSort }, () => {
      checkAndUpdateMainToggle();
    });
  } catch (e) {
  }
}

function handleDiscountRateSortChange() {
  const discountRateSort = toggleDiscountRateSort.checked;
  try {
    chrome.storage.sync.set({ discountRateSortEnabled: discountRateSort }, () => {
      checkAndUpdateMainToggle();
    });
  } catch (e) {
  }
}

function handlePriceSortChange() {
  const priceSort = togglePriceSort.checked;
  try {
    chrome.storage.sync.set({ priceSortEnabled: priceSort }, () => {
      checkAndUpdateMainToggle();
    });
  } catch (e) {
  }
}

function handleRemoveContentChange() {
  const removeContent = toggleRemoveContent.checked;
  try {
    chrome.storage.sync.set({ elementRemoverEnabled: removeContent }, () => {
      checkAndUpdateMainToggle();
      syncRemoveBody();
      syncRemoveNav();
    });
  } catch (e) {
  }
}

function applyListSize(force, size) {
  const data = force
    ? { forceCoupangListSize: true, coupangListSize: String(size || '72') }
    : { forceCoupangListSize: false };
  try {
    chrome.storage.sync.set(data, () => {
      checkAndUpdateMainToggle();
    });
  } catch (e) {
  }
}

function handleForceListSizeToggle() {
  const on = forceListSizeToggle.checked;
  if (on) {
    const active = sizeChips.find(c => c.classList.contains('active'));
    const size = active ? active.dataset.size : '72';
    syncSizeControl(true, size);
    applyListSize(true, size);
  } else {
    syncSizeControl(false);
    applyListSize(false);
  }
}

function handleSizeChipClick(e) {
  const size = e.currentTarget.dataset.size;
  syncSizeControl(true, size);
  applyListSize(true, size);
}

function handleKeywordFilterChange() {
  const keywordFilter = toggleKeywordFilter.checked;
  try {
    chrome.storage.sync.set({ keywordFilterEnabled: keywordFilter }, () => {
      checkAndUpdateMainToggle();
    });
  } catch (e) {
  }
}

function handleQuickCartChange() {
  const quickCart = toggleQuickCart.checked;
  try {
    chrome.storage.sync.set({ quickCartEnabled: quickCart }, () => {
      checkAndUpdateMainToggle();
    });
  } catch (e) {
  }
}

addonToggle.addEventListener('click', handleAddonToggleClick);
toggleUnitPriceSort.addEventListener('change', handleUnitPriceSortChange);
toggleDiscountRateSort.addEventListener('change', handleDiscountRateSortChange);
togglePriceSort.addEventListener('change', handlePriceSortChange);
toggleRemoveContent.addEventListener('change', handleRemoveContentChange);
if(toggleKeywordFilter) {
  toggleKeywordFilter.addEventListener('change', handleKeywordFilterChange);
}
if(toggleQuickCart) {
  toggleQuickCart.addEventListener('change', handleQuickCartChange);
}
if (forceListSizeToggle) {
  forceListSizeToggle.addEventListener('change', handleForceListSizeToggle);
}
sizeChips.forEach(c => c.addEventListener('click', handleSizeChipClick));

const pageMain = document.getElementById('page-main');
const pageDetail = document.getElementById('page-detail');
const navRemove = document.getElementById('nav-remove');
const navBack = document.getElementById('nav-back');

function showDetail() {
  pageMain.hidden = true;
  pageDetail.hidden = false;
  syncRemoveBody();
  window.scrollTo(0, 0);
}
function showMain() {
  pageDetail.hidden = true;
  pageMain.hidden = false;
  window.scrollTo(0, 0);
}
if (navRemove) {
  navRemove.addEventListener('click', showDetail);
  navRemove.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(); }
  });
}
if (navBack) navBack.addEventListener('click', showMain);

const presetListEl = document.getElementById('preset-list');
const presetSearchEl = document.getElementById('preset-search');
let presetQuery = '';

function presetMatch(name, q) {
  const HS = (typeof window !== 'undefined' && window.HangulSearch) || null;
  if (HS) return HS.match(name, q);
  return (name || '').toLowerCase().includes(q);
}

const CRA_GROUPS = [
  { id: 'srp', name: '검색 결과 페이지' },
  { id: 'pdp', name: '상품 상세 페이지' },
  { id: 'cart', name: '장바구니 페이지' },
  { id: 'order', name: '주문목록 페이지' },
  { id: 'etc', name: '기타' }
];

function syncRemoveNav() {
  const detail = document.getElementById('remove-detail');
  if (!detail) return;
  try {
    chrome.storage.sync.get(['elementRemoverEnabled'], r => {
      detail.textContent = (r.elementRemoverEnabled === false) ? '꺼짐' : '켜짐';
    });
  } catch (e) {
  }
}

function getPresetItems() {
  const p = (typeof window !== 'undefined' && window.CRA_BUILTIN_PRESET) || null;
  return p && Array.isArray(p.items) ? p.items.filter(it => it && it.selector) : [];
}

function setPresetItemHidden(selector, hidden) {
  try {
    chrome.storage.sync.get(['craPresetOff'], result => {
      const off = new Set(result.craPresetOff || []);
      if (hidden) off.delete(selector); else off.add(selector);
      chrome.storage.sync.set({ craPresetOff: Array.from(off) }, syncRemoveNav);
    });
  } catch (e) {
  }
}

if (presetSearchEl) {
  presetSearchEl.addEventListener('input', () => {
    presetQuery = presetSearchEl.value.trim().toLowerCase();
    renderPresetList();
  });
}

function renderPresetList() {
  if (!presetListEl) return;
  const items = getPresetItems();
  try {
    chrome.storage.sync.get(['craPresetOff'], result => {
      const off = new Set(result.craPresetOff || []);
      presetListEl.innerHTML = '';
      const q = presetQuery;
      const filtered = q
        ? items.filter(it => presetMatch(it.name || it.selector || '', q))
        : items;
      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'preset-empty';
        empty.textContent = q ? '검색 결과가 없습니다' : '기본 프리셋이 비어 있습니다';
        presetListEl.appendChild(empty);
        return;
      }
      const byGroup = {};
      filtered.forEach(it => {
        const gid = it.category || 'etc';
        (byGroup[gid] = byGroup[gid] || []).push(it);
      });
      CRA_GROUPS.forEach(g => {
        const list = byGroup[g.id];
        if (!list || !list.length) return;

        
        const head = document.createElement('div');
        head.className = 'preset-head';
        head.textContent = g.name;
        presetListEl.appendChild(head);

        const card = document.createElement('div');
        card.className = 'section';
        list.forEach(it => {
          const hidden = !off.has(it.selector); 
          const row = document.createElement('div');
          row.className = 'preset-row';
          const label = document.createElement('span');
          label.className = 'preset-item-label';
          label.textContent = it.name || it.selector;
          label.title = it.selector;
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'cbox';
          cb.checked = hidden;
          cb.setAttribute('aria-label', it.name || it.selector);
          cb.addEventListener('change', () => setPresetItemHidden(it.selector, cb.checked));
          row.addEventListener('click', e => {
            if (e.target === cb) return; 
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change'));
          });
          row.appendChild(label);
          row.appendChild(cb);
          card.appendChild(row);
        });
        presetListEl.appendChild(card);
      });
    });
  } catch (e) {
  }
}

renderPresetList();
updateToggleState();
syncRemoveNav();