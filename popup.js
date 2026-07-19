const altToggle = document.getElementById('alt-toggle');
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

const API_BASE = 'https://altteuri.vercel.app';
const FEEDBACK_PAGE_SIZE = 5;
const FEEDBACK_DRAFT_KEY = 'altFeedbackDraft';
const FEEDBACK_MAX_LEN = 500;
const FEEDBACK_COUNT_SHOW_AT = 450;

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
      'altEnabled',
      'unitPriceSortEnabled',
      'discountRateSortEnabled',
      'priceSortEnabled',
      'elementRemoverEnabled', 
      'forceCoupangListSize',
      'coupangListSize',
      'keywordFilterEnabled',
      'quickCartEnabled'
    ], result => {
      const isEnabled = !!result.altEnabled;
      const unitPriceSort = !!result.unitPriceSortEnabled;
      const discountRateSort = !!result.discountRateSortEnabled;
      const priceSort = !!result.priceSortEnabled;
      const removeContent = !!result.elementRemoverEnabled;
      const forceListSize = !!result.forceCoupangListSize;
      const listSize = result.coupangListSize || '72';
      const keywordFilter = !!result.keywordFilterEnabled;
      const quickCart = !!result.quickCartEnabled;
      updateAltToggleBtn(isEnabled);
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

function updateAltToggleBtn(isEnabled) {
  if (altToggle) {
    altToggle.textContent = isEnabled ? '알뜰이 끄기' : '알뜰이 켜기';
    altToggle.classList.toggle('off', !isEnabled);
  }
  
  const body = document.getElementById('feature-body');
  if (body) body.style.display = isEnabled ? '' : 'none';
}

function syncRemoveBody() {
  const on = !!(toggleRemoveContent && toggleRemoveContent.checked);
  const body = document.getElementById('remove-body');
  if (body) body.style.display = on ? '' : 'none';
  if (pageDetail && !pageDetail.hidden) {
    pageDetail.style.height = on && detailHeightLock ? detailHeightLock + 'px' : '';
  }
}

const pageMain = document.getElementById('page-main');
const pageDetail = document.getElementById('page-detail');
const pageFeedback = document.getElementById('page-feedback');
const navRemove = document.getElementById('nav-remove');
const navBack = document.getElementById('nav-back');
const navFeedback = document.getElementById('nav-feedback');
const navBackFeedback = document.getElementById('nav-back-feedback');
let detailHeightLock = 0;
let currentPage = 'main';

function showPage(name) {
  const prev = currentPage;
  if (name !== 'feedback' && prev === 'feedback') {
    abortFeedbackFetch();
  }

  if (name === 'detail') {
    detailHeightLock = pageMain.offsetHeight;
  } else {
    if (pageDetail) pageDetail.style.height = '';
    detailHeightLock = 0;
  }

  if (pageFeedback) {
    // 세부창과 동일하게 메인 페이지 높이를 상한으로 사용
    // (알뜰이 꺼짐 등으로 메인이 아주 짧을 때는 작성 UI가 잘리지 않을 최소 높이 보장)
    pageFeedback.style.maxHeight = name === 'feedback'
      ? Math.max(pageMain.offsetHeight, 300) + 'px'
      : '';
  }

  if (pageMain) pageMain.hidden = name !== 'main';
  if (pageDetail) pageDetail.hidden = name !== 'detail';
  if (pageFeedback) pageFeedback.hidden = name !== 'feedback';
  currentPage = name;

  if (name === 'detail') syncRemoveBody();
  if (name === 'feedback') enterFeedbackPage();
  window.scrollTo(0, 0);
}

function showDetail() { showPage('detail'); }
function showMain() { showPage('main'); }
function showFeedback() { showPage('feedback'); }

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
        removeContent: !!result.elementRemoverEnabled,
        forceListSize: !!result.forceCoupangListSize,
        keywordFilter: !!result.keywordFilterEnabled,
        quickCart: !!result.quickCartEnabled
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
        unitPriceSort: false,
        discountRateSort: false,
        priceSort: false,
        removeContent: false,
        forceListSize: false,
        keywordFilter: false,
        quickCart: false
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
      const removeContent = !!result.elementRemoverEnabled;
      const forceListSize = !!result.forceCoupangListSize;
      const keywordFilter = !!result.keywordFilterEnabled;
      const quickCart = !!result.quickCartEnabled;
      const shouldEnable = unitPriceSort || discountRateSort || priceSort || removeContent || forceListSize || keywordFilter || quickCart;
      chrome.storage.sync.set({ altEnabled: shouldEnable }, () => {
        updateAltToggleBtn(shouldEnable);
      });
    });
  } catch (e) {
  }
}

