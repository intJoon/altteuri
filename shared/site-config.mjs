/** Canonical site-wide constants. Keep manifest `homepage_url` in sync. */
export const SITE_ORIGIN = "https://altteuri.vercel.app";
export const FEEDBACK_PAGE_SIZE = 5;
export const FEEDBACK_MAX_LEN = 500;
export const FEEDBACK_COUNT_SHOW_AT = 450;
export const MAX_EXCLUDED_KEYWORDS = 50;
export const MAX_KEYWORD_LENGTH = 50;
export const MIN_CHROME_VERSION = "105";
export const COMMENT_RETENTION_DAYS = 730;

export function siteUrl(path = "/") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${suffix}`;
}
