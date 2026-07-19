# 알뜰이

A Manifest V3 Chrome extension that augments [Coupang](https://www.coupang.com) search results and related pages with custom sorting, configurable page elements, keyword filtering, result-count controls, quick add-to-cart, and optional product feedback. It is an **unofficial open-source tool with no affiliation, sponsorship, or delegation relationship with Coupang or its operator**. All shopping-related features are off by default.

**Repository:** https://github.com/intJoon/altteuri

## Features

- Unit-price, discount-rate, and price sorting controls.
- Configurable visibility for banners, promotions, and recommendation areas on search, product, cart, and order pages.
- Excluded-keyword filtering that persists across Coupang filters and pagination, then resets for a new search.
- Fixed search result counts of 36, 48, 60, or 72.
- Quick add-to-cart from search result cards by reusing Coupang's own product-page cart flow.
- **Send feedback:** an optional popup page for submitting up to 500 characters and viewing recent feedback. Submissions include the extension version and are sent through the developer-operated Vercel API for storage in Neon PostgreSQL.
- **Introduction website:** `web/` contains the product introduction, privacy information, feedback UI, serverless API, and database schema.

Most settings are stored in `chrome.storage.sync`. Active sort restoration and feedback drafts use `chrome.storage.local`.

### Feature scope

| Feature | Scope |
|---|---|
| Sorting, keyword filtering, result count, quick add-to-cart | Search results (`/np/search` on `www.coupang.com`) |
| Configurable page elements | Matching pages on `www`, `cart`, and `mc.coupang.com` |
| Feedback | Extension popup and the `web/` introduction site |
| Extension on/off tab reload | `www.coupang.com` only |

## Development installation

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository directory.

Reload the extension after changing its source files.

## Feedback flow

The popup and website send `GET` and `POST` requests to `https://altteuri.vercel.app/api/comments`. The Vercel serverless API validates the plain-text body, rejects honeypot submissions, and limits each IP address to two accepted submissions per UTC day. It stores only a daily HMAC of the IP for quota enforcement, while Neon credentials and the HMAC secret remain server-side. The extension receives access through its declared API `host_permissions`; database credentials are never included in extension or browser code.

No login, nickname, or personal identifier is requested. Users are instructed not to include personal information in free-text feedback. See the privacy policy for retention, deletion, and processing-provider details.

## Project structure

| Path | Role |
|---|---|
| `content.js` | Search-page behavior, configurable element visibility, and quick add-to-cart |
| `page-cart-hook.js` | PDP iframe MAIN-world hook for cart API observation and clicks |
| `preset-data.js` | Built-in page-element presets loaded before `content.js` and `popup.js` |
| `hangul-search.js` | Korean initial-consonant and jamo search for the preset list |
| `popup.html` / `popup.js` | Settings popup, preset page, and feedback page |
| `background.js` | Default settings, migrations, first-install legal page, and MAIN-world injection relay |
| `manifest.json` | Extension manifest and permissions; version matches `docs/버전.md` |
| `legal.html` | Bundled privacy policy and terms shown after first installation |
| `web/` | Introduction/privacy site, feedback UI, Vercel API, Neon client, and SQL schema |
| `docs/` | Korean development records, version SSOT, privacy policy, and terms |

## Storage

`chrome.storage.sync` holds feature toggles, sort preferences, excluded keywords, result-count settings, and preset visibility choices. `chrome.storage.local` holds the active sort/query pair and the unsent feedback draft. The built-in preset list remains in `preset-data.js`.

Shopping settings stay in the user's browser and are not sent to the developer-operated service. Only feedback that the user explicitly submits, together with the extension version, is sent to the feedback API.

## Privacy and legal notices

The extension does not collect browsing history, Coupang account information, or purchase history. Optional feedback is a separate flow: the submitted text and extension version are processed by the developer-operated Vercel service and stored in Neon for product improvement.

- Privacy policy: [`docs/개인정보처리방침.md`](docs/개인정보처리방침.md)
- Terms and disclaimer: [`docs/이용약관.md`](docs/이용약관.md)
- `legal.html` bundles both notices for the first-install page.
- `web/` provides the public introduction and privacy page used by the deployed service.

## Documentation

- Version history: [`docs/버전.md`](docs/버전.md)
- Design decisions: [`docs/방법론.md`](docs/방법론.md)
- Sources: [`docs/출처.md`](docs/출처.md)
- Replacements and removals: [`docs/업그레이드.md`](docs/업그레이드.md)