function handleAltToggleClick() {
  try {
    chrome.storage.sync.get(['altEnabled'], result => {
      const isEnabled = !!result.altEnabled;
      if (isEnabled) {
        saveLastPreset();
        chrome.storage.sync.set({
          altEnabled: false,
          unitPriceSortEnabled: false,
          discountRateSortEnabled: false,
          priceSortEnabled: false,
          elementRemoverEnabled: false,
          forceCoupangListSize: false,
          keywordFilterEnabled: false,
          quickCartEnabled: false
        }, () => {
          try { chrome.storage.local.set({ altActiveSort: null, altSortQuery: null }); } catch (e) {}
          toggleUnitPriceSort.checked = false;
          toggleDiscountRateSort.checked = false;
          togglePriceSort.checked = false;
          toggleRemoveContent.checked = false;
          syncSizeControl(false);
          if(toggleKeywordFilter) toggleKeywordFilter.checked = false;
          if(toggleQuickCart) toggleQuickCart.checked = false;
          updateAltToggleBtn(false);
          syncRemoveBody();
          syncRemoveNav();
          chrome.tabs.query({
            url: [
              '*://www.coupang.com/*',
              '*://cart.coupang.com/*',
              '*://mc.coupang.com/*'
            ]
          }, tabs => {
            tabs.forEach(tab => chrome.tabs.reload(tab.id));
          });
        });
      } else {
        restoreLastPreset();
        chrome.storage.sync.set({ altEnabled: true }, () => {
          updateAltToggleBtn(true);
          syncRemoveBody();
          syncRemoveNav();
          chrome.tabs.query({
            url: [
              '*://www.coupang.com/*',
              '*://cart.coupang.com/*',
              '*://mc.coupang.com/*'
            ]
          }, tabs => {
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

altToggle.addEventListener('click', handleAltToggleClick);
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

if (navRemove) {
  navRemove.addEventListener('click', showDetail);
  navRemove.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(); }
  });
}
if (navBack) navBack.addEventListener('click', showMain);
if (navFeedback) navFeedback.addEventListener('click', showFeedback);
if (navBackFeedback) navBackFeedback.addEventListener('click', showMain);

const feedbackBody = document.getElementById('feedback-body');
const feedbackCharCount = document.getElementById('feedback-char-count');
const feedbackSubmit = document.getElementById('btn-feedback-submit');
const feedbackHoneypot = document.getElementById('feedback-honeypot');
const feedbackList = document.getElementById('feedback-list');
const feedbackEmpty = document.getElementById('feedback-empty');
const feedbackLoading = document.getElementById('feedback-loading');
const feedbackError = document.getElementById('feedback-error');
const feedbackRetry = document.getElementById('btn-feedback-retry');
const feedbackLoadMore = document.getElementById('btn-feedback-load-more');
const feedbackPrivacyLink = document.getElementById('feedback-privacy-link');

let feedbackOffset = 0;
let feedbackHasMore = false;
let feedbackAbort = null;
let feedbackSubmitting = false;
let feedbackLoadingMore = false;
let feedbackDraftTimer = null;
const feedbackClamps = [];

function abortFeedbackFetch() {
  if (feedbackAbort) {
    feedbackAbort.abort();
    feedbackAbort = null;
  }
}

function formatFeedbackDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function remountFeedbackClamps() {
  for (let i = feedbackClamps.length - 1; i >= 0; i -= 1) {
    const entry = feedbackClamps[i];
    if (!entry.bodyEl.isConnected) {
      feedbackClamps.splice(i, 1);
      continue;
    }
    entry.sync();
  }
}

function wireFeedbackBodyClamp(bodyEl, toggleEl) {
  const sync = () => {
    const expanded = bodyEl.classList.contains('is-expanded');
    bodyEl.classList.remove('is-expanded');
    bodyEl.classList.add('is-clamped');
    const needsToggle = bodyEl.scrollHeight > bodyEl.clientHeight + 1;
    if (!needsToggle) {
      bodyEl.classList.remove('is-clamped');
      toggleEl.hidden = true;
      return;
    }
    toggleEl.hidden = false;
    if (expanded) {
      bodyEl.classList.remove('is-clamped');
      bodyEl.classList.add('is-expanded');
      toggleEl.textContent = '접기';
    } else {
      toggleEl.textContent = '펼치기';
    }
  };
  toggleEl.addEventListener('click', () => {
    const expanded = bodyEl.classList.toggle('is-expanded');
    bodyEl.classList.toggle('is-clamped', !expanded);
    toggleEl.textContent = expanded ? '접기' : '펼치기';
  });
  feedbackClamps.push({ bodyEl, sync });
  requestAnimationFrame(() => requestAnimationFrame(sync));
}

function createFeedbackItem(comment) {
  const item = document.createElement('div');
  item.className = 'feedback-item';
  if (comment && comment.id != null) item.dataset.id = String(comment.id);

  const body = document.createElement('div');
  body.className = 'feedback-item-body';
  body.textContent = (comment && comment.body) || '';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'feedback-item-toggle';
  toggle.hidden = true;

  const meta = document.createElement('div');
  meta.className = 'feedback-item-meta';
  const parts = [];
  const date = formatFeedbackDate(comment && comment.createdAt);
  if (date) parts.push(date);
  if (comment && comment.version) parts.push('v' + comment.version);
  meta.textContent = parts.join(' · ');

  item.appendChild(body);
  item.appendChild(toggle);
  item.appendChild(meta);
  wireFeedbackBodyClamp(body, toggle);
  return item;
}

function setFeedbackListState(state) {
  if (feedbackLoading) feedbackLoading.hidden = state !== 'loading';
  if (feedbackEmpty) feedbackEmpty.hidden = state !== 'empty';
  if (feedbackError) feedbackError.hidden = state !== 'error';
  if (feedbackList) feedbackList.hidden = state === 'loading' || state === 'error';
  if (feedbackLoadMore) {
    feedbackLoadMore.hidden = state !== 'list' || !feedbackHasMore;
  }
}

function updateFeedbackCharCount() {
  if (!feedbackBody || !feedbackCharCount) return;
  const len = feedbackBody.value.length;
  feedbackCharCount.textContent = len + ' / ' + FEEDBACK_MAX_LEN;
  feedbackCharCount.classList.toggle('visible', len >= FEEDBACK_COUNT_SHOW_AT);
  feedbackCharCount.classList.toggle('warn', len >= FEEDBACK_MAX_LEN);
  if (feedbackSubmit && !feedbackSubmitting) {
    feedbackSubmit.disabled = len < 1 || len > FEEDBACK_MAX_LEN;
    feedbackSubmit.classList.remove('error');
    feedbackSubmit.textContent = '보내기';
  }
}

function saveFeedbackDraft() {
  if (!feedbackBody) return;
  try {
    chrome.storage.local.set({ [FEEDBACK_DRAFT_KEY]: feedbackBody.value });
  } catch (e) {
  }
}

function restoreFeedbackDraft() {
  if (!feedbackBody) return;
  try {
    chrome.storage.local.get([FEEDBACK_DRAFT_KEY], result => {
      const draft = result[FEEDBACK_DRAFT_KEY];
      if (typeof draft === 'string' && draft) {
        feedbackBody.value = draft.slice(0, FEEDBACK_MAX_LEN);
      }
      updateFeedbackCharCount();
    });
  } catch (e) {
    updateFeedbackCharCount();
  }
}

function clearFeedbackDraft() {
  try {
    chrome.storage.local.remove(FEEDBACK_DRAFT_KEY);
  } catch (e) {
  }
}

async function fetchFeedbackComments(reset) {
  if (!API_BASE) return;
  if (!reset && feedbackLoadingMore) return;

  if (reset) {
    abortFeedbackFetch();
  }
  const controller = new AbortController();
  feedbackAbort = controller;

  if (reset) {
    feedbackOffset = 0;
    feedbackHasMore = false;
    if (feedbackList) feedbackList.innerHTML = '';
    setFeedbackListState('loading');
  } else {
    feedbackLoadingMore = true;
    if (feedbackLoadMore) {
      feedbackLoadMore.disabled = true;
      feedbackLoadMore.textContent = '불러오는 중…';
    }
  }

  const offset = reset ? 0 : feedbackOffset;
  const url = API_BASE + '/api/comments?limit=' + FEEDBACK_PAGE_SIZE + '&offset=' + offset;

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (feedbackAbort !== controller) return;

    const comments = Array.isArray(data.comments) ? data.comments : [];
    feedbackHasMore = !!data.hasMore;
    feedbackOffset = offset + comments.length;

    if (feedbackList) {
      comments.forEach(c => feedbackList.appendChild(createFeedbackItem(c)));
      const hasItems = feedbackList.children.length > 0;
      if (!hasItems) setFeedbackListState('empty');
      else setFeedbackListState('list');
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    if (reset || (feedbackList && !feedbackList.children.length)) {
      setFeedbackListState('error');
    } else if (feedbackLoadMore) {
      feedbackLoadMore.hidden = false;
      feedbackLoadMore.textContent = '다시 시도';
    }
  } finally {
    if (feedbackAbort === controller) feedbackAbort = null;
    if (!reset) {
      feedbackLoadingMore = false;
      if (feedbackLoadMore) {
        feedbackLoadMore.disabled = false;
        if (feedbackLoadMore.textContent !== '다시 시도') {
          feedbackLoadMore.textContent = '더 보기';
        }
      }
    }
  }
}

function enterFeedbackPage() {
  restoreFeedbackDraft();
  updateFeedbackCharCount();
  fetchFeedbackComments(true);
}

async function submitFeedback() {
  if (!feedbackBody || !feedbackSubmit || feedbackSubmitting) return;
  const body = feedbackBody.value.trim();
  if (body.length < 1 || body.length > FEEDBACK_MAX_LEN) return;

  feedbackSubmitting = true;
  feedbackSubmit.disabled = true;
  feedbackSubmit.classList.remove('error');
  feedbackSubmit.textContent = '보내는 중…';

  let version = '';
  try {
    version = chrome.runtime.getManifest().version || '';
  } catch (e) {
  }

  const payload = {
    body: body,
    version: version,
    website: feedbackHoneypot ? feedbackHoneypot.value : ''
  };

  try {
    const res = await fetch(API_BASE + '/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'bad status');
    }
    const data = await res.json();
    const comment = data && data.comment ? data.comment : {
      id: Date.now(),
      body: body,
      version: version,
      createdAt: new Date().toISOString()
    };

    feedbackBody.value = '';
    if (feedbackHoneypot) feedbackHoneypot.value = '';
    clearFeedbackDraft();
    updateFeedbackCharCount();

    if (feedbackList) {
      feedbackList.insertBefore(createFeedbackItem(comment), feedbackList.firstChild);
      feedbackOffset += 1;
      setFeedbackListState('list');
    }

    feedbackSubmit.textContent = '보내기';
    feedbackSubmit.disabled = true;
  } catch (e) {
    feedbackSubmit.classList.add('error');
    feedbackSubmit.textContent = e && e.message === 'rate_limited'
      ? '하루에 2개까지 보낼 수 있습니다'
      : '실패 · 다시 시도';
    feedbackSubmit.disabled = false;
  } finally {
    feedbackSubmitting = false;
  }
}

if (feedbackBody) {
  feedbackBody.addEventListener('input', () => {
    updateFeedbackCharCount();
    if (feedbackDraftTimer) clearTimeout(feedbackDraftTimer);
    feedbackDraftTimer = setTimeout(saveFeedbackDraft, 200);
  });
}
if (feedbackPrivacyLink) {
  feedbackPrivacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    const url = chrome.runtime.getURL('legal.html#privacy');
    chrome.tabs.create({ url: url });
  });
}
if (feedbackSubmit) feedbackSubmit.addEventListener('click', submitFeedback);
if (feedbackRetry) {
  feedbackRetry.addEventListener('click', () => fetchFeedbackComments(true));
}
if (feedbackLoadMore) {
  feedbackLoadMore.addEventListener('click', () => {
    fetchFeedbackComments(false);
  });
}
window.addEventListener('resize', remountFeedbackClamps);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(remountFeedbackClamps).catch(() => {});
}

const presetListEl = document.getElementById('preset-list');
const presetSearchEl = document.getElementById('preset-search');
let presetQuery = '';

function presetMatch(name, q) {
  const HS = (typeof window !== 'undefined' && window.HangulSearch) || null;
  if (HS) return HS.match(name, q);
  return (name || '').toLowerCase().includes(q);
}

const ALT_GROUPS = [
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
      detail.textContent = r.elementRemoverEnabled ? '켜짐' : '꺼짐';
    });
  } catch (e) {
  }
}

