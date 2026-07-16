const SETTINGS_VERSION = 6;

const DEFAULT_SETTINGS = {
  settingsVersion: SETTINGS_VERSION,
  addonEnabled: true,
  unitPriceSortEnabled: true,
  discountRateSortEnabled: true,
  priceSortEnabled: true,
  elementRemoverEnabled: true,
  craPresetOff: [],
  forceCoupangListSize: true,
  coupangListSize: '72',
  keywordFilterEnabled: true,
  quickCartEnabled: true
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
    const hasAnySettings = data.settingsVersion !== undefined || data.addonEnabled !== undefined;

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
