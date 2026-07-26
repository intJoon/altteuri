import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const extension = resolve(repo, "extension");

test("onboarding banner targets search-results heading, not full-page sticky bar", async () => {
  const source = await readFile(resolve(extension, "content/onboarding-banner.js"), "utf8");
  assert.doesNotMatch(source, /position:\s*sticky/);
  assert.match(source, /HEADING_RE.*검색/);
  assert.match(source, /findMainResultsScope/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /ensureBannerVisible/);
  assert.doesNotMatch(source, /querySelectorAll\('\[class\*="title"\]'/);
});

test("findSearchResultsHeading locates Coupang-style title in results column", async () => {
  const heading = { textContent: "'사과'에 대한 검색결과", isConnected: true };
  const scope = {
    querySelectorAll(sel) {
      return sel === "h1, h2, h3" ? [heading] : [];
    },
    contains() { return true; },
  };
  const list = {
    closest() { return scope; },
    parentElement: { parentElement: scope },
  };
  const context = vm.createContext({
    document: {
      querySelector(sel) {
        if (sel.includes("product-list")) return list;
        return null;
      },
      querySelectorAll() { return []; },
    },
    Altteuri: { core: { SELECTORS: { productList: "ul#product-list" } } },
  });
  context.globalThis = context;

  const settings = await readFile(resolve(extension, "settings-defaults.js"), "utf8");
  const runtime = await readFile(resolve(extension, "runtime-utils.js"), "utf8");
  const banner = await readFile(resolve(extension, "content/onboarding-banner.js"), "utf8");
  vm.runInContext(settings, context);
  vm.runInContext(runtime, context);
  vm.runInContext(banner, context);

  const found = context.AltteuriOnboardingBanner.findSearchResultsHeading();
  assert.equal(found, heading);
});
