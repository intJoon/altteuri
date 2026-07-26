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
  assert.match(source, /에\s*대한\s*검색\s*결과/);
  assert.match(source, /insertBefore/);
  assert.match(source, /findSearchResultsHeading/);
});

test("findSearchResultsHeading locates Coupang-style title", async () => {
  const context = vm.createContext({
    document: {
      querySelector() { return null; },
      querySelectorAll(sel) {
        if (sel.includes("h1")) {
          return [{ textContent: "'사과'에 대한 검색결과" }];
        }
        return [];
      },
    },
  });
  context.globalThis = context;

  const settings = await readFile(resolve(extension, "settings-defaults.js"), "utf8");
  const runtime = await readFile(resolve(extension, "runtime-utils.js"), "utf8");
  const banner = await readFile(resolve(extension, "content/onboarding-banner.js"), "utf8");
  vm.runInContext(settings, context);
  vm.runInContext(runtime, context);
  vm.runInContext(banner, context);

  const heading = context.AltteuriOnboardingBanner.findSearchResultsHeading();
  assert.match(heading.textContent, /사과/);
});
