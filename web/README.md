# Altteuri web deployment

Deploy this directory as the Vercel project root.

## Required environment variables

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `RATE_LIMIT_SECRET`: secret used to derive daily, non-reversible rate-limit identifiers.
- `EXTENSION_IDS`: optional comma-separated allowlist of Chrome extension IDs. Leave empty only when unpacked builds with changing IDs must submit feedback.

The static site is served from `public/`; `/api/comments` is the feedback API. After deployment, verify `/`, `/legal.html`, `/robots.txt`, `/sitemap.xml`, `/og-image.png`, an unknown URL returning the custom page with HTTP 404, and the response security headers.
