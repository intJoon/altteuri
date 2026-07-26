#!/usr/bin/env node
/**
 * Release helper: bump manifest version, regenerate legal HTML, run tests.
 *
 * Usage:
 *   node tools/release.mjs 2.2.7
 *   node tools/release.mjs --check   # verify manifest vs docs without writing
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const manifestPath = join(root, "extension/manifest.json");
const semverRe = /^\d+\.\d+\.\d+$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function bumpCssCache(version) {
  const indexPath = join(root, "web/public/index.html");
  let html = readFileSync(indexPath, "utf8");
  html = html.replace(/styles\.css\?v=[^"']+/, `styles.css?v=${version}`);
  writeFileSync(indexPath, html, "utf8");
}

function updateQc(version) {
  const qcPath = join(root, "docs/QC.md");
  let qc = readFileSync(qcPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  qc = qc.replace(/\*\*2\.[\d.]+\s*기준:\*\*[^\n]+/, `**${version} 기준:** ${today}에 위 테스트 **통과** 기록은 릴리스 직전 \`npm test\`로 갱신.`);
  writeFileSync(qcPath, qc, "utf8");
}

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const versionArg = args.find((a) => !a.startsWith("-"));

if (checkOnly) {
  const manifest = readJson(manifestPath);
  const qc = readFileSync(join(root, "docs/QC.md"), "utf8");
  const version = manifest.version;
  if (!qc.includes(version)) {
    console.warn(`QC.md may not mention version ${version}`);
  }
  run("npm test");
  run("npm run lint");
  console.log(`Release check OK for v${version}`);
  process.exit(0);
}

if (!versionArg || !semverRe.test(versionArg)) {
  console.error("Usage: node tools/release.mjs <semver>  |  node tools/release.mjs --check");
  process.exit(1);
}

const manifest = readJson(manifestPath);
if (manifest.version === versionArg) {
  console.log(`manifest already at ${versionArg}`);
} else {
  manifest.version = versionArg;
  writeJson(manifestPath, manifest);
  console.log(`Bumped manifest to ${versionArg}`);
}

bumpCssCache(versionArg);
updateQc(versionArg);
run("npm run generate:legal");
run("node tools/sync-public-meta.mjs");
run("npm test");
run("npm run lint");
run("node tools/build-extension-zip.mjs");
console.log(`\nRelease prep complete for v${versionArg}.`);
console.log("Next: update docs/버전.md, commit, tag, push.");
