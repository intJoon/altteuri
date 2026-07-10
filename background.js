chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    addonEnabled: true,
    unitPriceSortEnabled: true,
    discountRateSortEnabled: true,
    priceSortEnabled: true,
    removeUnwantedContent: false,
    forceCoupangListSize: true,
    coupangListSize: '72'
  }, () => {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.url && tab.url.startsWith('https://www.coupang.com/')) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  });
}); 