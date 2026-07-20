((A) => {
const ALT_QUICK_CART_STYLE_ID = 'alt-quick-cart-styles';

function quickCartSleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureQuickCartStyles() {
  let s = document.getElementById(ALT_QUICK_CART_STYLE_ID);
  if (!s) {
    s = document.createElement('style');
    s.id = ALT_QUICK_CART_STYLE_ID;
    (document.head || document.documentElement).appendChild(s);
  }
  s.textContent = [
    '@keyframes alt-quick-cart-spin { to { transform: rotate(360deg); } }',
    '.alt-quick-cart-btn {',
    '  position: absolute; right: 8px; bottom: 8px; z-index: 12;',
    '  width: 36px; height: 36px; padding: 0; border: none; border-radius: 50%;',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  background: #fff; color: #346aff;',
    '  box-shadow: 0 1px 2px rgba(0,0,0,0.18); cursor: pointer;',
    '  opacity: 0; pointer-events: none; transition: opacity 0.15s, background 0.12s;',
    '}',
    'li[class*="ProductUnit_productUnit"]:hover .alt-quick-cart-btn,',
    '.alt-quick-cart-btn:focus-visible,',
    '.alt-quick-cart-btn[data-state="loading"],',
    '.alt-quick-cart-btn[data-state="done"],',
    '.alt-quick-cart-btn[data-state="error"] { opacity: 1; pointer-events: auto; }',
    '.alt-quick-cart-btn:hover { background: #f7f8fa; }',
    '.alt-quick-cart-btn[data-state="loading"] { cursor: wait; opacity: 0.85; }',
    '.alt-quick-cart-btn[data-state="loading"] svg { animation: alt-quick-cart-spin 0.75s linear infinite; transform-origin: center; }',
    '.alt-quick-cart-btn[data-state="done"] { color: #1a9f5c; }',
    '.alt-quick-cart-btn[data-state="error"] { color: #e53935; }',
    '.alt-quick-cart-btn svg { width: 18px; height: 18px; display: block; }'
  ].join('\n');
}

function altQuickCartIcon(kind) {
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
  return A.core.getProductImageBox(item);
}

function setQuickCartBtnState(btn, state) {
  btn.dataset.state = state;
  if (state === 'loading') btn.innerHTML = altQuickCartIcon('spin');
  else if (state === 'done') btn.innerHTML = altQuickCartIcon('check');
  else if (state === 'error') btn.innerHTML = altQuickCartIcon('error');
  else btn.innerHTML = altQuickCartIcon('cart');
}

function buildQuickCartProductUrl(ids) {
  const url = new URL('/vp/products/' + ids.productId, location.origin);
  url.searchParams.set('itemId', ids.itemId);
  url.searchParams.set('vendorItemId', ids.vendorItemId);
  return url.href;
}

function clipQuickCartText(el, maxLen) {
  return (el?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, maxLen || 3000);
}

function findProdCartButton(doc) {
  if (!doc) return null;
  const labeled = [...doc.querySelectorAll('button')].find((b) => /장바구니\s*담기/.test((b.textContent || '').trim()));
  if (labeled) return labeled;
  const byClass = doc.querySelector('button.prod-cart-btn');
  if (byClass && !/보기/.test((byClass.textContent || '').trim())) return byClass;
  return null;
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
  if (!doc) return false;
  const text = clipQuickCartText(doc.body, 4000);
  if (/담기\s*완료|상품이\s*장바구니에\s*담겼|장바구니에\s*(?:상품을?\s*)?담았(?:습니다|어요)/.test(text)) {
    return true;
  }
  const hasCartCta = [...doc.querySelectorAll('button, a')].some((el) =>
    /장바구니\s*(?:보기|가기|바로가기)/.test((el.textContent || '').trim())
  );
  return hasCartCta && !findProdCartButton(doc);
}

function getIframeFrameId(iframe) {
  try {
    if (chrome.runtime && typeof chrome.runtime.getFrameId === 'function') {
      return chrome.runtime.getFrameId(iframe);
    }
  } catch (e) {}
  return null;
}

function runInIframeMainWorld(iframe, action) {
  return new Promise((resolve, reject) => {
    const frameId = getIframeFrameId(iframe);
    if (frameId == null) {
      reject(new Error('no_frame'));
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'alt-main', action, frameId }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!res || !res.ok) reject(new Error((res && res.error) || 'inject_failed'));
        else resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function installCartResponseWatcher(iframe) {
  try {
    const doc = iframe.contentDocument;
    if (doc) doc.documentElement.removeAttribute('data-alt-cart');
  } catch (e) {}
  try {
    await runInIframeMainWorld(iframe, 'install');
  } catch (e) {}
}

async function clickProdCartButton(iframe, btn) {
  try {
    dispatchRealClick(btn, iframe.contentWindow || btn?.ownerDocument?.defaultView);
  } catch (e) {}
  try {
    const win = iframe.contentWindow;
    if (win) win.postMessage({ __altCartCmd: 'click' }, '*');
  } catch (e) {}
}

function readCartWatchFlag(doc) {
  try { return doc.documentElement.getAttribute('data-alt-cart'); } catch { return null; }
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

async function waitForPdpCartButton(iframe, maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    let doc;
    try { doc = iframe.contentDocument; } catch { await quickCartSleep(40); continue; }
    if (!doc) { await quickCartSleep(40); continue; }
    const btn = findProdCartButton(doc);
    if (btn && !btn.disabled) return doc;
    const blocker = detectQuickCartPreflightBlock(doc);
    if (blocker && Date.now() > deadline - maxMs + 2000) throw new Error(blocker);
    await quickCartSleep(40);
  }
  throw new Error('cart_failed');
}

async function waitForFastCartResult(doc, maxMs, iframe) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn) => {
      if (done) return;
      done = true;
      try { obs.disconnect(); } catch {}
      window.removeEventListener('message', onMsg);
      clearInterval(poll);
      clearTimeout(hard);
      fn();
    };

    const check = () => {
      const flag = readCartWatchFlag(doc);
      if (flag === 'ok') return finish(resolve);
      if (flag === 'fail') return finish(() => reject(new Error('cart_failed')));

      if (detectQuickCartUiSuccess(doc)) return finish(resolve);

      const fail = detectQuickCartUiFailure(doc);
      if (fail) return finish(() => reject(new Error(fail)));
    };

    const onMsg = (e) => {
      if (iframe && e.source && e.source !== iframe.contentWindow) return;
      const v = e.data && e.data.__altCart;
      if (v === 'ok') return finish(resolve);
      if (v === 'fail') return finish(() => reject(new Error('cart_failed')));
    };
    window.addEventListener('message', onMsg);

    const obs = new MutationObserver(check);
    try {
      obs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-alt-cart'] });
      obs.observe(doc.body || doc.documentElement, { childList: true, subtree: true, characterData: true });
    } catch {}

    const poll = setInterval(check, 16);
    const hard = setTimeout(() => {
      check();
      if (!done) finish(() => reject(new Error('cart_timeout')));
    }, maxMs);

    check();
  });
}

