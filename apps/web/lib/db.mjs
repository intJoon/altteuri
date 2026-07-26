import { neon } from "@neondatabase/serverless";

let sql;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!sql) sql = neon(url);
  return sql;
}
