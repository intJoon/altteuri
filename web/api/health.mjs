import { getSql } from "../lib/db.mjs";

export default async function handler(_req, res) {
  const sql = getSql();
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(
    JSON.stringify({
      ok: true,
      database: sql ? "configured" : "missing",
      timestamp: new Date().toISOString(),
    })
  );
}
