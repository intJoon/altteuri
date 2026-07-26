(() => {
const R = globalThis.AltteuriRuntime;

const toggleUnitPriceSort = document.getElementById("toggle-unit-price-sort");
const toggleDiscountRateSort = document.getElementById("toggle-discount-rate-sort");
const togglePriceSort = document.getElementById("toggle-price-sort");
const toggleRemoveContent = document.getElementById("toggle-remove-content");
const forceListSizeToggle = document.getElementById("force-list-size");
const sizeControl = document.getElementById("size-control");
const sizeSeg = document.getElementById("size-seg");
const sizeChips = sizeSeg ? Array.from(sizeSeg.querySelectorAll(".size-chip")) : [];
const toggleKeywordFilter = document.getElementById("toggle-keyword-filter");
const pageDetail = document.getElementById("page-detail");

function syncSizeControl(force, size) {
  if (forceListSizeToggle) forceListSizeToggle.checked = !!force;
  if (sizeControl) sizeControl.classList.toggle("on", !!force);
  const s = String(size || "72");
  sizeChips.forEach((c) => c.classList.toggle("active", c.dataset.size === s));
}

function applyFeatureControls(result) {
  toggleUnitPriceSort.checked = !!result.unitPriceSortEnabled;
  toggleDiscountRateSort.checked = !!result.discountRateSortEnabled;
  togglePriceSort.checked = !!result.priceSortEnabled;
  toggleRemoveContent.checked = !!result.elementRemoverEnabled;
  syncRemoveBody();
  syncSizeControl(!!result.forceCoupangListSize, result.coupangListSize || "72");
  if (toggleKeywordFilter) toggleKeywordFilter.checked = !!result.keywordFilterEnabled;
}

function syncRemoveBody() {
  const on = !!(toggleRemoveContent && toggleRemoveContent.checked);
  const body = document.getElementById("remove-body");
  if (body) body.style.display = on ? "" : "none";
  const nav = globalThis.AltteuriPopupNav;
  if (pageDetail && !pageDetail.hidden && nav) {
    const lock = nav.getDetailHeightLock();
    pageDetail.style.height = on && lock ? lock + "px" : "";
  }
}

function updateToggleState(done) {
  R.syncGet(
    [
      "unitPriceSortEnabled",
      "discountRateSortEnabled",
      "priceSortEnabled",
      "elementRemoverEnabled",
      "forceCoupangListSize",
      "coupangListSize",
      "keywordFilterEnabled",
    ],
    (result) => {
      applyFeatureControls(result || {});
      if (typeof done === "function") done();
    }
  );
}

function readSelectedListSize(fallback) {
  const active = sizeChips.find((c) => c.classList.contains("active"));
  if (active && active.dataset.size) return String(active.dataset.size);
  return String(fallback || "72");
}

function applyListSize(force, size) {
  const data = force
    ? { forceCoupangListSize: true, coupangListSize: String(size || "72") }
    : { forceCoupangListSize: false };
  R.syncSet(data);
}

function syncRemoveNav() {
  const detail = document.getElementById("remove-detail");
  if (!detail) return;
  R.syncGet(["elementRemoverEnabled"], (r) => {
    detail.textContent = r.elementRemoverEnabled ? "켜짐" : "꺼짐";
  });
}

function bindSettings() {
  toggleUnitPriceSort.addEventListener("change", () => {
    R.syncSet({ unitPriceSortEnabled: toggleUnitPriceSort.checked });
  });
  toggleDiscountRateSort.addEventListener("change", () => {
    R.syncSet({ discountRateSortEnabled: toggleDiscountRateSort.checked });
  });
  togglePriceSort.addEventListener("change", () => {
    R.syncSet({ priceSortEnabled: togglePriceSort.checked });
  });
  toggleRemoveContent.addEventListener("change", () => {
    const removeContent = toggleRemoveContent.checked;
    R.syncSet({ elementRemoverEnabled: removeContent }, () => {
      syncRemoveBody();
      syncRemoveNav();
    });
  });
  if (toggleKeywordFilter) {
    toggleKeywordFilter.addEventListener("change", () => {
      R.syncSet({ keywordFilterEnabled: toggleKeywordFilter.checked });
    });
  }
  if (forceListSizeToggle) {
    forceListSizeToggle.addEventListener("change", () => {
      const on = forceListSizeToggle.checked;
      R.syncGet(["coupangListSize"], (result) => {
        const kept = String(result.coupangListSize || readSelectedListSize("72"));
        if (on) {
          syncSizeControl(true, kept);
          applyListSize(true, kept);
        } else {
          syncSizeControl(false, kept);
          applyListSize(false);
        }
      });
    });
  }
  sizeChips.forEach((c) =>
    c.addEventListener("click", (e) => {
      const size = e.currentTarget.dataset.size;
      syncSizeControl(true, size);
      applyListSize(true, size);
    })
  );
}

globalThis.AltteuriPopupSettings = Object.freeze({
  bindSettings,
  updateToggleState,
  syncRemoveBody,
  syncRemoveNav,
});
})();
