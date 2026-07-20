((A) => {
let excludedKeywords = [];
let keywordFilterContainer = null;
let keywordFilterEnabled = false;
let lastTrackedSearchQuery = null;
let kwChangeBound = false;

const KEYWORD_FILTER_STYLE_ID = 'alt-keyword-filter-styles';

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
  return A.pure.normalizeStoredSearchQuery(stored);
}

function renderKeywordFilterTags() {
  
  const tagsContainer = document.querySelector('[data-alt-keyword-tags]');
  if (!tagsContainer) { updateKeywordResetButton(); return; }
  tagsContainer.querySelectorAll('.fw-inline').forEach(el => el.remove());
  tagsContainer.classList.toggle('alt-tags-empty', excludedKeywords.length === 0);
  const wrap = tagsContainer.closest('[data-alt-keyword-tags-wrap]');
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
  if (A.sort.isActive('unit')) A.sort.reapplySortIfNeeded();
  else if (A.sort.isActive('discount')) A.sort.reapplySortIfNeeded();
  else if (A.sort.isActive('price')) A.sort.reapplySortIfNeeded();
}

function resetExcludedKeywordsForSearchChange() {
  excludedKeywords = [];
  saveExcludedKeywords();
  renderKeywordFilterTags();
  applyProductVisibility();
  A.sort.deactivateAll();
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
    .alt-keyword-filter {
      font-family: inherit;
    }
    .alt-keyword-filter__row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    .alt-keyword-filter__input {
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
    .alt-keyword-filter__input:focus { border-color: #346aff; }
    .alt-keyword-filter__btn {
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
    .alt-keyword-filter__btn:hover { background: #eee; }
    [data-alt-keyword-tags] {
      margin: 0;
      padding: 0;
    }
    [data-alt-keyword-tags].alt-tags-empty {
      display: none;
    }
    .alt-keyword-tags {
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
    A.core.SELECTORS.sortWrapper
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && !el.closest('[data-alt-keyword-filter]')) return el;
  }
  const productList = document.querySelector(A.core.SELECTORS.productList);
  return productList ? productList.parentElement : null;
}

function shouldHideByKeyword(item) {
  if (!excludedKeywords.length) return false;
  const productNameEl = A.core.getProductNameEl(item);
  if (!productNameEl) return false;
  return A.pure.matchesExcludedKeyword(productNameEl.textContent, excludedKeywords);
}

function applyProductVisibility() {
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['keywordFilterEnabled'], result => {
      keywordFilterEnabled = !!result.keywordFilterEnabled;
      const productList = document.querySelector(A.core.SELECTORS.productList);
      if (!productList) return;
      A.core.getProductItems(productList).forEach(item => {
        const hideKeyword = keywordFilterEnabled && shouldHideByKeyword(item);
        item.style.display = hideKeyword ? 'none' : '';
      });
    });
  } catch (e) {}
}

function reapplyKeywordFilterSoon() {
  if (A.sort && typeof A.sort.schedulePageApply === 'function') {
    A.sort.schedulePageApply({});
    return;
  }
  applyProductVisibility();
}

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
  document.querySelectorAll('[data-alt-keyword-filter], [data-alt-keyword-tags-wrap], .keyword-filter-container').forEach(el => el.remove());

  
  const filterBar = document.querySelector('.filter-function-bar');
  const tagTarget = findKeywordFilterInsertTarget();
  if (!filterBar && (!tagTarget || !tagTarget.parentNode)) return false;

  ensureKeywordFilterStyles();

  
  const inputBlock = document.createElement('div');
  inputBlock.className = 'alt-keyword-filter';
  inputBlock.setAttribute('data-alt-keyword-filter', '');

  const header = document.createElement('div');
  header.className = 'filter-function-bar-header';
  const title = document.createElement('h4');
  title.textContent = '제외 키워드';
  const resetWrap = document.createElement('div');
  resetWrap.className = 'fw-inline';
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'filter-reset-btn alt-reset-btn';
  resetButton.textContent = '전체해제';
  resetWrap.appendChild(resetButton);
  header.appendChild(title);
  header.appendChild(resetWrap);
  inputBlock.appendChild(header);

  const body = document.createElement('div');
  body.className = 'fw-px-[10px] fw-pb-[8px] fw-pt-[10px]';
  const inputRow = document.createElement('div');
  inputRow.className = 'alt-keyword-filter__row';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '제외할 키워드 입력';
  input.className = 'alt-keyword-filter__input';
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.textContent = '추가';
  addButton.className = 'alt-keyword-filter__btn';
  inputRow.appendChild(input);
  inputRow.appendChild(addButton);
  body.appendChild(inputRow);
  inputBlock.appendChild(body);

  
  const tagsBlock = document.createElement('div');
  tagsBlock.className = 'alt-keyword-tags';
  tagsBlock.setAttribute('data-alt-keyword-tags-wrap', '');
  const tagsRow = document.createElement('div');
  tagsRow.className = 'selected-filters';
  tagsRow.setAttribute('data-alt-keyword-tags', '');
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
    
    const native = document.querySelector('.filter-reset-btn:not(.alt-reset-btn)');
    excludedKeywords = [];
    saveExcludedKeywords();
    renderKeywordFilterTags();
    applyProductVisibility();
    setTimeout(reapplySortIfNeeded, 0);
    if (native) native.click();
  });

  
  const placeTags = () => {
    if (tagTarget && tagTarget.parentNode) {
      if (tagTarget.nextSibling) tagTarget.parentNode.insertBefore(tagsBlock, tagTarget.nextSibling);
      else tagTarget.parentNode.appendChild(tagsBlock);
      return true;
    }
    return false;
  };

  if (filterBar) {
    
    const hr = document.createElement('hr');
    hr.className = 'fw-shrink-0 fw-border-0 fw-w-full fw-bg-[#DFE3E8] fw-h-[1px]';
    inputBlock.appendChild(hr);
    filterBar.insertBefore(inputBlock, filterBar.firstChild);
    if (!placeTags()) inputBlock.appendChild(tagsBlock);
  } else {
    
    if (tagTarget.nextSibling) tagTarget.parentNode.insertBefore(inputBlock, tagTarget.nextSibling);
    else tagTarget.parentNode.appendChild(inputBlock);
    inputBlock.appendChild(tagsBlock);
  }

  keywordFilterContainer = inputBlock;
  renderKeywordFilterTags();
  return true;
}

