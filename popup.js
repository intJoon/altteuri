const addonToggleBtn = document.getElementById('addon-toggle-btn');
const toggleUnitPriceSort = document.getElementById('toggle-unit-price-sort');
const toggleDiscountRateSort = document.getElementById('toggle-discount-rate-sort');
const togglePriceSort = document.getElementById('toggle-price-sort');
const toggleRemoveContent = document.getElementById('toggle-remove-content');
const forceListSizeToggle = document.getElementById('toggle-force-list-size');
const listSizeSelect = document.getElementById('list-size-select');
const toggleKeywordFilter = document.getElementById('toggle-keyword-filter');

function updateToggleState() {
  try {
    chrome.storage.sync.get([
      'lastPreset',
      'addonEnabled',
      'unitPriceSortEnabled',
      'discountRateSortEnabled',
      'priceSortEnabled',
      'removeUnwantedContent', 
      'forceCoupangListSize',
      'coupangListSize',
      'keywordFilterEnabled'
    ], result => {
      const isEnabled = !!result.addonEnabled;
      const unitPriceSort = !!result.unitPriceSortEnabled;
      const discountRateSort = !!result.discountRateSortEnabled;
      const priceSort = !!result.priceSortEnabled;
      const removeContent = !!result.removeUnwantedContent;
      const forceListSize = !!result.forceCoupangListSize;
      const listSize = result.coupangListSize || '72';
      const keywordFilter = result.keywordFilterEnabled !== false; // 기본값 true
      updateAddonToggleBtn(isEnabled);
      toggleUnitPriceSort.checked = unitPriceSort;
      toggleDiscountRateSort.checked = discountRateSort;
      togglePriceSort.checked = priceSort;
      toggleRemoveContent.checked = removeContent;
      if(listSizeSelect) listSizeSelect.value = listSize;
      if(forceListSizeToggle) forceListSizeToggle.checked = forceListSize;
      if(listSizeSelect) listSizeSelect.disabled = !forceListSize;
      if(toggleKeywordFilter) toggleKeywordFilter.checked = keywordFilter;
    });
  } catch (e) {
  }
}

function updateAddonToggleBtn(isEnabled) {
  addonToggleBtn.textContent = isEnabled ? '애드온 끄기' : '애드온 켜기';
  if (isEnabled) {
    addonToggleBtn.classList.remove('off');
    addonToggleBtn.classList.add('on');
    document.querySelectorAll('.feature-label').forEach(el => el.classList.remove('disabled-label'));
  } else {
    addonToggleBtn.classList.add('off');
    addonToggleBtn.classList.remove('on');
    document.querySelectorAll('.feature-label').forEach(el => el.classList.add('disabled-label'));
  }
}

