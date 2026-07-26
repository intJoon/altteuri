(() => {
const R = globalThis.AltteuriRuntime;

const presetListEl = document.getElementById("preset-list");
const presetSearchEl = document.getElementById("preset-search");
let presetQuery = "";

const ALT_GROUPS = [
  { id: "srp", name: "검색 결과 페이지" },
  { id: "pdp", name: "상품 상세 페이지" },
  { id: "cart", name: "장바구니 페이지" },
  { id: "order", name: "주문목록 페이지" },
  { id: "etc", name: "기타" },
];

function presetMatch(name, q) {
  const HS = window.HangulSearch || null;
  if (HS) return HS.match(name, q);
  return (name || "").toLowerCase().includes(q);
}

function getPresetItems() {
  const p = window.ALT_BUILTIN_PRESET || null;
  return p && Array.isArray(p.items) ? p.items.filter((it) => it && it.selector) : [];
}

function setPresetItemOff(selector, isOff) {
  R.syncGet(["altPresetOff"], (result) => {
    const off = new Set(result.altPresetOff || []);
    if (isOff) off.add(selector);
    else off.delete(selector);
    R.syncSet({ altPresetOff: Array.from(off) }, () => {
      if (globalThis.AltteuriPopupSettings) globalThis.AltteuriPopupSettings.syncRemoveNav();
    });
  });
}

function clearSearch() {
  presetQuery = "";
  if (presetSearchEl) presetSearchEl.value = "";
  renderPresetList();
}

function renderPresetList() {
  if (!presetListEl) return;
  const items = getPresetItems();
  R.syncGet(["altPresetOff"], (result) => {
    const off = new Set(result.altPresetOff || []);
    presetListEl.replaceChildren();
    const q = presetQuery;
    const filtered = q ? items.filter((it) => presetMatch(it.name || it.selector || "", q)) : items;
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "preset-empty";
      empty.textContent = q ? "검색 결과가 없습니다" : "기본 프리셋이 비어 있습니다";
      presetListEl.appendChild(empty);
      return;
    }
    const byGroup = {};
    filtered.forEach((it) => {
      const gid = it.category || "etc";
      (byGroup[gid] = byGroup[gid] || []).push(it);
    });
    ALT_GROUPS.forEach((g) => {
      const list = byGroup[g.id];
      if (!list || !list.length) return;
      list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

      const head = document.createElement("div");
      head.className = "preset-head";
      head.textContent = g.name;
      presetListEl.appendChild(head);

      const card = document.createElement("div");
      card.className = "section";
      list.forEach((it) => {
        const shown = !off.has(it.selector);
        const row = document.createElement("div");
        row.className = "preset-row";
        const label = document.createElement("span");
        label.className = "preset-item-label";
        label.textContent = it.name || it.selector;
        label.title = it.selector;
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "cbox";
        cb.checked = shown;
        cb.setAttribute("aria-label", it.name || it.selector);
        cb.addEventListener("change", () => setPresetItemOff(it.selector, !cb.checked));
        row.addEventListener("click", (e) => {
          if (e.target === cb) return;
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event("change"));
        });
        row.appendChild(label);
        row.appendChild(cb);
        card.appendChild(row);
      });
      presetListEl.appendChild(card);
    });
  });
}

function bindPresets() {
  if (presetSearchEl) {
    presetSearchEl.addEventListener("input", () => {
      presetQuery = presetSearchEl.value.trim().toLowerCase();
      renderPresetList();
    });
  }
  renderPresetList();
}

globalThis.AltteuriPopupPresets = Object.freeze({
  bindPresets,
  clearSearch,
  renderPresetList,
});
})();
