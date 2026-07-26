# Altteuri

A Chrome extension for sorting, filtering, and simplifying [Coupang](https://www.coupang.com) search results. Every feature is opt-in.

## Features

- Sort results by unit price, discount rate, or price.
- Hide unwanted results and distracting page elements (uncheck a display preset to hide it).
- Choose how many results appear per search.
- Optionally submit feedback and view recent public feedback.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension/` directory in this repository.

## Development

Run the full test suite from the repository root:

```bash
npm ci --prefix web
npm test
npm run lint
```

Individual suites:

```bash
npm run test:extension
npm run test:web
npm run generate:legal
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for change checklists. The project is released under the [MIT License](LICENSE).

After editing `docs/개인정보처리방침.md` or `docs/이용약관.md`, regenerate HTML and verify sync:

```bash
npm run generate:legal
npm test
```

## Directory map

- `extension/` — unpacked Chrome extension
- `web/` — public site and feedback API
- `docs/` — methodology, release history, QC, and legal sources
- `tools/` — legal generation, inspection scripts, automated tests

## Privacy and legal

Settings stay in the browser. Optional feedback and the extension version are sent only when the user submits feedback; submitted text may appear in the public feedback list.

- Privacy policy: [`docs/개인정보처리방침.md`](docs/개인정보처리방침.md)
- Terms and disclaimer: [`docs/이용약관.md`](docs/이용약관.md)
- Generated HTML: `npm run generate:legal` → `extension/legal.html`, `web/public/legal.html`

Altteuri is an independent open-source project and is not affiliated with Coupang.

## Web API (production)

Deploy `web/` to Vercel. Required environment variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `RATE_LIMIT_SECRET` | Derives daily, non-reversible rate-limit identifiers for feedback POST |
| `EXTENSION_IDS` | Optional comma-separated Chrome extension IDs allowed to POST feedback. Leave empty for unpacked/local installs; set in production |
| `CRON_SECRET` | Optional bearer token for `/api/purge-comments` daily retention cleanup (defaults to `RATE_LIMIT_SECRET` when unset) |

Without `DATABASE_URL`, feedback list/submit returns HTTP 503. Without `RATE_LIMIT_SECRET`, feedback POST returns HTTP 503 even when the database is configured. `/api/health` reports whether the database is configured.

See [`web/README.md`](web/README.md) for deployment details.

## Chrome Web Store

`extension/manifest.json` includes `homepage_url` (`https://altteuri.vercel.app/`). Privacy policy and terms are linked from the extension popup and install-time legal page.

Permission justification for store review:

| Permission / host | Why |
|-------------------|-----|
| `storage` | Save per-feature opt-in settings in the browser |
| `tabs` | Reload Coupang tabs after settings migration; open legal/feedback links from the popup |
| `https://www.coupang.com/*` | Run content scripts on search and related pages |
| `https://cart.coupang.com/*`, `https://mc.coupang.com/*` | Apply display presets on cart and order-list pages |
| `https://altteuri.vercel.app/*` | Submit and list optional public feedback |

Distribution today is **Load unpacked** from this repository. Store listing assets and submission are not automated in CI.