function saveLastPreset() {
  try {
    chrome.storage.sync.get([
      'unitPriceSortEnabled',
      'discountRateSortEnabled',
      'priceSortEnabled',
      'removeUnwantedContent', 
      'forceCoupangListSize',
      'keywordFilterEnabled'
    ], result => {
      const lastPreset = {
        unitPriceSort: !!result.unitPriceSortEnabled,
        discountRateSort: !!result.discountRateSortEnabled,
        priceSort: !!result.priceSortEnabled,
        removeContent: !!result.removeUnwantedContent,
        forceListSize: !!result.forceCoupangListSize,
        keywordFilter: result.keywordFilterEnabled !== false
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
        removeContent: false,
        forceListSize: true,
        keywordFilter: true
      };
      chrome.storage.sync.set({
        unitPriceSortEnabled: lastPreset.unitPriceSort,
        discountRateSortEnabled: lastPreset.discountRateSort,
        priceSortEnabled: lastPreset.priceSort,
        removeUnwantedContent: lastPreset.removeContent,
        forceCoupangListSize: lastPreset.forceListSize,
        keywordFilterEnabled: lastPreset.keywordFilter
      }, () => {
        toggleUnitPriceSort.checked = lastPreset.unitPriceSort;
        toggleDiscountRateSort.checked = lastPreset.discountRateSort;
        togglePriceSort.checked = lastPreset.priceSort;
        toggleRemoveContent.checked = lastPreset.removeContent;
        forceListSizeToggle.checked = lastPreset.forceListSize;
        if(listSizeSelect) listSizeSelect.disabled = !lastPreset.forceListSize;
        if(toggleKeywordFilter) toggleKeywordFilter.checked = lastPreset.keywordFilter;
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
      'removeUnwantedContent', 
      'forceCoupangListSize',
      'keywordFilterEnabled'
    ], result => {
      const unitPriceSort = !!result.unitPriceSortEnabled;
      const discountRateSort = !!result.discountRateSortEnabled;
      const priceSort = !!result.priceSortEnabled;
      const removeContent = !!result.removeUnwantedContent;
      const forceListSize = !!result.forceCoupangListSize;
      const keywordFilter = result.keywordFilterEnabled !== false;
      const shouldEnable = unitPriceSort || discountRateSort || priceSort || removeContent || forceListSize || keywordFilter;
      chrome.storage.sync.set({ addonEnabled: shouldEnable }, () => {
        updateAddonToggleBtn(shouldEnable);
      });
    });
  } catch (e) {
  }
}

function handleAddonToggleBtnClick() {
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
          removeUnwantedContent: false,
          forceCoupangListSize: false,
          keywordFilterEnabled: false
        }, () => {
          toggleUnitPriceSort.checked = false;
          toggleDiscountRateSort.checked = false;
          togglePriceSort.checked = false;
          toggleRemoveContent.checked = false;
          forceListSizeToggle.checked = false;
          if(listSizeSelect) listSizeSelect.disabled = true;
          if(toggleKeywordFilter) toggleKeywordFilter.checked = false;
          updateAddonToggleBtn(false);
          chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
            tabs.forEach(tab => chrome.tabs.reload(tab.id));
          });
        });
      } else {
        restoreLastPreset();
        chrome.storage.sync.set({ addonEnabled: true }, () => {
          updateAddonToggleBtn(true);
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
      chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  } catch (e) {
  }
}

function handleDiscountRateSortChange() {
  const discountRateSort = toggleDiscountRateSort.checked;
  try {
    chrome.storage.sync.set({ discountRateSortEnabled: discountRateSort }, () => {
      checkAndUpdateMainToggle();
      chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  } catch (e) {
  }
}

function handlePriceSortChange() {
  const priceSort = togglePriceSort.checked;
  try {
    chrome.storage.sync.set({ priceSortEnabled: priceSort }, () => {
      checkAndUpdateMainToggle();
      chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  } catch (e) {
  }
}

function handleRemoveContentChange() {
  const removeContent = toggleRemoveContent.checked;
  try {
    chrome.storage.sync.set({ removeUnwantedContent: removeContent }, () => {
      checkAndUpdateMainToggle();
      chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  } catch (e) {
  }
}

function handleForceListSizeChange() {
  const forceListSize = forceListSizeToggle.checked;
  try {
    chrome.storage.sync.set({ forceCoupangListSize: forceListSize }, () => {
      if(listSizeSelect) listSizeSelect.disabled = !forceListSize;
      checkAndUpdateMainToggle();
      chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  } catch (e) {
  }
}

function handleKeywordFilterChange() {
  const keywordFilter = toggleKeywordFilter.checked;
  try {
    chrome.storage.sync.set({ keywordFilterEnabled: keywordFilter }, () => {
      checkAndUpdateMainToggle();
      chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  } catch (e) {
  }
}

addonToggleBtn.addEventListener('click', handleAddonToggleBtnClick);
toggleUnitPriceSort.addEventListener('change', handleUnitPriceSortChange);
toggleDiscountRateSort.addEventListener('change', handleDiscountRateSortChange);
togglePriceSort.addEventListener('change', handlePriceSortChange);
toggleRemoveContent.addEventListener('change', handleRemoveContentChange);
forceListSizeToggle.addEventListener('change', handleForceListSizeChange);
if(toggleKeywordFilter) {
  toggleKeywordFilter.addEventListener('change', handleKeywordFilterChange);
}
if(listSizeSelect) {
  listSizeSelect.addEventListener('change', function() {
    const value = listSizeSelect.value;
    chrome.storage.sync.set({ coupangListSize: value }, () => {
      chrome.tabs.query({ url: '*://www.coupang.com/*' }, tabs => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  });
}
updateToggleState();