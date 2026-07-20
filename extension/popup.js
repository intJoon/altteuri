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

function applyFeatureControls(result) {
  toggleUnitPriceSort.checked = !!result.unitPriceSortEnabled;
  toggleDiscountRateSort.checked = !!result.discountRateSortEnabled;
  togglePriceSort.checked = !!result.priceSortEnabled;
  toggleRemoveContent.checked = !!result.elementRemoverEnabled;
  syncRemoveBody();
  syncSizeControl(!!result.forceCoupangListSize, result.coupangListSize || '72');
  if (toggleKeywordFilter) toggleKeywordFilter.checked = !!result.keywordFilterEnabled;
  if (toggleQuickCart) toggleQuickCart.checked = !!result.quickCartEnabled;
}

function updateToggleState(done) {
  try {
    chrome.storage.sync.get([
      'unitPriceSortEnabled',
      'discountRateSortEnabled',
      'priceSortEnabled',
      'elementRemoverEnabled',
      'forceCoupangListSize',
      'coupangListSize',
      'keywordFilterEnabled',
      'quickCartEnabled'
    ], result => {
      applyFeatureControls(result || {});
      if (typeof done === 'function') done();
    });
  } catch (e) {
    if (typeof done === 'function') done();
  }
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
const POPUP_PAGE_KEY = 'altPopupPage';
let detailHeightLock = 0;
let currentPage = 'main';

function measureExpandedMainHeight() {
  if (!pageMain) return 0;
  const wasMainHidden = !!pageMain.hidden;
  if (!wasMainHidden) return pageMain.offsetHeight;
  const prevBodyVisibility = document.body.style.visibility;
  document.body.style.visibility = 'hidden';
  pageMain.hidden = false;
  const height = pageMain.offsetHeight;
  pageMain.hidden = true;
  document.body.style.visibility = prevBodyVisibility;
  return height;
}

function clearPresetSearch() {
  presetQuery = '';
  if (presetSearchEl) presetSearchEl.value = '';
  renderPresetList();
}

function persistPopupPage(name) {
  try {
    if (!chrome.storage || !chrome.storage.session) return;
    chrome.storage.session.set({ [POPUP_PAGE_KEY]: name });
  } catch (e) {}
}

function restorePopupPage(done) {
  try {
    if (!chrome.storage || !chrome.storage.session) {
      done('main');
      return;
    }
    chrome.storage.session.get([POPUP_PAGE_KEY], result => {
      const name = result && result[POPUP_PAGE_KEY];
      done(name === 'detail' || name === 'feedback' ? name : 'main');
    });
  } catch (e) {
    done('main');
  }
}

function showPage(name, opts) {
  const options = opts || {};
  const prev = currentPage;
  if (name !== 'feedback' && prev === 'feedback') {
    abortFeedbackFetch();
  }
  if (prev === 'detail' && name !== 'detail') {
    clearPresetSearch();
  }

  if (name === 'detail') {
    detailHeightLock = pageMain.offsetHeight;
  } else {
    if (pageDetail) pageDetail.style.height = '';
    detailHeightLock = 0;
  }

  if (pageFeedback) {
    pageFeedback.style.height = '';
    if (name === 'feedback') {
      const cap = measureExpandedMainHeight();
      pageFeedback.style.maxHeight = cap ? cap + 'px' : '';
    } else {
      pageFeedback.style.maxHeight = '';
    }
  }

  if (pageMain) pageMain.hidden = name !== 'main';
  if (pageDetail) pageDetail.hidden = name !== 'detail';
  if (pageFeedback) pageFeedback.hidden = name !== 'feedback';
  currentPage = name;
  if (!options.skipPersist) persistPopupPage(name);

  if (name === 'detail') syncRemoveBody();
  if (name === 'feedback') enterFeedbackPage();
  window.scrollTo(0, 0);
}

function showDetail() { showPage('detail'); }
function showMain() { showPage('main'); }
function showFeedback() { showPage('feedback'); }

function handleUnitPriceSortChange() {
  try {
    chrome.storage.sync.set({ unitPriceSortEnabled: toggleUnitPriceSort.checked });
  } catch (e) {}
}

function handleDiscountRateSortChange() {
  try {
    chrome.storage.sync.set({ discountRateSortEnabled: toggleDiscountRateSort.checked });
  } catch (e) {}
}

function handlePriceSortChange() {
  try {
    chrome.storage.sync.set({ priceSortEnabled: togglePriceSort.checked });
  } catch (e) {}
}

function handleRemoveContentChange() {
  const removeContent = toggleRemoveContent.checked;
  try {
    chrome.storage.sync.set({ elementRemoverEnabled: removeContent }, () => {
      syncRemoveBody();
      syncRemoveNav();
    });
  } catch (e) {}
}

function applyListSize(force, size) {
  const data = force
    ? { forceCoupangListSize: true, coupangListSize: String(size || '72') }
    : { forceCoupangListSize: false };
  try {
    chrome.storage.sync.set(data);
  } catch (e) {}
}

function readSelectedListSize(fallback) {
  const active = sizeChips.find(c => c.classList.contains('active'));
  if (active && active.dataset.size) return String(active.dataset.size);
  return String(fallback || '72');
}

function handleForceListSizeToggle() {
  const on = forceListSizeToggle.checked;
  try {
    chrome.storage.sync.get(['coupangListSize'], result => {
      const kept = String(result.coupangListSize || readSelectedListSize('72'));
      if (on) {
        syncSizeControl(true, kept);
        applyListSize(true, kept);
      } else {
        syncSizeControl(false, kept);
        applyListSize(false);
      }
    });
  } catch (e) {
    const kept = readSelectedListSize('72');
    if (on) {
      syncSizeControl(true, kept);
      applyListSize(true, kept);
    } else {
      syncSizeControl(false, kept);
      applyListSize(false);
    }
  }
}

function handleSizeChipClick(e) {
  const size = e.currentTarget.dataset.size;
  syncSizeControl(true, size);
  applyListSize(true, size);
}

function handleKeywordFilterChange() {
  try {
    chrome.storage.sync.set({ keywordFilterEnabled: toggleKeywordFilter.checked });
  } catch (e) {}
}

function handleQuickCartChange() {
  try {
    chrome.storage.sync.set({ quickCartEnabled: toggleQuickCart.checked });
  } catch (e) {}
}

toggleUnitPriceSort.addEventListener('change', handleUnitPriceSortChange);
toggleDiscountRateSort.addEventListener('change', handleDiscountRateSortChange);
togglePriceSort.addEventListener('change', handlePriceSortChange);
toggleRemoveContent.addEventListener('change', handleRemoveContentChange);
if (toggleKeywordFilter) {
  toggleKeywordFilter.addEventListener('change', handleKeywordFilterChange);
}
if (toggleQuickCart) {
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
    const url = `${API_BASE}/legal.html#privacy`;
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
syncRemoveNav();
updateToggleState(() => {
  restorePopupPage(name => {
    if (name !== 'main') showPage(name, { skipPersist: true });
  });
});