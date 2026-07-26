# Contributing to Altteuri

## Before you open a PR

```bash
npm ci
npm ci --prefix apps/web
npm run generate:extension-lib
npm test
npm run lint
npm run build:extension
```

Legal markdown changes: `npm run generate:legal && npm test`

Shared logic changes: `npm run generate:extension-lib && npm test`

User-facing docs: Korean unless the file is English by convention (README, commits, PRs).

## What to update together

| Change | Also review |
|--------|-------------|
| New setting key | `apps/extension/lib/settings-defaults.js`, popup UI, `settings-bridge.js`, `docs/업그레이드.md`, tests |
| Coupang DOM selector | `content/selectors.js`, `lib/preset-data.js`, `docs/출처.md`, `docs/QC.md`, selector smoke test |
| Onboarding UX | `content/onboarding-banner.js`, e2e smoke test |
| Intro video | `assets/video/shorts/compositions/`, `npm run sync:intro` |
| Brand icons | `assets/brand/`, `npm run sync:assets` |
| Release | `node tools/scripts/release.mjs <semver>`, `docs/버전.md`, `docs/QC.md` |
| Public site origin | `shared/site-config.mjs`, manifest `homepage_url`, `npm run generate:legal` |
| Extension version | manifest, `docs/버전.md`, `npm run sync:public-meta` |

## Architecture

- Content scripts: `document_start` (early hide) → `document_idle` (features).
- `chrome.storage.onChanged` only in `content/settings-bridge.js`.
- Pure logic: `shared/pure-logic.mjs` → `npm run generate:extension-lib`.

Optional Coupang DOM inspection: `tools/inspect/alt-inspect/` (`CHROME_PATH` if needed).
