# Chrome Web Store assets

Listing copy and build steps: [`docs/CHROME_WEB_STORE.md`](../docs/CHROME_WEB_STORE.md).

## Screenshot templates (1280×800)

Open in Chrome, set window to 1280×800 (or use DevTools device mode), capture:

| File | Scene |
| --- | --- |
| `screenshots/01-popup.html` | Extension popup — features off |
| `screenshots/02-sort.html` | Unit-price sort on search results |
| `screenshots/03-filter.html` | Keyword filter |
| `screenshots/04-display.html` | Display presets |

## Promo tile

`promo-tile.svg` — export to 440×280 PNG for optional store promo.

## Package

```bash
npm run build:extension
```
