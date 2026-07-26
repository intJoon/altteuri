import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const extension = resolve(repo, "extension");

test("onboarding banner uses Coupang contents shell, not sticky full-viewport bar", async () => {
  const source = await readFile(resolve(extension, "content/onboarding-banner.js"), "utf8");
  assert.doesNotMatch(source, /position:\s*sticky/);
  assert.match(source, /#contents/);
  assert.match(source, /alt-onboarding-inner/);
  assert.match(source, /srp_filterArea/);
  assert.match(source, /readLayoutMetrics/);
});

test("readLayoutMetrics derives padding from filter column and product list", () => {
  const contents = {
    getBoundingClientRect: () => ({ left: 100, right: 1124, width: 1024 }),
  };
  const filter = { getBoundingClientRect: () => ({ left: 116 }) };
  const list = { getBoundingClientRect: () => ({ right: 1100 }) };

  const context = vm.createContext({
    document: {
      querySelector(sel) {
        if (sel === "#contents") return contents;
        if (String(sel).includes("srp_filterArea")) return filter;
        if (sel === "ul#product-list") return list;
        return null;
      },
    },
    getComputedStyle(el) {
      if (el === contents) {
        return { maxWidth: "1024px", paddingLeft: "0px", paddingRight: "0px" };
      }
      return {};
    },
    Altteuri: { core: { SELECTORS: { productList: "ul#product-list" } } },
  });
  context.globalThis = context;

  const banner = readFile(resolve(extension, "content/onboarding-banner.js"), "utf8").then((source) => {
    vm.runInContext(source, context);
    const metrics = context.AltteuriOnboardingBanner.readLayoutMetrics();
    assert.equal(metrics.padLeft, 16);
    assert.equal(metrics.padRight, 24);
    assert.equal(metrics.maxWidth, "1024px");
  });

  return banner;
});
