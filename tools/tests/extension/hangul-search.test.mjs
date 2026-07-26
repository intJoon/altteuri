import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = await readFile(resolve(repo, "extension/hangul-search.js"), "utf8");

function loadHangulSearch() {
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(source, context, { filename: "hangul-search.js" });
  return context.HangulSearch;
}

test("HangulSearch matches substring queries", () => {
  const HS = loadHangulSearch();
  assert.equal(HS.match("무선 마우스", "마우스"), true);
  assert.equal(HS.match("무선 마우스", "키보드"), false);
});

test("HangulSearch matches choseong-only queries", () => {
  const HS = loadHangulSearch();
  assert.equal(HS.match("검색결과 상단 배너", "ㄱㅅ"), true);
  assert.equal(HS.match("검색결과 상단 배너", "ㅂㅂ"), false);
});

test("HangulSearch treats empty query as match-all", () => {
  const HS = loadHangulSearch();
  assert.equal(HS.match("아무거나", ""), true);
});
