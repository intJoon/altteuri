#!/usr/bin/env node
/** Copy bundled video fonts from node_modules into assets/video/shorts/assets/fonts/. */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const shortsRoot = join(root, "assets/video/shorts");
const targetDir = join(shortsRoot, "assets/fonts");

const fontFiles = [
  [
    join(shortsRoot, "node_modules/@fontsource/ibm-plex-sans-kr/files/ibm-plex-sans-kr-korean-400-normal.woff2"),
    "ibm-plex-sans-kr-400.woff2",
  ],
  [
    join(shortsRoot, "node_modules/@fontsource/ibm-plex-sans-kr/files/ibm-plex-sans-kr-korean-500-normal.woff2"),
    "ibm-plex-sans-kr-500.woff2",
  ],
  [
    join(shortsRoot, "node_modules/@fontsource/ibm-plex-sans-kr/files/ibm-plex-sans-kr-korean-600-normal.woff2"),
    "ibm-plex-sans-kr-600.woff2",
  ],
  [
    join(shortsRoot, "node_modules/@fontsource/ibm-plex-sans-kr/files/ibm-plex-sans-kr-korean-700-normal.woff2"),
    "ibm-plex-sans-kr-700.woff2",
  ],
  [
    join(shortsRoot, "node_modules/@fontsource/outfit/files/outfit-latin-600-normal.woff2"),
    "outfit-600.woff2",
  ],
  [
    join(shortsRoot, "node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff2"),
    "outfit-700.woff2",
  ],
  [
    join(shortsRoot, "node_modules/@fontsource/outfit/files/outfit-latin-800-normal.woff2"),
    "outfit-800.woff2",
  ],
];

mkdirSync(targetDir, { recursive: true });

for (const [source, name] of fontFiles) {
  if (!existsSync(source)) {
    console.error(`Missing font source: ${source}. Run npm ci --prefix assets/video/shorts first.`);
    process.exit(1);
  }
  copyFileSync(source, join(targetDir, name));
}

console.log(`Synced ${fontFiles.length} video fonts → assets/video/shorts/assets/fonts/`);
