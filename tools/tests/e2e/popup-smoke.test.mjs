#!/usr/bin/env node
/** Smoke-test popup HTML loads required onboarding + module scripts. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("popup HTML wires onboarding module", () => {
  const popupHtml = readFileSync(join(root, "extension/popup.html"), "utf8");
  assert.match(popupHtml, /popup-onboarding\.js/);
});

test("onboarding scripts define dismiss storage keys", () => {
  const onboardingJs = readFileSync(join(root, "extension/popup-onboarding.js"), "utf8");
  const bannerJs = readFileSync(join(root, "extension/content/onboarding-banner.js"), "utf8");
  assert.match(onboardingJs, /onboardingPopupDismissed/);
  assert.match(bannerJs, /onboardingBannerDismissed/);
  assert.match(bannerJs, /AltteuriOnboardingBanner/);
});
