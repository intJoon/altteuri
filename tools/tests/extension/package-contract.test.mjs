import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const extension = resolve(repo, 'extension');
const manifest = JSON.parse(await readFile(resolve(extension, 'manifest.json'), 'utf8'));

const expectedEarlyOrder = ['preset-data.js', 'content/shared-start.js', 'content/early.js'];
const expectedIdleOrder = [
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

test('manifest content scripts have the dependency-safe order', () => {
  assert.equal(manifest.content_scripts.length, 2);
  assert.equal(manifest.content_scripts[0].run_at, 'document_start');
  assert.equal(manifest.content_scripts[1].run_at, 'document_idle');
  assert.deepEqual(manifest.content_scripts[0].js, expectedEarlyOrder);
  assert.deepEqual(manifest.content_scripts[1].js, expectedIdleOrder);
});

test('all manifest package references exist', () => {
  const references = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons),
    ...manifest.content_scripts.flatMap(entry => entry.js)
  ];
  references.forEach(reference => {
    assert.equal(existsSync(resolve(extension, reference)), true, `missing ${reference}`);
  });
});

test('popup loads local CSS and shared settings before popup code', async () => {
  const html = await readFile(resolve(extension, 'popup.html'), 'utf8');
  assert.match(html, /href="popup\.css"/);
  assert.ok(html.indexOf('settings-defaults.js') < html.indexOf('popup.js'));
  assert.doesNotMatch(html, /<style(?:\s|>)/);
  const localAssets = [
    ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
    ...html.matchAll(/<link[^>]+href="([^"]+)"/g)
  ].map(match => match[1]).filter(reference => !reference.includes('://'));
  localAssets.forEach(reference => {
    assert.equal(existsSync(resolve(extension, reference)), true, `missing popup asset ${reference}`);
  });
});

test('MAIN-world cart hook remains a separate injected file', async () => {
  const background = await readFile(resolve(extension, 'background.js'), 'utf8');
  assert.match(background, /world:\s*'MAIN'/);
  assert.match(background, /files:\s*\['page-cart-hook\.js'\]/);
  assert.ok(background.indexOf("settings-defaults.js") < background.indexOf("preset-data.js"));
});

test('ordered feature scripts register only through the shared namespace', async () => {
  const context = vm.createContext({ console, URL, URLSearchParams, setTimeout, clearTimeout });
  for (const reference of expectedIdleOrder.slice(0, -1)) {
    const source = await readFile(resolve(extension, reference), 'utf8');
    vm.runInContext(source, context, { filename: reference });
  }
  assert.ok(Array.isArray(context.ALT_BUILTIN_PRESET.items));
  assert.ok(context.ALT_BUILTIN_PRESET.items.length > 0);
  assert.ok(context.AltteuriShared);
  assert.deepEqual(
    Object.keys(context.Altteuri).sort(),
    ['core', 'keyword', 'listSize', 'page', 'pure', 'quickCart', 'remover', 'settings', 'sort']
  );
  const requiredMethods = {
    core: ['isSortVisibleItem', 'getProductImageBox'],
    keyword: ['addFeature', 'applyFilter', 'getSearchQueryKey', 'handleEnabledChange'],
    listSize: ['setFromSettings', 'syncListSizeRadio', 'redirectOnce', 'urlMatches'],
    page: ['observeProductList', 'schedulePageApply', 'applySubFeatures', 'whenReady'],
    quickCart: ['applyButtons'],
    remover: ['init', 'isItemHidden', 'applyHiddenElements'],
    settings: ['bind'],
    sort: ['addButtons', 'restoreAll', 'handleFeatureToggle', 'runSort', 'runSortWithOrder', 'reapplySortIfNeeded']
  };
  Object.entries(requiredMethods).forEach(([moduleName, methods]) => {
    methods.forEach(method => {
      assert.equal(
        typeof context.Altteuri[moduleName][method],
        'function',
        `missing Altteuri.${moduleName}.${method}`
      );
    });
  });
});

test('feature modules do not register their own storage.onChanged listeners', async () => {
  const files = [
    'content/list-size.js',
    'content/quick-cart.js',
    'content/element-remover.js',
    'content/keyword-filter.js',
    'content/sort.js',
    'content/page-runtime.js'
  ];
  for (const reference of files) {
    const source = await readFile(resolve(extension, reference), 'utf8');
    assert.doesNotMatch(
      source,
      /storage\.onChanged\.addListener/,
      `${reference} must not register storage.onChanged`
    );
  }
  const bridge = await readFile(resolve(extension, 'content/settings-bridge.js'), 'utf8');
  assert.match(bridge, /storage\.onChanged\.addListener/);
});

