import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const extension = resolve(repo, 'extension');
const webPublic = resolve(repo, 'web/public');

async function readExt(rel) {
  return readFile(resolve(extension, rel), 'utf8');
}

function loadSettings() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(readFileSync(resolve(extension, 'settings-defaults.js'), 'utf8'), context);
  return context.AltteuriSettings;
}

test('R1: master switch keys are not defaults; migration still deletes them', async () => {
  const settings = loadSettings();
  assert.equal('altEnabled' in settings.DEFAULT_SETTINGS, false);
  assert.equal('lastPreset' in settings.DEFAULT_SETTINGS, false);
  const popupHtml = await readExt('popup.html');
  assert.doesNotMatch(popupHtml, /altEnabled|알뜰이 켜기|lastPreset/);
  const background = await readExt('background.js');
  assert.match(background, /delete next\.altEnabled/);
  assert.match(background, /delete next\.lastPreset/);
});

test('R2: legacy A.schedule helper is gone', async () => {
  const sources = await Promise.all([
    readExt('content/sort.js'),
    readExt('content/core.js'),
    readExt('content/boot.js'),
    readExt('pure-logic.js')
  ]);
  sources.forEach(source => {
    assert.doesNotMatch(source, /\bA\.schedule\b/);
    assert.doesNotMatch(source, /schedule:\s*function|function schedule\s*\(/);
  });
});

test('R3: sort visibility consults remover CSS hides', async () => {
  const core = await readExt('content/core.js');
  assert.match(core, /A\.remover\.isItemHidden/);
  assert.match(core, /getComputedStyle\(item\)\.display/);
  const remover = await readExt('content/element-remover.js');
  assert.match(remover, /function isItemHidden/);
  assert.match(remover, /item\.matches\(activeHideSelectors/);
  assert.match(remover, /buildRemoverHideCss/);
  const shared = await readExt('content/shared-start.js');
  assert.match(shared, /display:none!important/);
});

test('R4: listSize radio sync does not dispatch change/click', async () => {
  const source = await readExt('content/list-size.js');
  const syncStart = source.indexOf('function syncListSizeRadio');
  const syncEnd = source.indexOf('function redirectOnce');
  const syncBody = source.slice(syncStart, syncEnd);
  assert.match(syncBody, /radio\.checked = true/);
  assert.doesNotMatch(syncBody, /dispatchEvent|\.click\(/);
});

test('R5: unchecked presets are the only hidden selectors', async () => {
  const shared = await readExt('content/shared-start.js');
  assert.match(shared, /off\.has\(it\.selector\)/);
  assert.match(shared, /display:none!important/);
  const remover = await readExt('content/element-remover.js');
  assert.match(remover, /buildRemoverHideCss/);
});

test('R6: marketing site is feedback read-only', async () => {
  const html = await readFile(resolve(webPublic, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /id="feedback-submit"|id="btn-feedback-submit"|<textarea/);
  assert.match(html, /id="feedback-list"/);
  const feedbackJs = await readFile(resolve(webPublic, 'feedback.js'), 'utf8');
  assert.doesNotMatch(feedbackJs, /method:\s*['"]POST['"]/);
  assert.match(feedbackJs, /\/api\/comments/);
});

test('R7: feedback page size is 5 and popup date has no time-of-day fields', async () => {
  const popup = await readExt('popup.js');
  assert.match(popup, /FEEDBACK_PAGE_SIZE\s*=\s*5/);
  const formatStart = popup.indexOf('function formatFeedbackDate');
  const formatEnd = popup.indexOf('\nfunction ', formatStart + 1);
  const formatBody = popup.slice(formatStart, formatEnd === -1 ? undefined : formatEnd);
  assert.doesNotMatch(formatBody, /getHours|getMinutes|hour|minute|toLocaleTimeString/);
});

test('R8: quick-cart success is UI/response based; timeout is failure', async () => {
  const quickCart = await readExt('content/quick-cart.js');
  assert.match(quickCart, /담기\\s\*완료|담기\s*완료/);
  assert.match(quickCart, /장바구니에\\s\*담겼|장바구니에\s*담겼/);
  assert.match(quickCart, /cart_timeout/);
  assert.doesNotMatch(quickCart, /cartCount|headerCart|장바구니\s*수/);
  assert.match(quickCart, /reject\(new Error\('cart_timeout'\)\)/);
});

test('R9: single iframe warm path, no 3-iframe prefetch cache', async () => {
  const quickCart = await readExt('content/quick-cart.js');
  assert.match(quickCart, /ALT_WARM_DEBOUNCE_MS\s*=\s*160/);
  assert.doesNotMatch(quickCart, /MAX_IFRAME|iframeCache|prefetch.*3|호버.*iframe/);
});

test('R10: MAIN-world cart hook file injection remains', async () => {
  const background = await readExt('background.js');
  assert.match(background, /world:\s*'MAIN'/);
  assert.match(background, /page-cart-hook\.js/);
  assert.equal(existsSync(resolve(extension, 'page-cart-hook.js')), true);
});

test('R11: sort restore keys use altActiveSort / altSortQuery', async () => {
  const sort = await readExt('content/sort.js');
  assert.match(sort, /altActiveSort/);
  assert.match(sort, /altSortQuery/);
  assert.doesNotMatch(sort, /craActiveSort|craSortQuery/);
});

test('R12: keyword query key prefers excludedKeywordsForQuery with session fallback', async () => {
  const keyword = await readExt('content/keyword-filter.js');
  assert.match(keyword, /excludedKeywordsForQuery/);
  assert.match(
    keyword,
    /excludedKeywordsForQuery\s*\?\?\s*result\.excludedKeywordsSessionKey|excludedKeywordsForQuery.{0,80}excludedKeywordsSessionKey/
  );
});

test('R13: picker permissions and APIs stay removed', async () => {
  const manifest = JSON.parse(await readExt('manifest.json'));
  assert.equal(manifest.permissions.includes('activeTab'), false);
  assert.doesNotMatch(JSON.stringify(manifest), /captureVisibleTab/);
  const popupHtml = await readExt('popup.html');
  assert.doesNotMatch(popupHtml, /피커|드래그 선택|실행취소/);
});

test('R14: all feature toggles default to false', () => {
  const settings = loadSettings();
  settings.FEATURE_TOGGLE_KEYS.forEach(key => {
    assert.equal(settings.DEFAULT_SETTINGS[key], false, key);
  });
});
