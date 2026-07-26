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
  "docs/버전.md",
  "docs/업그레이드.md",
  "docs/방법론.md",
  "docs/QC.md",
  "docs/출처.md",
  "docs/CHROME_WEB_STORE.md",
  "README.md",
  "CONTRIBUTING.md",
  "apps/web/README.md",
  "assets/store/README.md",
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
  /\bsync:intro\b/,
  /\btest:e2e\b/,
  /\bintro\.mp4\b/,
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

const historicalDocPatterns = [/\bsync:intro\b/, /\bintro\.mp4\b/];

test("operational docs avoid stale repository paths", () => {
  for (const rel of operationalDocs) {
    const source = read(rel);
    for (const pattern of stalePathPatterns) {
      if (rel === "docs/버전.md" && historicalDocPatterns.some((skip) => skip.source === pattern.source)) {
        continue;
      }
      assert.doesNotMatch(source, pattern, `${rel} still references a pre-restructure path (${pattern})`);
    }
  }
});

test("site install path matches repository layout", () => {
  const indexHtml = read("apps/web/public/index.html");
  assert.match(indexHtml, /apps\/extension\//);
  const version = JSON.parse(read("apps/extension/manifest.json")).version;
  assert.match(indexHtml, new RegExp(`styles\\.css\\?v=${version}`));
  const notFoundHtml = read("apps/web/public/404.html");
  assert.match(notFoundHtml, new RegExp(`styles\\.css\\?v=${version}`));
  assert.match(notFoundHtml, /theme-color" content="#f7f9ff"/);
});

test("landing public dir has no intro video asset", () => {
  assert.throws(
    () => read("apps/web/public/intro.mp4"),
    (err) => err && "code" in err && err.code === "ENOENT",
    "intro.mp4 should not be published"
  );
});

test("generated public site-config matches shared constants", () => {
  const generated = read("apps/web/public/site-config.js");
  const shared = read("shared/site-config.mjs");
  const pageSize = shared.match(/FEEDBACK_PAGE_SIZE = (\d+)/)?.[1];
  const maxLen = shared.match(/FEEDBACK_MAX_LEN = (\d+)/)?.[1];
  assert.ok(pageSize, "FEEDBACK_PAGE_SIZE missing in shared/site-config.mjs");
  assert.ok(maxLen, "FEEDBACK_MAX_LEN missing in shared/site-config.mjs");
  assert.match(generated, new RegExp(`export const FEEDBACK_PAGE_SIZE = ${pageSize}`));
  assert.match(generated, new RegExp(`export const FEEDBACK_MAX_LEN = ${maxLen}`));
  assert.match(read("apps/web/public/feedback.js"), /from "\.\/site-config\.js"/);
});

test("landing site has no intro video", () => {
  const indexHtml = read("apps/web/public/index.html");
  assert.doesNotMatch(indexHtml, /id="video"|intro\.mp4|소개 영상/);
});

test("version.json matches manifest", () => {
  const manifestVersion = JSON.parse(read("apps/extension/manifest.json")).version;
  const published = JSON.parse(read("apps/web/public/version.json")).version;
  assert.equal(published, manifestVersion);
});