function quickCartCacheKey(ids) {
  return ids.productId + ':' + ids.itemId + ':' + ids.vendorItemId;
}

function createQuickCartIframe() {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-alt-ui', '');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-10000px;top:0';
  return iframe;
}

function loadQuickCartIframe(iframe, ids) {
  return new Promise((resolve, reject) => {
    iframe.addEventListener('load', resolve, { once: true });
    iframe.addEventListener('error', () => reject(new Error('cart_failed')), { once: true });
    iframe.src = buildQuickCartProductUrl(ids);
  });
}

const ALT_WARM_DEBOUNCE_MS = 160;
let altWarm = null;
let altWarmTimer = null;
let altWarmEpoch = 0;

function discardQuickCartWarm() {
  clearTimeout(altWarmTimer);
  altWarmTimer = null;
  const entry = altWarm;
  altWarm = null;
  altWarmEpoch += 1;
  if (entry?.iframe) {
    try { entry.iframe.remove(); } catch {}
  }
}

function scheduleQuickCartWarm(ids) {
  const key = quickCartCacheKey(ids);
  if (altWarm && altWarm.key === key) return;
  clearTimeout(altWarmTimer);
  altWarmTimer = setTimeout(() => { startQuickCartWarm(ids); }, ALT_WARM_DEBOUNCE_MS);
}

