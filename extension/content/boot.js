((A) => {
A.listSize.initSync();
A.quickCart.initSync();
A.remover.init();

A.listSize.setFromSettings(({ redirected }) => {
  if (redirected) return;
  A.sort.observeProductList();
});
})(globalThis.Altteuri ||= {});
