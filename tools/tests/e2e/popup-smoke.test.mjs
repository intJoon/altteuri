#!/usr/bin/env node
/** Smoke-test popup HTML and Coupang onboarding toast wiring. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("popup HTML does not load popup onboarding module", () => {
  const popupHtml = readFileSync(join(root, "extension/popup.html"), "utf8");
  assert.doesNotMatch(popupHtml, /popup-onboarding\.js/);
});

test("onboarding toast uses extension icon asset", () => {
  const bannerJs = readFileSync(join(root, "extension/content/onboarding-banner.js"), "utf8");
  const manifest = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8"));
  assert.match(bannerJs, /getURL\("icon48\.png"\)/);
  assert.doesNotMatch(bannerJs, />알</);
  assert.match(bannerJs, /설치되었습니다/);
  assert.match(bannerJs, /onboardingBannerDismissed/);
  assert.match(bannerJs, /onboardingFeatureEverEnabled/);
  const exposed = manifest.web_accessible_resources?.flatMap((entry) => entry.resources) ?? [];
  assert.ok(exposed.includes("icon48.png"), "icon48.png must be web accessible for page toast img");
});

test("onboarding hides permanently after any feature enabled", () => {
  const defaultsJs = readFileSync(join(root, "extension/settings-defaults.js"), "utf8");
  const bannerJs = readFileSync(join(root, "extension/content/onboarding-banner.js"), "utf8");
  assert.match(defaultsJs, /onboardingFeatureEverEnabled/);
  assert.match(bannerJs, /markOnboardingComplete/);
  assert.match(bannerJs, /FEATURE_EVER_KEY/);
});