test('boot invokes feature initialization through the documented contract', async () => {
  const calls = [];
  const context = vm.createContext({});
  context.globalThis = context;
  context.Altteuri = {
    settings: {
      bind() { calls.push('settings.bind'); }
    },
    listSize: {
      setFromSettings(callback) {
        calls.push('listSize.setFromSettings');
        callback({ redirected: false, blocked: false });
      }
    },
    remover: { init() { calls.push('remover.init'); } },
    page: {
      observeProductList() { calls.push('page.observeProductList'); }
    }
  };

  const source = await readFile(resolve(extension, 'content/boot.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'content/boot.js' });

  assert.deepEqual(calls, [
    'settings.bind',
    'remover.init',
    'listSize.setFromSettings',
    'page.observeProductList'
  ]);
});

test('boot skips observers when listSize redirects', async () => {
  const calls = [];
  const context = vm.createContext({});
  context.globalThis = context;
  context.Altteuri = {
    settings: { bind() { calls.push('settings.bind'); } },
    listSize: {
      setFromSettings(callback) {
        calls.push('listSize.setFromSettings');
        callback({ redirected: true, blocked: false });
      }
    },
    remover: { init() { calls.push('remover.init'); } },
    page: { observeProductList() { calls.push('page.observeProductList'); } }
  };

  const source = await readFile(resolve(extension, 'content/boot.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'content/boot.js' });

  assert.deepEqual(calls, [
    'settings.bind',
    'remover.init',
    'listSize.setFromSettings'
  ]);
});

test('listSize setFromSettings reports redirect via callback', async () => {
  const context = vm.createContext({
    location: {
      href: 'https://www.coupang.com/np/search?q=milk',
      pathname: '/np/search',
      search: '?q=milk',
      replace() {}
    },
    URL,
    URLSearchParams,
    sessionStorage: {
      store: Object.create(null),
      getItem(k) { return this.store[k] || null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; }
    },
    chrome: {
      storage: {
        sync: {
          get(_keys, callback) {
            callback({ forceCoupangListSize: true, coupangListSize: '72' });
          },
          onChanged: { addListener() {} }
        }
      },
      runtime: { id: 'test' }
    }
  });
  context.globalThis = context;
  context.Altteuri = { core: { SELECTORS: { listSizeSelectedClass: 'ListSizeOption_selected__Ym5KI' } } };
  const shared = await readFile(resolve(extension, 'content/shared-start.js'), 'utf8');
  vm.runInContext(shared, context, { filename: 'content/shared-start.js' });
  const source = await readFile(resolve(extension, 'content/list-size.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'content/list-size.js' });

  let result = null;
  context.Altteuri.listSize.setFromSettings(info => { result = info; });
  assert.equal(result.redirected, true);
  assert.equal(result.blocked, false);
});

test('shared-start redirect and hide CSS are single-sourced', async () => {
  const context = vm.createContext({
    location: {
      href: 'https://www.coupang.com/np/search?q=a',
      pathname: '/np/search',
      replace(url) { this.href = url; }
    },
    URL,
    URLSearchParams,
    sessionStorage: {
      store: Object.create(null),
      getItem(k) { return this.store[k] || null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; }
    },
    document: {
      getElementById() { return null; },
      createElement() {
        return { id: '', textContent: '' };
      },
      documentElement: { appendChild() {} }
    }
  });
  context.globalThis = context;
  const source = await readFile(resolve(extension, 'content/shared-start.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'content/shared-start.js' });
  const S = context.AltteuriShared;
  assert.equal(
    S.buildRemoverHideCss(true, ['#a'], [{ selector: '#a' }, { selector: '#b' }]),
    '#a{display:none!important;}'
  );
  assert.equal(S.buildRemoverHideCss(false, ['#a'], [{ selector: '#a' }]), '');
  assert.equal(S.redirectListSizeOnce('72'), true);
  assert.match(context.location.href, /listSize=72/);
});

test('shared settings cover every feature toggle', async () => {
  const context = vm.createContext({});
  const source = await readFile(resolve(extension, 'settings-defaults.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'settings-defaults.js' });
  const settings = context.AltteuriSettings;

  assert.equal(settings.SETTINGS_VERSION, 4);
  assert.equal(settings.DEFAULT_SETTINGS.settingsVersion, settings.SETTINGS_VERSION);
  settings.FEATURE_TOGGLE_KEYS.forEach(key => {
    assert.equal(settings.DEFAULT_SETTINGS[key], false, `default for ${key} must be false`);
  });
  assert.equal(Object.isFrozen(settings.DEFAULT_SETTINGS), true);
  assert.equal(Object.isFrozen(settings.DEFAULT_SETTINGS.altPresetOff), true);
});

test('legacy settingsVersion labels remap to contiguous 1–4', async () => {
  const context = vm.createContext({});
  const source = await readFile(resolve(extension, 'settings-defaults.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'settings-defaults.js' });
  const { canonicalSettingsVersion, needsSettingsMigration, SETTINGS_VERSION } = context.AltteuriSettings;

  assert.equal(canonicalSettingsVersion(6), 1);
  assert.equal(canonicalSettingsVersion(8), 2);
  assert.equal(canonicalSettingsVersion(9), 3);
  assert.equal(canonicalSettingsVersion(10), 4);
  assert.equal(canonicalSettingsVersion(4), 4);
  assert.equal(canonicalSettingsVersion(0), 0);

  assert.equal(needsSettingsMigration(10), true);
  assert.equal(needsSettingsMigration(4), false);
  assert.equal(needsSettingsMigration(2), true);
  assert.equal(SETTINGS_VERSION, 4);
});
