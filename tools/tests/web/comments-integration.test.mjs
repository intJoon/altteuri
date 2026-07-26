import assert from "node:assert/strict";
import test from "node:test";
import { handleCommentsRequest } from "../../../apps/web/lib/comments-service.mjs";

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    end(body) {
      if (body !== undefined) this.body = body;
    },
  };
}

test("GET returns comments list with pagination metadata", async () => {
  const req = { method: "GET", headers: {}, url: "/api/comments?limit=5&offset=0" };
  const res = createRes();
  const rows = [
    { id: 2, body: "second", version: "2.2.6", createdAt: "2026-07-26T01:00:00.000Z" },
    { id: 1, body: "first", version: "2.2.6", createdAt: "2026-07-26T00:00:00.000Z" },
  ];
  const sql = async (strings) => {
    const q = String.raw(strings);
    if (q.includes("COUNT(*)")) return [{ total: 2 }];
    if (q.includes("FROM comments")) return rows;
    return [];
  };

  await handleCommentsRequest(req, res, { getSql: () => sql, rateLimitSecret: "secret" });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.comments.length, 2);
  assert.equal(data.comments[0].body, "second");
  assert.equal(data.total, 2);
  assert.equal(data.hasMore, false);
});

test("GET returns empty list when database has no rows", async () => {
  const req = { method: "GET", headers: {}, url: "/api/comments" };
  const res = createRes();
  const sql = async (strings) => {
    const q = String.raw(strings);
    if (q.includes("COUNT(*)")) return [{ total: 0 }];
    if (q.includes("FROM comments")) return [];
    return [];
  };

  await handleCommentsRequest(req, res, { getSql: () => sql, rateLimitSecret: "secret" });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.deepEqual(data.comments, []);
  assert.equal(data.total, 0);
});

test("POST accepts honeypot silently", async () => {
  const req = {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.12" },
    body: { body: "spam", website: "filled" },
  };
  const res = createRes();
  const sql = async () => [];

  await handleCommentsRequest(req, res, { getSql: () => sql, rateLimitSecret: "secret" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
});
