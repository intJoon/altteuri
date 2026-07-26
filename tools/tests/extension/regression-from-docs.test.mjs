import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const extension = resolve(repo, 'apps/extension');
const webPublic = resolve(repo, 'apps/web/public');

async function readExt(rel) {
  return readFile(resolve(extension, rel), 'utf8');
}

function loadSettings() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(readFileSync(resolve(extension, 'lib/settings-defaults.js'), 'utf8'), context);
  return context.AltteuriSettings;
}

test('R1: master switch keys are not defaults; migration still deletes them', async () => {
  const settings = loadSettings();
  assert.equal('altEnabled' in settings.DEFAULT_SETTINGS, false);
  assert.equal('lastPreset' in settings.DEFAULT_SETTINGS, false);
  assert.equal('quickCartEnabled' in settings.DEFAULT_SETTINGS, false);
  const popupHtml = await readExt('popup/popup.html');
  assert.doesNotMatch(popupHtml, /altEnabled|알뜰이 켜기|lastPreset/);
  assert.doesNotMatch(popupHtml, /toggle-quick-cart|장바구니 바로 담기/);
  const background = await readExt('background.js');
  assert.match(background, /delete next\.altEnabled/);
  assert.match(background, /delete next\.lastPreset/);
  assert.match(background, /delete next\.quickCartEnabled/);
  assert.match(background, /fromVersion === 3 \|\| fromVersion === 4/);
});

