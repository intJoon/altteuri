const SETTINGS_VERSION = 8;

const DEFAULT_SETTINGS = {
  settingsVersion: SETTINGS_VERSION,
  altEnabled: false,
  unitPriceSortEnabled: false,
  discountRateSortEnabled: false,
  priceSortEnabled: false,
  elementRemoverEnabled: false,
  altPresetOff: [],
  forceCoupangListSize: false,
  coupangListSize: '72',
  keywordFilterEnabled: false,
  quickCartEnabled: false
};

function mergeWithDefaults(stored) {
  return { ...DEFAULT_SETTINGS, ...stored, settingsVersion: SETTINGS_VERSION };
}

function reloadCoupangTabs() {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (tab.url && tab.url.startsWith('https://www.coupang.com/')) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    try { chrome.tabs.create({ url: chrome.runtime.getURL('legal.html') }); } catch (e) {}
  }

  chrome.storage.sync.get(null, stored => {
    const data = stored || {};
    const hasAnySettings = data.settingsVersion !== undefined || data.altEnabled !== undefined;

    if (!hasAnySettings) {
      chrome.storage.sync.set(DEFAULT_SETTINGS, reloadCoupangTabs);
      return;
    }

    const currentVersion = data.settingsVersion ?? 0;
    if (currentVersion < SETTINGS_VERSION) {
      chrome.storage.sync.set(mergeWithDefaults(data));
    }
  });
});

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
