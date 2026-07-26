import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(resolve(repo, rel), "utf8");
}

test("manifest version matches current docs", () => {
  const version = JSON.parse(read("extension/manifest.json")).version;
  assert.match(read("docs/버전.md"), new RegExp(`현재 버전은 \\*\\*${version}\\*\\*`));
  assert.match(read("docs/업그레이드.md"), new RegExp(`현재 버전은 ${version}`));
  assert.match(read("docs/방법론.md"), new RegExp(`알뜰이 ${version}`));
  assert.match(read("docs/QC.md"), new RegExp(`${version} 기준`));
});

test("settingsVersion matches code and current docs", () => {
  const settingsSrc = read("extension/settings-defaults.js");
  const match = settingsSrc.match(/SETTINGS_VERSION = (\d+)/);
  assert.ok(match, "SETTINGS_VERSION constant missing");
  const sv = match[1];
  assert.match(settingsSrc, /settingsVersion: SETTINGS_VERSION/);
  assert.match(read("docs/버전.md"), new RegExp(`settingsVersion\`\\(현재 \\*\\*${sv}\\*\\*\\)`));
  assert.match(read("docs/업그레이드.md"), new RegExp(`settingsVersion: ${sv}`));
  assert.match(read("docs/방법론.md"), new RegExp(`settingsVersion: ${sv}`));
  assert.match(read("docs/QC.md"), new RegExp(`settingsVersion.*${sv}`));
});
