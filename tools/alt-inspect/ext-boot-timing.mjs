/**
 * Boot timing check after min-wait tuning.
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
  'preset-data.js', 'pure-logic.js', 'content/core.js', 'content/keyword-filter.js',
  'content/sort.js', 'content/list-size.js', 'content/quick-cart.js',
  'content/element-remover.js', 'content/boot.js'
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
    source: readFileSync(resolve(extensionPath, rel), 'utf8')
  }));
}

function chromeMock(settings) {
  return `(() => {
    const syncStore = ${JSON.stringify(SETTINGS)};
    const localStore = {};
    const listeners = [];
    function pick(store, keys) {
      if (keys == null) return { ...store };
      const list = Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of list) out[k] = store[k] !== undefined ? store[k] : undefined;
      return out;
    }
    function area(store) {
      return {
        get(keys, cb) { const r = pick(store, keys); queueMicrotask(() => cb && cb(r)); return Promise.resolve(r); },
        set(obj, cb) {
          const changes = {};
          for (const [k,v] of Object.entries(obj||{})) { changes[k]={oldValue:store[k],newValue:v}; store[k]=v; }
          listeners.forEach(fn => { try { fn(changes, 'sync'); } catch {} });
          queueMicrotask(() => cb && cb());
          return Promise.resolve();
        }
      };
    }
    globalThis.chrome = {
      runtime: { id: 'altteuri-test' },
      storage: { sync: area(syncStore), local: area(localStore), onChanged: { addListener(fn){ listeners.push(fn);} } }
    };
  })();`;
}

async function run() {
  const scripts = loadScripts();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check', '--lang=ko-KR']
  });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(chromeMock(SETTINGS));
    await page.evaluateOnNewDocument(scripts.map((s) => s.source).join('\n;\n'));
    await page.goto('https://www.coupang.com/np/search?q=%EC%83%9D%EC%88%98&channel=user', {
      waitUntil: 'domcontentloaded'
    });

    const t0 = Date.now();
    let firstItems = null;
    let firstCustom = null;
    const flips = [];
    let prev = null;
    while (Date.now() - t0 < 8000) {
      let p;
      try {
        p = await page.evaluate(() => {
          const list = document.querySelector('ul#product-list');
          const unit = document.querySelector('.unit-price-sort-btn');
          const pending = document.documentElement.classList.contains('alt-customs-pending');
          const customDom = !!(unit || document.querySelector('[data-alt-keyword-filter]'));
          const visible = !!(customDom && !pending && (!unit || getComputedStyle(unit).opacity !== '0'));
          return { items: list ? list.children.length : 0, customDom, visible, pending, title: document.title };
        });
      } catch {
        await sleep(200);
        continue;
      }
      const t = Date.now() - t0;
      if (p.items > 0 && firstItems == null) firstItems = t;
      if (p.visible && firstCustom == null) firstCustom = t;
      if (prev == null || prev.visible !== p.visible || prev.customDom !== p.customDom) {
        flips.push({ t, visible: p.visible, customDom: p.customDom, pending: p.pending, items: p.items });
      }
      prev = p;
      if (firstCustom != null && t > firstCustom + 1500) break;
      await sleep(50);
    }
    console.log(JSON.stringify({
      firstItemsMs: firstItems,
      firstVisibleMs: firstCustom,
      afterItemsMs: firstItems != null && firstCustom != null ? firstCustom - firstItems : null,
      flips,
      visibleFlipEvents: flips.filter((f, i, a) => i > 0 && f.visible !== a[i - 1].visible)
    }));
  } finally {
    await browser.close().catch(() => {});
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
