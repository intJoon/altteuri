# Altteuri

A Chrome extension for sorting, filtering, and simplifying [Coupang](https://www.coupang.com) search results. Every feature is opt-in.

## Install

**Website:** [altteuri.vercel.app](https://altteuri.vercel.app/)

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `apps/extension/` in this repository.

Store listing: [`docs/CHROME_WEB_STORE.md`](docs/CHROME_WEB_STORE.md). Build zip: `npm run build:extension`.

## Development

```bash
npm ci
npm ci --prefix apps/web
npm run generate:extension-lib
npm test
npm run lint
npm run build:extension
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Legal markdown changes: `npm run generate:legal && npm test`. Shared logic changes: `npm run generate:extension-lib && npm test`.

## Layout

| Folder | Purpose |
|--------|---------|
| `apps/extension/` | Chrome extension (Load unpacked) |
| `apps/web/` | Site + feedback API (Vercel root: `apps/web`) |
| `assets/` | Brand icons, store screenshots, intro video |
| `shared/` | Cross-app constants and pure logic |
| `docs/` | Korean ops docs, QC, legal sources |
| `tools/scripts/` | Generate, sync, release, build |
| `tools/tests/` | Automated tests |

## Privacy

Settings stay in the browser. Feedback is optional; submitted text may appear publicly. [Privacy policy (KO)](docs/개인정보처리방침.md) · [Terms (KO)](docs/이용약관.md)

Not affiliated with Coupang. [MIT License](LICENSE).

## Deploy

Web API env vars and deployment: [`apps/web/README.md`](apps/web/README.md).
