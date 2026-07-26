# Contributing to Altteuri

Thank you for helping improve Altteuri. This repository combines a Chrome MV3 extension, a Vercel web/API surface, and document-driven tests.

## Before you open a PR

1. Run the full test suite from the repository root:

```bash
npm ci
npm ci --prefix web
npm test
npm run lint
npm run build:extension
```

2. If you change legal markdown under `docs/`, regenerate HTML:

```bash
npm run generate:legal
npm test
```

3. Keep user-facing docs in Korean unless the target file is explicitly English (README, commit messages, PR text).

## What to update together

| Change | Also review |
|--------|-------------|
| New setting key | `extension/settings-defaults.js`, popup UI, `settings-bridge.js`, `docs/업그레이드.md`, tests |
| Coupang DOM selector | `extension/content/selectors.js`, `extension/content/core.js` or `extension/preset-data.js`, `docs/출처.md`, `docs/QC.md`, selector smoke test |
| Onboarding UX | `extension/popup-onboarding.js`, `extension/content/onboarding-banner.js`, e2e smoke test |
| Intro video | `video/shorts/index.html`, `npm run generate:sfx`, copy render to `web/public/intro.mp4` |
| Release | `node tools/release.mjs <semver>`, `docs/버전.md`, `docs/QC.md` |
| Public site origin | `shared/site-config.mjs`, `extension/manifest.json` `homepage_url`, `npm run generate:legal` |
| Feedback API contract | `web/lib/comments-service.mjs`, `tools/tests/web/`, popup feedback UI |
| Extension version | `extension/manifest.json`, `docs/버전.md`, cache-bust query on `web/public/index.html` |

## Architecture pointers

- Content scripts load in two phases: `document_start` for early hide CSS, `document_idle` for feature modules.
- `chrome.storage.onChanged` is handled only in `extension/content/settings-bridge.js`.
- Pure, DOM-free logic belongs in `extension/pure-logic.js` with tests in `tools/tests/extension/pure-logic.test.mjs`.

## Local Coupang inspection

Optional Puppeteer scripts live in `tools/alt-inspect/`. Set `CHROME_PATH` if Chrome is not in a default location.

## Chrome Web Store

Store listing assets and submission are not automated. See `README.md` for permission justification notes.
