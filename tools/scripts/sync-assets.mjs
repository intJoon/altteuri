#!/usr/bin/env node
/** Copy canonical brand assets from assets/brand/ to extension, web, store, and video. */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brandDir = join(root, "assets/brand");

const ICON_TARGETS = [
  join(root, "apps/extension/assets/icons"),
  join(root, "assets/store/assets"),
  join(root, "assets/video/shorts/assets"),
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

function main() {
  if (!existsSync(brandDir)) {
    console.error("Missing assets/brand/. Run tools/scripts/make-icons.py or add icons first.");
    process.exit(1);
  }

  for (const target of ICON_TARGETS) {
    copyDirPngs(brandDir, target);
    console.log(`Synced PNG icons → ${target.replace(root + "\\", "").replace(root + "/", "")}`);
  }

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
