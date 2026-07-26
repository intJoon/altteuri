import { platform } from "node:os";
import { accessSync, constants } from "node:fs";

const WINDOWS_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const MAC_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

const LINUX_PATHS = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
];

function canExecute(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveChromeExecutable(customPath) {
  if (customPath) return customPath;
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const candidates =
    platform() === "win32" ? WINDOWS_PATHS : platform() === "darwin" ? MAC_PATHS : LINUX_PATHS;

  for (const candidate of candidates) {
    if (canExecute(candidate)) return candidate;
  }

  throw new Error(
    "Chrome executable not found. Set CHROME_PATH to your chrome.exe or Chromium binary."
  );
}

export const START_SCRIPTS = ["preset-data.js", "runtime-utils.js", "content/shared-start.js", "content/early.js"];

/** Matches extension/manifest.json document_idle content_scripts[1].js order. */
export const IDLE_SCRIPTS = [
  "pure-logic.js",
  "settings-defaults.js",
  "runtime-utils.js",
  "content/shared-start.js",
  "content/selectors.js",
  "content/core.js",
  "content/keyword-filter.js",
  "content/sort.js",
  "content/list-size.js",
  "content/element-remover.js",
  "content/page-runtime.js",
  "content/settings-bridge.js",
  "content/onboarding-banner.js",
  "content/boot.js",
];

