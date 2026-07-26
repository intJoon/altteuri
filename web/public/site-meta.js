/** Populate footer version from /version.json (generated from manifest). */
fetch("/version.json", { cache: "no-store" })
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => {
    if (!data?.version) return;
    const el = document.getElementById("site-version");
    if (el) el.textContent = `v${data.version}`;
  })
  .catch(() => {});
