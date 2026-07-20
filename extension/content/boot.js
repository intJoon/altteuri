((A) => {
A.settings.bind();
A.remover.init();

A.listSize.setFromSettings(({ redirected }) => {
  if (redirected) return;
  A.page.observeProductList();
});
})(globalThis.Altteuri ||= {});
