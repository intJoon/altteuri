#!/usr/bin/env node
/** Sync manifest version into web/public/version.json for the landing site footer. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8"));
const version = manifest.version || "0.0.0";

writeFileSync(
  join(root, "web/public/version.json"),
  `${JSON.stringify({ version }, null, 2)}\n`,
  "utf8"
);

const indexPath = join(root, "web/public/index.html");
let indexHtml = readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(/styles\.css\?v=[^"']+/, `styles.css?v=${version}`);
writeFileSync(indexPath, indexHtml, "utf8");

console.log(`Synced public meta for v${version}`);
