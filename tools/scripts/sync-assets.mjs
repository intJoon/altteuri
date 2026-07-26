#!/usr/bin/env node
/** Copy canonical brand assets from assets/brand/ to extension, web, store, and video. */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brandDir = join(root, "assets/brand");

const EXTENSION_ICON_TARGETS = [
  join(root, "apps/extension/assets/icons"),
  join(root, "assets/video/shorts/assets"),
];

const STORE_ICON_FILES = [
  "icon.png",
  "icon16.png",
  "icon32.png",
  "icon48.png",
  "icon128.png",
];

const WEB_PUBLIC_FILES = [
  "icon.png",
  "icon128.png",
  "favicon-32.png",
  "apple-touch-icon.png",
];

function copyDirPngs(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  for (const name of readdirSync(sourceDir)) {
    if (!name.endsWith(".png")) continue;
    copyFileSync(join(sourceDir, name), join(targetDir, name));
  }
}

function copyNamedPngs(sourceDir, targetDir, names) {
  mkdirSync(targetDir, { recursive: true });
  for (const name of names) {
    const source = join(sourceDir, name);
    if (!existsSync(source)) continue;
    copyFileSync(source, join(targetDir, name));
  }
}

function main() {
  if (!existsSync(brandDir)) {
    console.error("Missing assets/brand/. Run tools/scripts/make-icons.py or add icons first.");
    process.exit(1);
  }

  for (const target of EXTENSION_ICON_TARGETS) {
    copyDirPngs(brandDir, target);
    console.log(`Synced PNG icons → ${target.replace(root + "\\", "").replace(root + "/", "")}`);
  }

  const storeAssets = join(root, "assets/store/assets");
  copyNamedPngs(brandDir, storeAssets, STORE_ICON_FILES);
  console.log("Synced store icons → assets/store/assets/");

  const webPublic = join(root, "apps/web/public");
  mkdirSync(webPublic, { recursive: true });
  for (const name of WEB_PUBLIC_FILES) {
    const source = join(brandDir, name);
    if (!existsSync(source)) continue;
    copyFileSync(source, join(webPublic, name));
    console.log(`Synced ${name} → apps/web/public/`);
  }
}

main();
