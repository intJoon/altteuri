(() => {
const nav = globalThis.AltteuriPopupNav;
const settings = globalThis.AltteuriPopupSettings;
const feedback = globalThis.AltteuriPopupFeedback;
const presets = globalThis.AltteuriPopupPresets;
const R = globalThis.AltteuriRuntime;

function initPrivacyLinkHref() {
  const link = document.getElementById("feedback-privacy-link");
  if (link) link.href = R.getSiteOrigin() + "/legal.html#privacy";
}

nav.bindNavigation();
settings.bindSettings();
feedback.bindFeedback();
presets.bindPresets();
initPrivacyLinkHref();
settings.syncRemoveNav();
settings.updateToggleState(() => {
  nav.restorePopupPage((name) => {
    if (name !== "main") nav.showPage(name, { skipPersist: true });
  });
});
})();
