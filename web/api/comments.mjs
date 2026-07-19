import { createHmac } from "node:crypto";
import { getSql } from "../lib/db.mjs";

const MAX_BODY = 500;
const MAX_VERSION = 50;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DAILY_POST_LIMIT = 2;

function requestOrigin(req) {
  const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  return host ? `${protocol}://${host}` : "";
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;

  let isExtension = false;
  try {
    isExtension = new URL(origin).protocol === "chrome-extension:";
  } catch {}

  if (isExtension || origin === requestOrigin(req)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(raw) {
  if (!raw) return null;
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) return raw;
  try {
    return JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : raw);
  } catch {
    return null;
  }
}

async function readJsonBody(req) {
  if (req.body !== undefined) return parseBody(req.body);

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) return null;
    chunks.push(chunk);
  }
  return parseBody(Buffer.concat(chunks).toString("utf8"));
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0] || "unknown";
  return String(forwarded || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function dailyRateLimitIdentity(req) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) return null;
  const day = new Date().toISOString().slice(0, 10);
  const ip = clientIp(req);
  const ipHash = createHmac("sha256", secret).update(`${day}\n${ip}`).digest("hex");
  return { day, ipHash };
}

async function insertFeedback(sql, req, body, version) {
  const identity = dailyRateLimitIdentity(req);
  if (!identity) return null;
  return sql`
    WITH cleanup AS (
      DELETE FROM feedback_rate_limits
      WHERE day < CAST(${identity.day} AS date) - 7
      RETURNING 1
    ),
    quota AS (
      INSERT INTO feedback_rate_limits (day, ip_hash, post_count)
      VALUES (${identity.day}, ${identity.ipHash}, 1)
      ON CONFLICT (day, ip_hash) DO UPDATE
      SET post_count = feedback_rate_limits.post_count + 1
      WHERE feedback_rate_limits.post_count < ${DAILY_POST_LIMIT}
      RETURNING 1
    )
    INSERT INTO comments (body, version)
    SELECT ${body}, ${version} FROM quota
    RETURNING id, body, version, created_at AS "createdAt"
  `;
}

function parsePageNumber(value, fallback) {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

export default async function handler(req, res) {
  setCors(req, res);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  }

  if (req.method === "GET") {
    const sql = getSql();
    if (!sql) return json(res, 503, { error: "comments_unavailable" });

    const url = new URL(req.url || "/", "http://localhost");
    const limit = Math.min(
      Math.max(parsePageNumber(url.searchParams.get("limit"), DEFAULT_PAGE_SIZE), 1),
      MAX_PAGE_SIZE
    );
    const offset = Math.max(parsePageNumber(url.searchParams.get("offset"), 0), 0);

    try {
      const countRows = await sql`SELECT COUNT(*)::int AS total FROM comments`;
      const total = countRows[0]?.total ?? 0;
      const comments = await sql`
        SELECT id, body, version, created_at AS "createdAt"
        FROM comments
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return json(res, 200, {
        comments,
        total,
        hasMore: offset + comments.length < total,
      });
    } catch {
      return json(res, 500, { error: "read_failed" });
    }
  }

  if (req.method === "POST") {
    const payload = await readJsonBody(req);
    if (!payload) return json(res, 400, { error: "invalid_json" });
    if (payload.website) return json(res, 200, { ok: true });

    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!body || body.length > MAX_BODY) {
      return json(res, 400, { error: "invalid_body" });
    }

    let version = null;
    if (payload.version !== undefined && payload.version !== null) {
      if (typeof payload.version !== "string") {
        return json(res, 400, { error: "invalid_version" });
      }
      version = payload.version.trim() || null;
      if (version && version.length > MAX_VERSION) {
        return json(res, 400, { error: "invalid_version" });
      }
    }

    const sql = getSql();
    if (!sql) return json(res, 503, { error: "comments_unavailable" });

    try {
      const inserted = await insertFeedback(sql, req, body, version);
      if (inserted === null) {
        return json(res, 503, { error: "rate_limit_unavailable" });
      }
      if (!inserted.length) {
        res.setHeader("Retry-After", "86400");
        return json(res, 429, { error: "rate_limited" });
      }
      return json(res, 201, { comment: inserted[0] });
    } catch {
      return json(res, 500, { error: "write_failed" });
    }
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return json(res, 405, { error: "method_not_allowed" });
}
