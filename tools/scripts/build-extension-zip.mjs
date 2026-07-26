#!/usr/bin/env node
/**
 * Build a Chrome Web Store upload zip from apps/extension/.
 * Writes dist/altteuri-extension.zip and dist/altteuri-extension-v{version}.zip
 */
import { execSync } from "node:child_process";
import { readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const extensionDir = resolve(root, "apps/extension");
const outDir = resolve(root, "dist");

function readManifestVersion() {
  const manifest = JSON.parse(readFileSync(join(extensionDir, "manifest.json"), "utf8"));
  return manifest.version || "0.0.0";
}

function zipExtension(outFile) {
  rmSync(outFile, { force: true });
  if (platform() === "win32") {
    const ps = [
      "$ErrorActionPreference='Stop'",
      `Compress-Archive -Path '${extensionDir.replace(/'/g, "''")}\\*' -DestinationPath '${outFile.replace(/'/g, "''")}' -Force`,
    ].join("; ");
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
  } else {
    execSync(`zip -r -q "${outFile}" . -x "*.DS_Store"`, { cwd: extensionDir, stdio: "inherit" });
  }
}

function main() {
  if (!existsSync(join(extensionDir, "manifest.json"))) {
    console.error("apps/extension/manifest.json missing");
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  const version = readManifestVersion();
  for (const name of ["altteuri-extension.zip", `altteuri-extension-v${version}.zip`]) {
    const target = join(outDir, name);
    zipExtension(target);
    const size = readFileSync(target).length;
    console.log(`Wrote dist/${name} (${size} bytes)`);
  }
}

main();
