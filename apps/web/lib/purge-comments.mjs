import { COMMENT_RETENTION_DAYS } from "./site-config.mjs";

export async function purgeExpiredComments(sql) {
  if (!sql) return 0;
  const rows = await sql`
    DELETE FROM comments
    WHERE created_at < NOW() - (${COMMENT_RETENTION_DAYS} * INTERVAL '1 day')
    RETURNING id
  `;
  return rows.length;
}
