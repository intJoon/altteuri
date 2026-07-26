import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("version.json matches manifest version", () => {
  const manifest = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8"));
  const published = JSON.parse(readFileSync(join(root, "web/public/version.json"), "utf8"));
  assert.equal(published.version, manifest.version);
});

test("landing page loads site-meta.js for dynamic version", async () => {
  const indexHtml = await readFileSync(join(root, "web/public/index.html"), "utf8");
  assert.match(indexHtml, /site-meta\.js/);
  assert.match(indexHtml, /id="site-version"/);
});
