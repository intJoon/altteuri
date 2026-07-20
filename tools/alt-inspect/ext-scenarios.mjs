/**
 * Inject Altteuri content scripts into Coupang pages with a chrome.* mock.
 * Measures custom UI timing without relying on --load-extension (often blocked in automation).
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

const DEFAULT_SETTINGS = {
  unitPriceSortEnabled: true,
  discountRateSortEnabled: true,
  priceSortEnabled: true,
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
        },
        remove(keys, cb) {
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach(k => { delete store[k]; });
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
        onChanged: {
          addListener(fn) { listeners.push(fn); },
          removeListener(fn) {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
          }
        }
      }
    };
    globalThis.__ALT_TEST_SYNC__ = syncStore;
  })();`;
}

async function installOnPage(page, scripts, settings) {
  await page.evaluateOnNewDocument(chromeMockSource(settings));
  await page.evaluateOnNewDocument(scripts.map((s) => s.source).join('\n;\n'));
}

async function ensureInjected(page, scripts, settings) {
  const has = await page.evaluate(() => !!globalThis.Altteuri && !!globalThis.chrome?.runtime?.id);
  if (has) return { injected: false };
  await page.evaluate(chromeMockSource(settings));
  for (const s of scripts) {
    await page.evaluate(s.source);
  }
  return { injected: true };
}

function probeExpr() {
  return `(() => {
    const list = document.querySelector('ul#product-list');
    const sortUl = document.querySelector('ul[class*="Sort_sort"]');
    const itemCount = list
      ? (list.querySelectorAll('li[class*="ProductUnit_productUnit"]').length || list.children.length)
      : 0;
    const bodyText = (document.body && document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 160);
    return {
      title: document.title,
      href: location.href.slice(0, 140),
      q: new URL(location.href).searchParams.get('q'),
      listSize: new URL(location.href).searchParams.get('listSize'),
      items: itemCount,
      hasSortUl: !!sortUl,
      unitBtn: !!document.querySelector('.unit-price-sort-btn'),
      discountBtn: !!document.querySelector('.discount-rate-sort-btn'),
      priceBtn: !!document.querySelector('.price-sort-btn'),
      keyword: !!document.querySelector('[data-alt-keyword-filter]'),
      cart: !!document.querySelector('.alt-quick-cart-btn'),
      altteuri: typeof globalThis.Altteuri !== 'undefined',
      hasSchedule: !!(globalThis.Altteuri && globalThis.Altteuri.page && globalThis.Altteuri.page.schedulePageApply),
      bodyText
    };
  })()`;
}

async function probe(page) {
  try {
    return await page.evaluate(probeExpr());
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

async function waitFor(page, pred, timeoutMs = 20000, everyMs = 120) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    last = await probe(page);
    if (last && last.bodyText && /점검 중|access denied|captcha|로봇/i.test(last.bodyText)) {
      return { ok: false, ms: Date.now() - t0, last, blocked: true };
    }
    if (pred(last)) return { ok: true, ms: Date.now() - t0, last };
    await sleep(everyMs);
  }
  return { ok: false, ms: Date.now() - t0, last };
}

const hasItems = (p) => p && !p.error && p.items > 0;
const hasCustom = (p) =>
  p && !p.error && p.items > 0 && (p.unitBtn || p.discountBtn || p.priceBtn || p.keyword || p.cart);

async function runScenario(page, scripts, settings, name, navigateFn) {
  const t0 = Date.now();
  await navigateFn();
  // SPA navigations may drop evaluateOnNewDocument world — re-inject if needed
  await sleep(400);
  const inj = await ensureInjected(page, scripts, settings);
  const items = await waitFor(page, hasItems, 12000);
  const custom = items.ok ? await waitFor(page, hasCustom, 12000) : { ok: false, ms: 0, last: items.last, blocked: items.blocked };
  return {
    step: name,
    reInjected: inj.injected,
    blocked: !!(items.blocked || custom.blocked),
    navMs: Date.now() - t0,
    itemsMs: items.ms,
    itemsOk: items.ok,
    customMs: custom.ms,
    customOk: custom.ok,
    afterItemsMs: items.ok && custom.ok ? Math.max(0, custom.ms - items.ms) : null,
    probe: custom.last || items.last
  };
}

async function watchDoubleAttach(page, ms = 4500) {
  const t0 = Date.now();
  let sawPresent = false;
  let sawGone = false;
  let sawBack = false;
  const samples = [];
  while (Date.now() - t0 < ms) {
    const p = await probe(page);
    const present = !!(p.unitBtn || p.keyword || p.cart);
    samples.push({ t: Date.now() - t0, present, items: p.items });
    if (present) {
      if (sawGone) sawBack = true;
      sawPresent = true;
    } else if (sawPresent) {
      sawGone = true;
    }
    await sleep(100);
  }
  return {
    step: 'watch_double_attach',
    sawPresent,
    sawGone,
    sawBack,
    doubleAttachSuspect: sawGone && sawBack,
    flips: samples.filter((s, i, a) => i === 0 || s.present !== a[i - 1].present)
  };
}

async function run() {
  const scripts = loadScripts();
  const results = [];
  const log = (row) => {
    results.push(row);
    console.log(JSON.stringify(row));
  };

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check', '--lang=ko-KR', '--disable-popup-blocking']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    await installOnPage(page, scripts, DEFAULT_SETTINGS);

    log(
      await runScenario(page, scripts, DEFAULT_SETTINGS, 'A_full_nav_search', async () => {
        await page.goto('https://www.coupang.com/np/search?q=%EC%83%9D%EC%88%98&channel=user', {
          waitUntil: 'domcontentloaded'
        });
      })
    );

    // Slower pacing to reduce Coupang bot interstitial between scenarios
    await sleep(3000);

    log(
      await runScenario(page, scripts, DEFAULT_SETTINGS, 'B_second_search', async () => {
        await page.goto('https://www.coupang.com/np/search?q=%EC%B9%98%EC%95%BD&channel=user', {
          waitUntil: 'domcontentloaded'
        });
      })
    );
    if (results[results.length - 1].customOk) {
      log(await watchDoubleAttach(page));
    } else {
      log({ step: 'watch_double_attach', skipped: true, reason: 'B failed', probe: results[results.length - 1].probe });
    }

    await sleep(3000);

    log(
      await runScenario(page, scripts, DEFAULT_SETTINGS, 'C_reload', async () => {
        await page.reload({ waitUntil: 'domcontentloaded' });
      })
    );

    await sleep(3000);

    // Home then search: new document — evaluateOnNewDocument should apply
    log(
      await runScenario(page, scripts, DEFAULT_SETTINGS, 'D_home_then_search', async () => {
        await page.goto('https://www.coupang.com/', { waitUntil: 'domcontentloaded' });
        await sleep(1200);
        await page.goto('https://www.coupang.com/np/search?q=%EC%83%B4%ED%91%B8&channel=user', {
          waitUntil: 'domcontentloaded'
        });
      })
    );

    // Force list size
    const forceSettings = { ...DEFAULT_SETTINGS, forceCoupangListSize: true, coupangListSize: '72' };
    await installOnPage(page, scripts, forceSettings);
    log(
      await runScenario(page, scripts, forceSettings, 'E_force_listSize_72', async () => {
        await page.goto('https://www.coupang.com/np/search?q=%EB%AC%BC&channel=user', {
          waitUntil: 'domcontentloaded'
        });
        await sleep(2000);
      })
    );

    // Long dwell: stay on page and check customs still present
    const dwell = [];
    for (let i = 0; i < 8; i++) {
      await sleep(1000);
      dwell.push(await probe(page));
    }
    log({
      step: 'F_dwell_8s',
      stillCustom: dwell.map((p) => !!(p.unitBtn || p.keyword || p.cart)),
      listSizes: dwell.map((p) => p.listSize),
      last: dwell[dwell.length - 1]
    });

    const summary = {
      step: 'SUMMARY',
      A_afterItemsMs: results.find((r) => r.step === 'A_full_nav_search')?.afterItemsMs,
      B_afterItemsMs: results.find((r) => r.step === 'B_second_search')?.afterItemsMs,
      B_double: results.find((r) => r.step === 'watch_double_attach')?.doubleAttachSuspect,
      C_afterItemsMs: results.find((r) => r.step === 'C_reload')?.afterItemsMs,
      D_afterItemsMs: results.find((r) => r.step === 'D_home_then_search')?.afterItemsMs,
      E_listSize: results.find((r) => r.step === 'E_force_listSize_72')?.probe?.listSize,
      E_customOk: results.find((r) => r.step === 'E_force_listSize_72')?.customOk,
      F_allPresent: results.find((r) => r.step === 'F_dwell_8s')?.stillCustom?.every(Boolean)
    };
    log(summary);
  } finally {
    await browser.close().catch(() => {});
  }
}

run().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