function updateKeywordResetButton() {
  if (!keywordFilterContainer) return;
  const ourBtn = keywordFilterContainer.querySelector('.alt-reset-btn');
  if (!ourBtn) return;
  const native = document.querySelector('.filter-reset-btn:not(.alt-reset-btn)');
  if (native) native.style.display = 'none';
  const show = excludedKeywords.length > 0 || !!native;
  ourBtn.style.display = show ? '' : 'none';
}

function ensureKeywordFilterPresent() {
  if (!keywordFilterEnabled) return;
  const filterBar = document.querySelector('.filter-function-bar');
  const hasInput = document.querySelector('[data-alt-keyword-filter]');
  const hasTags = document.querySelector('[data-alt-keyword-tags-wrap]');
  
  const ok = hasInput && (!filterBar || hasTags);
  if (!ok) {
    if (createKeywordFilterUI()) loadExcludedKeywords();
    return;
  }
  updateKeywordResetButton();
}

function removeKeywordFilterUI() {
  document.querySelectorAll('[data-alt-keyword-filter], [data-alt-keyword-tags-wrap], .keyword-filter-container').forEach(el => el.remove());
  const native = document.querySelector('.filter-reset-btn:not(.alt-reset-btn)');
  if (native) native.style.display = '';
  keywordFilterContainer = null;
}

function unhideAllProducts() {
  const productList = document.querySelector(A.core.SELECTORS.productList);
  if (productList) A.core.getProductItems(productList).forEach(it => { it.style.display = ''; });
}

function initKeywordFilterSync() {
  if (kwChangeBound) return;
  if (!window.chrome || !chrome.storage || !chrome.storage.onChanged) return;
  kwChangeBound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.keywordFilterEnabled) {
      
      excludedKeywords = [];
      saveExcludedKeywords();
      addKeywordFilterFeature();
    }
  });
}


function addKeywordFilterFeature(retryCount = 0) {
  initKeywordFilterSync();

  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['keywordFilterEnabled'], result => {
      keywordFilterEnabled = !!result.keywordFilterEnabled;
      if (!keywordFilterEnabled) {
        
        removeKeywordFilterUI();
        unhideAllProducts();
        return;
      }

      if (document.querySelector('[data-alt-keyword-filter]')) {
        ensureKeywordFilterPresent();
        observeSearchResubmit();
        loadExcludedKeywords();
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
}

A.keyword = Object.freeze({
  addFeature: addKeywordFilterFeature,
  applyFilter: applyKeywordFilter,
  shouldHideByKeyword,
  ensurePresent: ensureKeywordFilterPresent,
  reapplySoon: reapplyKeywordFilterSoon,
  handleSearchQueryChange,
  getSearchQueryKey,
  trackCurrentQuery() { lastTrackedSearchQuery = getSearchQueryKey(); },
  isEnabled() { return keywordFilterEnabled; }
});
})(globalThis.Altteuri ||= {});
