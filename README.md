# Coupang Result Add-on

Chrome extension that enhances Coupang search results with custom sort options, ad removal, keyword filtering, and list size control.

## Features

- Unit price, discount rate, and price sorting
- Remove banners, promotions, and sponsored product listings
- Keyword exclusion filter
- Force list size (36 / 48 / 72)

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

## Development

This is a Manifest V3 extension. Main entry points:

- `content.js` — search page enhancements
- `popup.html` / `popup.js` — settings UI
- `background.js` — default settings on install
