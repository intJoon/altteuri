import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(resolve(repo, rel), "utf8");
}

test("sync-assets keeps gray icons out of store bundle", () => {
  const source = read("tools/scripts/sync-assets.mjs");
  assert.match(source, /STORE_ICON_FILES/);
  assert.doesNotMatch(source, /copyDirPngs\(brandDir, storeAssets\)/);
  assert.match(source, /icon16\.png/);
  assert.doesNotMatch(source, /icon16-gray\.png/);
});

test("shorts composition uses local gsap and bundled fonts", () => {
  const indexHtml = read("assets/video/shorts/index.html");
  assert.match(indexHtml, /\.\/node_modules\/gsap\/dist\/gsap\.min\.js/);
  assert.match(indexHtml, /@font-face[\s\S]*\.\/assets\/fonts\/ibm-plex-sans-kr-400\.woff2/);
  assert.doesNotMatch(indexHtml, /fonts\.googleapis\.com/);
  assert.doesNotMatch(indexHtml, /cdn\.jsdelivr\.net/);
});
