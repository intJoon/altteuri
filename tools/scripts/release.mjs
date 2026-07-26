#!/usr/bin/env node
/**
 * Release helper: bump manifest version, regenerate legal HTML, run tests.
 *
 * Usage:
 *   node tools/scripts/release.mjs 2.2.7
 *   node tools/scripts/release.mjs --check   # verify manifest vs docs without writing
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const manifestPath = join(root, "apps/extension/manifest.json");
const semverRe = /^\d+\.\d+\.\d+$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function updateQc(version) {
  const qcPath = join(root, "docs/QC.md");
  let qc = readFileSync(qcPath, "utf8");
  qc = qc.replace(
    /\*\*[\d.]+\s*기준:\*\*[^\n]+/,
    `**${version} 기준:** 위 명령이 모두 통과하면 계약·순수 로직·API·법적 고지·manifest 경로는 코드로 확인된 것이다.`
  );
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
  console.error("Usage: node tools/scripts/release.mjs <semver>  |  node tools/scripts/release.mjs --check");
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

updateQc(versionArg);
run("npm run generate:legal");
run("npm run sync:public-meta");
run("npm test");
run("npm run lint");
run("npm run build:extension");
console.log(`\nRelease prep complete for v${versionArg}.`);
console.log("Next: update docs/버전.md, commit, tag, push.");
