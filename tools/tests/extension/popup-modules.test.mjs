import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const extension = resolve(repo, "apps/extension");
const popupDir = resolve(extension, "popup");
const libDir = resolve(extension, "lib");

const popupModules = [
  "../lib/runtime-utils.js",
  "../lib/site-config.js",
  "popup-nav.js",
  "popup-settings.js",
  "popup-feedback.js",
  "popup-presets.js",
  "popup.js",
];

test("popup modules exist and entrypoint stays thin", async () => {
  popupModules.forEach((file) => {
    const path = file.startsWith("../") ? resolve(extension, file.replace(/^\.\.\//, "")) : resolve(popupDir, file);
    assert.equal(existsSync(path), true, `missing ${file}`);
  });
  const entry = await readFile(resolve(popupDir, "popup.js"), "utf8");
  assert.match(entry, /AltteuriPopupNav/);
  assert.doesNotMatch(entry, /function renderPresetList/);
  assert.doesNotMatch(entry, /function submitFeedback/);
});

test("popup feature scripts avoid duplicate top-level bindings", async () => {
  for (const file of ["popup-nav.js", "popup-settings.js", "popup-feedback.js", "popup-presets.js", "popup.js"]) {
    const source = await readFile(resolve(popupDir, file), "utf8");
    assert.match(source, /^\(\(\) => \{/);
    assert.match(source, /\}\)\(\);\s*$/);
    assert.doesNotMatch(source, /^const R = /);
  }
});

test("popup feedback reads page size from site-config", async () => {
  const feedback = await readFile(resolve(popupDir, "popup-feedback.js"), "utf8");
  const siteConfig = await readFile(resolve(libDir, "site-config.js"), "utf8");
  assert.match(feedback, /AltteuriSiteConfig/);
  assert.match(siteConfig, /FEEDBACK_PAGE_SIZE:\s*5/);
});