test('R2: legacy A.schedule helper is gone', async () => {
  const sources = await Promise.all([
    readExt('content/sort.js'),
    readExt('content/core.js'),
    readExt('content/boot.js'),
    readExt('lib/pure-logic.js')
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
  assert.doesNotMatch(html, /id="video"|intro\.mp4|소개 영상/);
  assert.match(html, /id="feedback-list"/);
  const feedbackJs = await readFile(resolve(webPublic, 'feedback.js'), 'utf8');
  assert.doesNotMatch(feedbackJs, /method:\s*['"]POST['"]/);
  assert.match(feedbackJs, /\/api\/comments/);
});

test('R7: feedback page size is 5 and popup date has no time-of-day fields', async () => {
  const siteConfig = await readExt('lib/site-config.js');
  const feedback = await readExt('popup/popup-feedback.js');
  assert.match(siteConfig, /FEEDBACK_PAGE_SIZE:\s*5/);
  const formatStart = feedback.indexOf('function formatFeedbackDate');
  const formatEnd = feedback.indexOf('\nfunction ', formatStart + 1);
  const formatBody = feedback.slice(formatStart, formatEnd === -1 ? undefined : formatEnd);
  assert.doesNotMatch(formatBody, /getHours|getMinutes|hour|minute|toLocaleTimeString/);
});

test('R8: quick-cart feature removed', async () => {
  const manifest = JSON.parse(await readExt('manifest.json'));
  assert.equal(existsSync(resolve(extension, 'content/quick-cart.js')), false);
  assert.equal(existsSync(resolve(extension, 'page-cart-hook.js')), false);
  assert.equal(manifest.permissions.includes('scripting'), false);
  assert.doesNotMatch(JSON.stringify(manifest), /quick-cart/);
  const settings = loadSettings();
  assert.equal('quickCartEnabled' in settings.DEFAULT_SETTINGS, false);
  assert.equal(settings.SETTINGS_VERSION, 11);
});

test('R9: content scripts load without cart modules', async () => {
  const manifest = JSON.parse(await readExt('manifest.json'));
  const idleJs = manifest.content_scripts[1].js.join('\n');
  assert.doesNotMatch(idleJs, /quick-cart/);
});

test('R10: background has no MAIN-world cart hook injection', async () => {
  const background = await readExt('background.js');
  assert.doesNotMatch(background, /page-cart-hook/);
  assert.doesNotMatch(background, /alt-main/);
  assert.doesNotMatch(background, /executeScript/);
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
  const popupHtml = await readExt('popup/popup.html');
  assert.doesNotMatch(popupHtml, /피커|드래그 선택|실행취소/);
});

test('R14: all feature toggles default to false', () => {
  const settings = loadSettings();
  settings.FEATURE_TOGGLE_KEYS.forEach(key => {
    assert.equal(settings.DEFAULT_SETTINGS[key], false, key);
  });
});

test('R15: custom sort shows rank marks only and hides native ranks without removing them', async () => {
  const core = await readExt('content/core.js');
  const sort = await readExt('content/sort.js');
  assert.match(core, /alt-sort-rank/);
  assert.match(core, /alt-custom-sort-active[\s\S]*RankMark_rank/);
  assert.match(core, /setCustomSortSurface/);
  assert.doesNotMatch(core, /RankMark_rank'\]\)\.forEach\(el => el\.remove\(\)/);
  assert.match(sort, /syncCustomSortSurface/);
  assert.doesNotMatch(sort, /updateUnitPriceBadge\(row\.item/);
});

test('R16: toolbar icon grays out when every feature is off', async () => {
  const background = await readExt('background.js');
  assert.match(background, /assets\/icons\/icon16-gray\.png/);
  assert.match(background, /isAnyFeatureEnabled/);
  assert.match(background, /FEATURE_TOGGLE_KEYS\.some/);
});

test('R17: custom sort teardown clears rank marks when sort is deactivated', async () => {
  const sort = await readExt('content/sort.js');
  assert.match(sort, /function clearSort[\s\S]*activeKind === kind[\s\S]*clearRankMark\(item\)/);
  assert.match(sort, /syncCustomSortSurface/);
  assert.match(sort, /function deactivateCustomSort[\s\S]*clearSort\(kind\)/);
});

test('R18: custom sort restore waits for full list and realigns native top ranks', async () => {
  const core = await readExt('content/core.js');
  const sort = await readExt('content/sort.js');
  assert.match(core, /function restoreNativeRankOrder/);
  assert.match(core, /RankMark_rank/);
  assert.match(sort, /isOriginalProductOrderValid/);
  assert.match(sort, /isProductListFullyLoaded/);
  assert.match(sort, /restoreNativeRankOrder\(productList\)/);
});

test('R19: search observers stay off non-search pages until navigation', async () => {
  const runtime = await readExt('content/page-runtime.js');
  assert.match(runtime, /function isSearchPage/);
  assert.match(runtime, /function stopSearchObservers/);
  assert.match(runtime, /function activateSearchObservers/);
  assert.match(runtime, /if \(!isSearchPage\(\)\) return/);
  assert.match(runtime, /if \(!onSearch\)[\s\S]*stopSearchObservers/);
});

test('R20: underfilled search results still allow custom sort', async () => {
  const runtime = await readExt('content/page-runtime.js');
  assert.match(runtime, /function isUnderfilledListStable/);
  assert.match(runtime, /isUnderfilledListStable\(length\)/);
  assert.match(runtime, /Coupang never pads the grid/);
});

test('R21: custom sort waits for list ready before activating', async () => {
  const sort = await readExt('content/sort.js');
  assert.match(sort, /function runSort[\s\S]*whenProductListReady\(\(\) => executeSort/);
  assert.match(sort, /function executeSort[\s\S]*applySortedProductOrder[\s\S]*activeKind = kind[\s\S]*saveActiveSort\(kind\)/);
  assert.doesNotMatch(sort, /function runSort[\s\S]*activeKind = kind[\s\S]*saveActiveSort\(kind\)/);
});

test('R22: reconcile stops perpetual interval after list load', async () => {
  const runtime = await readExt('content/page-runtime.js');
  assert.doesNotMatch(runtime, /setInterval\(reconcile/);
  assert.match(runtime, /function scheduleLoadWaitReconcile/);
  assert.match(runtime, /function scheduleDebouncedReconcile/);
  assert.match(runtime, /stopLoadWaitReconcile\(\)/);
});

test('R23: settings-bridge has no quick-cart listener', async () => {
  const bridge = await readExt('content/settings-bridge.js');
  assert.doesNotMatch(bridge, /quickCartEnabled/);
  const runtime = await readExt('content/page-runtime.js');
  assert.doesNotMatch(runtime, /quickCart/);
});
