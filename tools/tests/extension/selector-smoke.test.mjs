import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const extension = resolve(repo, "apps/extension");
const manifest = JSON.parse(await readFile(resolve(extension, "manifest.json"), "utf8"));

test("selectors module exposes Coupang DOM constants", async () => {
  const source = await readFile(resolve(extension, "content/selectors.js"), "utf8");
  assert.match(source, /productList/);
  assert.match(source, /productItem/);
});

test("core selectors keep fallback patterns for Coupang CSS module drift", async () => {
  const core = await readFile(resolve(extension, "content/core.js"), "utf8");
  assert.match(core, /getProductNameEl/);
  assert.match(core, /UNIT_PRICE_RE/);
  assert.match(core, /findUnitPriceText/);
});

test("preset selectors document :has usage for ad cards", async () => {
  const preset = await readFile(resolve(extension, "lib/preset-data.js"), "utf8");
  assert.match(preset, /:has\(button\[aria-label='Ad information'\]\)/);
});

test("manifest minimum Chrome version covers :has selector support", () => {
  assert.equal(Number(manifest.minimum_chrome_version), 105);
});

test("alt-inspect idle script order matches manifest", async () => {
  const { IDLE_SCRIPTS } = await import("../../inspect/alt-inspect/chrome-path.mjs");
  assert.deepEqual(IDLE_SCRIPTS, manifest.content_scripts[1].js);
});
