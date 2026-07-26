import assert from "node:assert/strict";
import test from "node:test";
import { handleCommentsRequest, insertFeedback } from "../../../web/lib/comments-service.mjs";

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

function parseJsonBody(res) {
  return JSON.parse(res.body);
}

test("POST returns 201 when feedback is inserted", async () => {
  const req = {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: { body: "hello from test" },
  };
  const res = createRes();
  const sql = async (strings, ...values) => {
    const query = String.raw(strings, ...values);
    if (query.includes("INSERT INTO comments")) {
      return [{ id: 1, body: "hello from test", version: null, createdAt: "2026-07-26T00:00:00.000Z" }];
    }
    if (query.includes("feedback_rate_limits")) return [{ ok: 1 }];
    return [];
  };

  await handleCommentsRequest(req, res, {
    getSql: () => sql,
    rateLimitSecret: "test-secret",
  });

  assert.equal(res.statusCode, 201);
  assert.equal(parseJsonBody(res).comment.body, "hello from test");
});

test("POST returns 429 when daily quota is exhausted", async () => {
  const req = {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
    body: { body: "one more" },
  };
  const res = createRes();
  const sql = async (strings, ...values) => {
    const query = String.raw(strings, ...values);
    if (query.includes("INSERT INTO comments")) return [];
    if (query.includes("feedback_rate_limits")) return [];
    return [];
  };

  await handleCommentsRequest(req, res, {
    getSql: () => sql,
    rateLimitSecret: "test-secret",
  });

  assert.equal(res.statusCode, 429);
  assert.equal(parseJsonBody(res).error, "rate_limited");
  assert.equal(res.headers["retry-after"], "86400");
});

test("insertFeedback returns null without rate-limit secret", async () => {
  const sql = async () => [];
  const inserted = await insertFeedback(sql, { headers: {} }, "body", null, {
    rateLimitSecret: "",
  });
  assert.equal(inserted, null);
});
