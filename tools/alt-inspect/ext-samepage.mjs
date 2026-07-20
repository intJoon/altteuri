/**
 * Same-page stress tests after one successful Coupang search load.
 * Avoids multi-navigation bot blocks where possible.
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(__dirname, '../../extension');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IDLE_SCRIPTS = [
  'preset-data.js',
  'pure-logic.js',
  'content/shared-start.js',
  'content/core.js',
  'content/keyword-filter.js',
  'content/sort.js',
  'content/list-size.js',
  'content/quick-cart.js',
  'content/element-remover.js',
  'content/page-runtime.js',
  'content/settings-bridge.js',
  'content/boot.js'
];

const SETTINGS = {
  unitPriceSortEnabled: true,
  discountRateSortEnabled: false,
  priceSortEnabled: false,
  keywordFilterEnabled: true,
  quickCartEnabled: true,
  elementRemoverEnabled: true,
  forceCoupangListSize: false,
  coupangListSize: '36',
  altPresetOff: []
};

function loadScripts() {
  return IDLE_SCRIPTS.map((rel) => ({
    rel,
    source: readFileSync(resolve(extensionPath, rel), 'utf8')
  }));
}

function chromeMockSource(settings) {
  return `(() => {
    const syncStore = ${JSON.stringify(settings)};
    const localStore = {};
    const listeners = [];
    function pick(store, keys) {
      if (keys == null) return { ...store };
      const list = Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of list) out[k] = store[k] !== undefined ? store[k] : (keys && !Array.isArray(keys) ? keys[k] : undefined);
      return out;
    }
    function makeArea(store) {
      return {
        get(keys, cb) {
          const result = pick(store, keys);
          if (typeof cb === 'function') queueMicrotask(() => cb(result));
          return Promise.resolve(result);
        },
        set(obj, cb) {
          const changes = {};
          for (const [k, v] of Object.entries(obj || {})) {
            changes[k] = { oldValue: store[k], newValue: v };
            store[k] = v;
          }
          listeners.forEach(fn => { try { fn(changes, store === syncStore ? 'sync' : 'local'); } catch {} });
          if (typeof cb === 'function') queueMicrotask(() => cb());
          return Promise.resolve();
        }
      };
    }
    globalThis.chrome = {
      runtime: { id: 'altteuri-test' },
      storage: {
        sync: makeArea(syncStore),
        local: makeArea(localStore),
        onChanged: { addListener(fn) { listeners.push(fn); } }
      }
    };
  })();`;
}

async function install(page, scripts, settings) {
  await page.evaluateOnNewDocument(chromeMockSource(settings));
  await page.evaluateOnNewDocument(scripts.map((s) => s.source).join('\n;\n'));
}

async function probe(page) {
  return page.evaluate(() => {
    const list = document.querySelector('ul#product-list');
    const sortUl = document.querySelector('ul[class*="Sort_sort"]');
    const unit = document.querySelector('.unit-price-sort-btn');
    const pending = document.documentElement.classList.contains('alt-customs-pending');
    const unitOpacity = unit ? getComputedStyle(unit).opacity : null;
    return {
      title: document.title,
      items: list ? list.children.length : 0,
      unitBtn: !!unit,
      keyword: !!document.querySelector('[data-alt-keyword-filter]'),
      cart: !!document.querySelector('.alt-quick-cart-btn'),
      hasSortUl: !!sortUl,
      pending,
      unitOpacity,
      visibleCustom: !!(unit && !pending && getComputedStyle(unit).opacity !== '0'),
      body: (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 80)
    };
  });
}

async function timelineUntilCustom(page, maxMs = 10000) {
  const t0 = Date.now();
  const points = [];
  let firstItems = null;
  let firstDomCustom = null;
  let firstVisibleCustom = null;
  while (Date.now() - t0 < maxMs) {
    const p = await probe(page);
    const t = Date.now() - t0;
    if (p.items > 0 && firstItems == null) firstItems = t;
    if ((p.unitBtn || p.keyword || p.cart) && firstDomCustom == null) firstDomCustom = t;
    if (p.visibleCustom && firstVisibleCustom == null) firstVisibleCustom = t;
    if (
      points.length === 0 ||
      points[points.length - 1].visibleCustom !== p.visibleCustom ||
      points[points.length - 1].unitBtn !== p.unitBtn ||
      points[points.length - 1].pending !== p.pending
    ) {
      points.push({
        t,
        items: p.items,
        unitBtn: p.unitBtn,
        pending: p.pending,
        visibleCustom: p.visibleCustom
      });
    }
    if (firstVisibleCustom != null && t > firstVisibleCustom + 300) break;
    await sleep(50);
  }
  return {
    firstItemsMs: firstItems,
    firstDomCustomMs: firstDomCustom,
    firstVisibleCustomMs: firstVisibleCustom,
    afterItemsVisibleMs:
      firstItems != null && firstVisibleCustom != null ? firstVisibleCustom - firstItems : null,
    points
  };
}

async function run() {
  const scripts = loadScripts();
  const log = (row) => console.log(JSON.stringify(row));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check', '--lang=ko-KR']
  });

  try {
    const page = await browser.newPage();
    await install(page, scripts, SETTINGS);
    await page.goto('https://www.coupang.com/np/search?q=%EC%83%9D%EC%88%98&channel=user', {
      waitUntil: 'domcontentloaded'
    });

    const boot = await timelineUntilCustom(page, 12000);
    log({ step: 'boot_timing', ...boot, probe: await probe(page) });
    if (!boot.firstVisibleCustomMs && !boot.firstDomCustomMs) {
      log({ step: 'ABORT', reason: 'no custom / blocked', probe: await probe(page) });
      return;
    }

    // Count visibleCustom flips after first visible
    const watch = [];
    const tw = Date.now();
    while (Date.now() - tw < 2500) {
      const p = await probe(page);
      watch.push({ t: Date.now() - tw, visible: p.visibleCustom, pending: p.pending, unit: p.unitBtn });
      await sleep(80);
    }
    const visibleFlips = watch.filter((s, i, a) => i > 0 && s.visible !== a[i - 1].visible);
    log({ step: 'boot_visible_stability', visibleFlips, watch: watch.filter((_, i) => i % 4 === 0) });

    // Simulate Coupang replacing sort bar (SPA wipe)
    await page.evaluate(() => {
      const sortUl = document.querySelector('ul[class*="Sort_sort"]');
      if (!sortUl) return;
      const clone = sortUl.cloneNode(true);
      clone.querySelectorAll('.unit-price-sort-btn, .discount-rate-sort-btn, .price-sort-btn, .special-sort-separator').forEach((el) => el.remove());
      sortUl.replaceWith(clone);
      document.querySelectorAll('[data-alt-keyword-filter], [data-alt-keyword-tags-wrap], .alt-quick-cart-btn').forEach((el) => el.remove());
    });
    log({ step: 'after_simulated_spa_wipe', probe: await probe(page) });

    const recover = await timelineUntilCustom(page, 5000);
    log({ step: 'recover_after_wipe', ...recover, probe: await probe(page) });

    log({
      step: 'SUMMARY',
      bootVisibleAfterItemsMs: boot.afterItemsVisibleMs,
      bootDomAfterItemsMs:
        boot.firstItemsMs != null && boot.firstDomCustomMs != null
          ? boot.firstDomCustomMs - boot.firstItemsMs
          : null,
      visibleFlipsAfterShow: visibleFlips.length,
      recoverWipeOk: !!recover.firstVisibleCustomMs || !!recover.firstDomCustomMs
    });
  } finally {
    await browser.close().catch(() => {});
  }
}

run().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
