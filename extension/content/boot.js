((A) => {
// Always bind settings and apply display presets. Search-only work (sort, keyword UI,
// list reconcile) starts inside page-runtime when the URL is /np/search.
A.settings.bind();
A.remover.init();

A.listSize.setFromSettings(({ redirected }) => {
  if (redirected) return;
  A.page.observeProductList();
});
globalThis.AltteuriOnboardingBanner?.init();
})(globalThis.Altteuri ||= {});
