import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(resolve(repo, rel), "utf8");
}

const operationalDocs = [
  "docs/업그레이드.md",
  "docs/방법론.md",
  "docs/QC.md",
  "docs/출처.md",
  "docs/CHROME_WEB_STORE.md",
  "README.md",
  "CONTRIBUTING.md",
  "apps/web/README.md",
];

const stalePathPatterns = [
  /\bnpm ci --prefix web\b/,
  /\bSelect the `extension\//,
  /\bDeploy `web\//,
  /\btools\/alt-inspect\b/,
  /\btools\/release\.mjs\b/,
  /\btools\/generate-legal\.mjs\b/,
  /\b`extension\/manifest\.json`/,
  /\b`extension\/settings-defaults\.js`/,
  /\b`extension\/legal\.html`/,
  /\b`web\/public\//,
  /\bcd video\/shorts\b/,
];

test("manifest version matches current docs", () => {
  const version = JSON.parse(read("apps/extension/manifest.json")).version;
  assert.match(read("docs/버전.md"), new RegExp(`현재 버전은 \\*\\*${version}\\*\\*`));
  assert.match(read("docs/업그레이드.md"), new RegExp(`현재 버전은 ${version}`));
  assert.match(read("docs/방법론.md"), new RegExp(`알뜰이 ${version}`));
  assert.match(read("docs/QC.md"), new RegExp(`${version} 기준`));
  assert.match(read("docs/출처.md"), new RegExp(`알뜰이 ${version}`));
});

test("settingsVersion matches code and current docs", () => {
  const settingsSrc = read("apps/extension/lib/settings-defaults.js");
  const match = settingsSrc.match(/SETTINGS_VERSION = (\d+)/);
  assert.ok(match, "SETTINGS_VERSION constant missing");
  const sv = match[1];
  assert.match(settingsSrc, /settingsVersion: SETTINGS_VERSION/);
  assert.match(read("docs/버전.md"), new RegExp(`settingsVersion\`\\(현재 \\*\\*${sv}\\*\\*\\)`));
  assert.match(read("docs/업그레이드.md"), new RegExp(`settingsVersion: ${sv}`));
  assert.match(read("docs/방법론.md"), new RegExp(`settingsVersion: ${sv}`));
});

test("operational docs avoid stale repository paths", () => {
  for (const rel of operationalDocs) {
    const source = read(rel);
    for (const pattern of stalePathPatterns) {
      assert.doesNotMatch(source, pattern, `${rel} still references a pre-restructure path (${pattern})`);
    }
  }
});

test("intro site install path matches repository layout", () => {
  const indexHtml = read("apps/web/public/index.html");
  assert.match(indexHtml, /apps\/extension\//);
  const version = JSON.parse(read("apps/extension/manifest.json")).version;
  assert.match(indexHtml, new RegExp(`styles\\.css\\?v=${version}`));
});

test("version.json matches manifest", () => {
  const manifestVersion = JSON.parse(read("apps/extension/manifest.json")).version;
  const published = JSON.parse(read("apps/web/public/version.json")).version;
  assert.equal(published, manifestVersion);
});
