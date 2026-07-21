importScripts('settings-defaults.js', 'preset-data.js');

const { SETTINGS_VERSION, DEFAULT_SETTINGS, FEATURE_TOGGLE_KEYS } = globalThis.AltteuriSettings;

const ICON_ACTIVE = Object.freeze({
  16: 'icon16.png',
  32: 'icon32.png',
  48: 'icon48.png'
});
const ICON_INACTIVE = Object.freeze({
  16: 'icon16-gray.png',
  32: 'icon32-gray.png',
  48: 'icon48-gray.png'
});

function isAnyFeatureEnabled(stored) {
  const data = stored || {};
  return FEATURE_TOGGLE_KEYS.some(key => !!data[key]);
}

function updateActionIcon(stored) {
  try {
    chrome.action.setIcon({
      path: isAnyFeatureEnabled(stored) ? ICON_ACTIVE : ICON_INACTIVE
    });
  } catch (e) {}
}

function refreshActionIcon() {
  chrome.storage.sync.get(FEATURE_TOGGLE_KEYS, stored => {
    updateActionIcon(stored || {});
  });
}

function mergeWithDefaults(stored) {
  return { ...DEFAULT_SETTINGS, ...stored, settingsVersion: SETTINGS_VERSION };
}

function getBuiltinPresetSelectors() {
  const preset = globalThis.ALT_BUILTIN_PRESET || null;
  const items = preset && Array.isArray(preset.items) ? preset.items : [];
  return items.filter(it => it && it.selector).map(it => it.selector);
}

function migratePresetOffMeaning(data, fromVersion) {
  // check=show already: legacy labels 9+, or brief 2.2.2 contiguous labels 3–4
  if (fromVersion >= 9 || fromVersion === 3 || fromVersion === 4) return data;
  const next = { ...data };
  const oldShow = new Set(next.altPresetOff || []);
  if (next.elementRemoverEnabled) {
    const all = getBuiltinPresetSelectors();
    next.altPresetOff = all.filter(sel => !oldShow.has(sel));
  } else {
    next.altPresetOff = [];
  }
  return next;
}


function reloadCoupangTabs() {
  chrome.tabs.query({
    url: [
      'https://www.coupang.com/*',
      'https://cart.coupang.com/*',
      'https://mc.coupang.com/*'
    ]
  }, tabs => {
    tabs.forEach(tab => chrome.tabs.reload(tab.id));
  });
}

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    try { chrome.tabs.create({ url: chrome.runtime.getURL('legal.html') }); } catch (e) {}
  }

  chrome.storage.sync.get(null, stored => {
    const data = stored || {};
    const hasAnySettings = data.settingsVersion !== undefined
      || FEATURE_TOGGLE_KEYS.some(key => data[key] !== undefined);

    if (!hasAnySettings) {
      chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
        updateActionIcon(DEFAULT_SETTINGS);
        reloadCoupangTabs();
      });
      return;
    }

    const currentVersion = data.settingsVersion ?? 0;
    if (currentVersion < SETTINGS_VERSION) {
      const migrated = migratePresetOffMeaning(data, currentVersion);
      const next = mergeWithDefaults(migrated);
      delete next.altEnabled;
      delete next.lastPreset;
      chrome.storage.sync.set(next, () => {
        updateActionIcon(next);
        reloadCoupangTabs();
      });
      return;
    }

    updateActionIcon(data);
  });
});

chrome.runtime.onStartup.addListener(refreshActionIcon);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (FEATURE_TOGGLE_KEYS.some(key => changes[key])) refreshActionIcon();
});
refreshActionIcon();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'alt-main') return;
  const tabId = sender.tab && sender.tab.id;
  const frameId = msg.frameId;
  if (tabId == null || frameId == null || msg.action !== 'install') {
    sendResponse({ ok: false, error: 'bad_args' });
    return;
  }
  chrome.scripting
    .executeScript({
      target: { tabId, frameIds: [frameId] },
      world: 'MAIN',
      files: ['page-cart-hook.js']
    })
    .then(() => sendResponse({ ok: true }))
    .catch((e) => sendResponse({ ok: false, error: String(e && e.message ? e.message : e) }));
  return true;
});
