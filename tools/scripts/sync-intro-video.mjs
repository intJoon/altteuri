#!/usr/bin/env node
/** Copy rendered intro MP4 from assets/video/shorts/out to apps/web/public/intro.mp4 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(root, "assets/video/shorts/out/altteuri-intro.mp4");
const target = join(root, "apps/web/public/intro.mp4");

if (!existsSync(source)) {
  console.error("Missing render output. Run: cd assets/video/shorts && npm run render");
  process.exit(1);
}

copyFileSync(source, target);
console.log("Copied intro MP4 to apps/web/public/intro.mp4");
