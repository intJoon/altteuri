# Altteuri web deployment

Deploy this directory as the Vercel project root.

## Required environment variables

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `RATE_LIMIT_SECRET`: secret used to derive daily, non-reversible rate-limit identifiers.
- `EXTENSION_IDS`: optional comma-separated allowlist of Chrome extension IDs. Empty keeps unpacked/local installs working; set in production to lock origins.

The static site is served from `public/`; `/api/comments` is the feedback API. After deployment, verify `/`, `/legal.html`, and that unknown URLs return HTTP 404.
