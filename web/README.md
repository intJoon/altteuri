# Altteuri web deployment

Deploy this directory as the Vercel project root.

## Required environment variables

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `RATE_LIMIT_SECRET`: secret used to derive daily, non-reversible rate-limit identifiers. **Required for feedback POST.** Without it the API returns HTTP 503 (`rate_limit_unavailable`).

## Recommended for production

- `EXTENSION_IDS`: comma-separated allowlist of Chrome extension IDs. Empty keeps unpacked/local installs working; **set in production** to restrict feedback POST origins to your published extension ID(s).

The static site is served from `public/`; `/api/comments` is the feedback API. After deployment, verify `/`, `/legal.html`, and that unknown URLs return HTTP 404.

## Local API behavior

- GET `/api/comments` without `DATABASE_URL` → HTTP 503
- POST `/api/comments` without `DATABASE_URL` → HTTP 503
- POST without `RATE_LIMIT_SECRET` → HTTP 503 (`rate_limit_unavailable`)

Run API contract tests from the repository root: `npm run test:web`
