# Chrome Web Store listing — 알뜰이

Store submission checklist and copy. Keep in sync with `apps/extension/manifest.json` and [`README.md`](../README.md).

## Build upload package

```bash
npm run build:extension
```

Output: `dist/altteuri-extension-v{version}.zip` (manifest at zip root).

## Required assets

| Asset | Size | File / source |
| --- | --- | --- |
| Icon | 128×128 | `apps/extension/assets/icons/icon128.png` (source: `assets/brand/`) |
| Screenshots | 1280×800 (min 1, max 5) | Capture from `assets/store/screenshots/*.html` or live extension |
| Promo tile (optional) | 440×280 | `assets/store/promo-tile.svg` → export PNG |
| Small promo (optional) | 440×280 | Same as promo tile |

Open each HTML under `assets/store/screenshots/` in Chrome at 100% zoom, DevTools → capture full size screenshot, or use OS screenshot at 1280×800.

## Listing copy (Korean — primary)

**Name:** 알뜰이

**Summary (132 chars max):**  
쿠팡 검색에서 단위가격·할인율·가격 정렬, 키워드 필터, 표시 항목 조정. 모든 기능은 꺼진 채로 시작하며 사용자가 켭니다.

**Description:**

```
쿠팡 검색 결과를 더 알뜰하게 비교하는 Chrome 확장입니다.

■ 모든 기능은 opt-in
설치만으로 페이지가 바뀌지 않습니다. 확장 팝업에서 원하는 기능만 켜세요.

■ 정렬
단위가격순, 할인율순, 가격순으로 검색 결과를 재정렬합니다.

■ 키워드 필터
제외할 키워드를 추가하면 해당 상품을 숨깁니다. 검색어를 바꾸면 제외 목록이 초기화됩니다.

■ 페이지 표시 항목 조정
광고·배너 등 표시할 요소를 선택합니다. 체크 해제한 항목만 숨깁니다.

■ 검색 개수 고정
36·48·60·72개 중 선택한 개수로 검색 URL을 맞춥니다.

■ 의견 보내기 (선택)
확장에서 제출한 의견은 공개 목록에 표시될 수 있습니다. 개인정보는 넣지 마세요.

알뜰이는 쿠팡과 제휴하지 않은 독립 오픈소스 프로젝트입니다.
소스 코드: https://github.com/intJoon/altteuri
홈페이지: https://altteuri.vercel.app/
```

**Category:** Shopping

**Language:** Korean

**Privacy policy URL:** https://altteuri.vercel.app/legal.html#privacy

**Homepage URL:** https://altteuri.vercel.app/ (also in manifest)

## Permission justification (review)

| Permission / host | User-facing reason |
| --- | --- |
| `storage` | Save per-feature settings locally |
| `tabs` | Reload Coupang tabs after settings migration; open legal/feedback links |
| `https://www.coupang.com/*` | Run on Coupang search and related pages |
| `https://cart.coupang.com/*`, `https://mc.coupang.com/*` | Apply display presets on cart and order pages |
| `https://altteuri.vercel.app/*` | Submit and list optional public feedback |

## Single purpose

Provide optional shopping-assist tools (sort, filter, display presets) on Coupang pages the user already visits. No unrelated browsing modification.

## Data use

- Settings: `chrome.storage.sync` only, not sent to servers.
- Feedback (optional): text + extension version to Vercel API; may appear in public list. See privacy policy.

## Pre-submit QA

1. `npm run build:extension` — zip loads in `chrome://extensions` → Load unpacked equivalent test via zip install if available, or verify zip structure.
2. Run [`docs/QC.md`](QC.md) manual checklist on the zipped build.
3. Confirm `minimum_chrome_version` is **105** (`:has()` presets).
4. Confirm gray icon when all features off, colored when any on.

## After publish

- Update `apps/web/public/index.html` install CTA with Chrome Web Store URL.
- Update `README.md` Install section with store link.
- Tag release on GitHub matching manifest version.
