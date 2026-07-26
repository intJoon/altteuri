import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLegalHtml } from "../generate-legal.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("legal HTML matches generated output from docs sources", () => {
  const generated = buildLegalHtml(repo);
  const extensionLegal = readFileSync(resolve(repo, "extension/legal.html"), "utf8");
  const webLegal = readFileSync(resolve(repo, "web/public/legal.html"), "utf8");

  assert.equal(extensionLegal, generated, "extension/legal.html is out of date — run npm run generate:legal");
  assert.equal(webLegal, generated, "web/public/legal.html is out of date — run npm run generate:legal");
  assert.equal(extensionLegal, webLegal, "extension and web legal.html differ");
});
