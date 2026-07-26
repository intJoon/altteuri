import assert from "node:assert/strict";
import test from "node:test";
import {
  FEEDBACK_PAGE_SIZE,
  MAX_EXCLUDED_KEYWORDS,
  MAX_KEYWORD_LENGTH,
  MIN_CHROME_VERSION,
  SITE_ORIGIN,
} from "../../shared/site-config.mjs";

test("shared site config exposes canonical public values", () => {
  assert.equal(SITE_ORIGIN, "https://altteuri.vercel.app");
  assert.equal(FEEDBACK_PAGE_SIZE, 5);
  assert.equal(MAX_EXCLUDED_KEYWORDS, 50);
  assert.equal(MAX_KEYWORD_LENGTH, 50);
  assert.equal(MIN_CHROME_VERSION, "105");
});

test("extension site-config mirrors shared feedback and keyword limits", async () => {
  const { readFile } = await import("node:fs/promises");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const source = await readFile(resolve(repo, "extension/site-config.js"), "utf8");
  assert.match(source, new RegExp(`FEEDBACK_PAGE_SIZE:\\s*${FEEDBACK_PAGE_SIZE}`));
  assert.match(source, new RegExp(`MAX_EXCLUDED_KEYWORDS:\\s*${MAX_EXCLUDED_KEYWORDS}`));
  assert.match(source, new RegExp(`MAX_KEYWORD_LENGTH:\\s*${MAX_KEYWORD_LENGTH}`));
});