function startQuickCartWarm(ids) {
  clearTimeout(altWarmTimer);
  altWarmTimer = null;
  const key = quickCartCacheKey(ids);
  if (altWarm && altWarm.key === key) return altWarm.promise;

  discardQuickCartWarm();
  const epoch = altWarmEpoch;
  const entry = { key, ids, iframe: null, promise: null, epoch };
  entry.promise = (async () => {
    const iframe = createQuickCartIframe();
    entry.iframe = iframe;
    document.body.appendChild(iframe);
    await loadQuickCartIframe(iframe, ids);
    if (altWarm !== entry || entry.epoch !== altWarmEpoch) {
      try { iframe.remove(); } catch {}
      throw new Error('warm_aborted');
    }
    const doc = await waitForPdpCartButton(iframe, 8000);
    if (altWarm !== entry || entry.epoch !== altWarmEpoch) {
      try { iframe.remove(); } catch {}
      throw new Error('warm_aborted');
    }
    await installCartResponseWatcher(iframe);
    return { iframe, doc, key };
  })();
  altWarm = entry;
  entry.promise.catch(() => {
    if (altWarm === entry) {
      altWarm = null;
      try { entry.iframe?.remove(); } catch {}
    }
  });
  return entry.promise;
}

async function openFreshQuickCartPdp(ids) {
  const key = quickCartCacheKey(ids);
  const iframe = createQuickCartIframe();
  document.body.appendChild(iframe);
  try {
    await loadQuickCartIframe(iframe, ids);
    const doc = await waitForPdpCartButton(iframe, 8000);
    await installCartResponseWatcher(iframe);
    return { iframe, doc, key };
  } catch (e) {
    try { iframe.remove(); } catch {}
    throw e;
  }
}

async function acquireQuickCartPdp(ids) {
  const key = quickCartCacheKey(ids);
  clearTimeout(altWarmTimer);
  altWarmTimer = null;

  if (altWarm && altWarm.key === key) {
    const entry = altWarm;
    altWarm = null;
    altWarmEpoch += 1;
    try {
      return await entry.promise;
    } catch {
      return openFreshQuickCartPdp(ids);
    }
  }

  if (altWarm) discardQuickCartWarm();
  return openFreshQuickCartPdp(ids);
}

async function iframeAddToCart(ids) {
  const { iframe, doc } = await acquireQuickCartPdp(ids);
  try {
    const btn = findProdCartButton(doc);
    if (!btn || btn.disabled) throw new Error('cart_failed');

    try { doc.documentElement.removeAttribute('data-alt-cart'); } catch {}
    await installCartResponseWatcher(iframe);
    await clickProdCartButton(iframe, btn);
    await waitForFastCartResult(doc, 2500, iframe);
  } finally {
    try { iframe.remove(); } catch {}
  }
}

function requestAddToCart(ids) {
  return iframeAddToCart(ids);
}

function attachQuickCartButton(item) {
  if (!item || item.querySelector('.alt-quick-cart-btn')) return;
  const ids = parseProductCartIds(item);
  if (!ids) return;
  const imgBox = getProductImageBox(item);
  if (!imgBox) return;
  if (getComputedStyle(imgBox).position === 'static') imgBox.style.position = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'alt-quick-cart-btn';
  btn.setAttribute('data-alt-ui', '');
  btn.setAttribute('aria-label', '장바구니 담기');
  btn.title = '장바구니 담기';
  setQuickCartBtnState(btn, 'idle');

  const stopNav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  };

  const key = quickCartCacheKey(ids);
  btn.addEventListener('pointerenter', () => scheduleQuickCartWarm(ids), { passive: true });
  btn.addEventListener('pointerleave', () => {
    clearTimeout(altWarmTimer);
    altWarmTimer = null;
    if (altWarm && altWarm.key === key) discardQuickCartWarm();
  }, { passive: true });

  ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'dblclick', 'click'].forEach((type) => {
    btn.addEventListener(type, (e) => {
      stopNav(e);
      if (type === 'pointerdown' || type === 'mousedown') startQuickCartWarm(ids);
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
  discardQuickCartWarm();
  document.querySelectorAll('.alt-quick-cart-btn, .alt-quick-cart-wrap, iframe[data-alt-ui]').forEach(el => el.remove());
}

function applyQuickCartButtons() {
  if (!/\/np\/search/.test(location.pathname)) {
    removeQuickCartButtons();
    return;
  }
  if (!window.chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.sync.get(['quickCartEnabled'], result => {
      if (result.quickCartEnabled) {
        ensureQuickCartStyles();
        A.core.getProductItems().forEach(attachQuickCartButton);
        return;
      }
      removeQuickCartButtons();
    });
  } catch (e) {}
}

A.quickCart = Object.freeze({
  applyButtons: applyQuickCartButtons
});
})(globalThis.Altteuri ||= {});