function getPresetItems() {
  const p = (typeof window !== 'undefined' && window.ALT_BUILTIN_PRESET) || null;
  return p && Array.isArray(p.items) ? p.items.filter(it => it && it.selector) : [];
}

function setPresetItemOff(selector, isOff) {
  try {
    chrome.storage.sync.get(['altPresetOff'], result => {
      const off = new Set(result.altPresetOff || []);
      if (isOff) off.add(selector); else off.delete(selector);
      chrome.storage.sync.set({ altPresetOff: Array.from(off) }, syncRemoveNav);
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
    chrome.storage.sync.get(['altPresetOff'], result => {
      const off = new Set(result.altPresetOff || []);
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
      ALT_GROUPS.forEach(g => {
        const list = byGroup[g.id];
        if (!list || !list.length) return;

        
        const head = document.createElement('div');
        head.className = 'preset-head';
        head.textContent = g.name;
        presetListEl.appendChild(head);

        const card = document.createElement('div');
        card.className = 'section';
        list.forEach(it => {
          const shown = !off.has(it.selector);
          const row = document.createElement('div');
          row.className = 'preset-row';
          const label = document.createElement('span');
          label.className = 'preset-item-label';
          label.textContent = it.name || it.selector;
          label.title = it.selector;
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'cbox';
          cb.checked = shown;
          cb.setAttribute('aria-label', it.name || it.selector);
          cb.addEventListener('change', () => setPresetItemOff(it.selector, !cb.checked));
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