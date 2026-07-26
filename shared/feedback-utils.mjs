import { FEEDBACK_PAGE_SIZE } from "./site-config.mjs";

export { FEEDBACK_PAGE_SIZE };

export function formatFeedbackDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

export function parseCommentsPage(data) {
  return {
    comments: Array.isArray(data?.comments) ? data.comments : [],
    total: Number.isFinite(data?.total) ? data.total : 0,
    hasMore: Boolean(data?.hasMore),
  };
}

export function normalizeCommentBody(body) {
  const text = typeof body === "string" ? body.trim() : "";
  return text;
}
