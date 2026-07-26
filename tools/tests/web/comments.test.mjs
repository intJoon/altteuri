import assert from "node:assert/strict";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const handlerUrl = pathToFileURL(resolve(repo, "apps/web/api/comments.mjs")).href;

function createRes() {
  const res = {
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
  return res;
}

function parseJsonBody(res) {
  return JSON.parse(res.body);
}

async function withHandler(env, run) {
  const previous = {
    DATABASE_URL: process.env.DATABASE_URL,
    RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET,
    EXTENSION_IDS: process.env.EXTENSION_IDS,
  };

  delete process.env.DATABASE_URL;
  delete process.env.RATE_LIMIT_SECRET;
  delete process.env.EXTENSION_IDS;
  Object.assign(process.env, env);

  const { default: handler } = await import(`${handlerUrl}?t=${Date.now()}-${Math.random()}`);

  try {
    await run(handler);
  } finally {
    if (previous.DATABASE_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.DATABASE_URL;
    if (previous.RATE_LIMIT_SECRET === undefined) delete process.env.RATE_LIMIT_SECRET;
    else process.env.RATE_LIMIT_SECRET = previous.RATE_LIMIT_SECRET;
    if (previous.EXTENSION_IDS === undefined) delete process.env.EXTENSION_IDS;
    else process.env.EXTENSION_IDS = previous.EXTENSION_IDS;
  }
}

test("OPTIONS returns 204 with CORS headers for site origin", async () => {
  await withHandler({}, async (handler) => {
    const req = {
      method: "OPTIONS",
      headers: {
        origin: "https://altteuri.vercel.app",
        host: "altteuri.vercel.app",
        "x-forwarded-proto": "https",
      },
      url: "/api/comments",
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers["access-control-allow-origin"], "https://altteuri.vercel.app");
    assert.equal(res.headers["access-control-allow-methods"], "GET, POST, OPTIONS");
  });
});

test("GET without DATABASE_URL returns 503", async () => {
  await withHandler({}, async (handler) => {
    const req = { method: "GET", headers: {}, url: "/api/comments" };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.statusCode, 503);
    assert.equal(parseJsonBody(res).error, "comments_unavailable");
  });
});

test("POST honeypot returns 200 without touching the database", async () => {
  await withHandler({}, async (handler) => {
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { body: "spam", website: "bot" },
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(parseJsonBody(res), { ok: true });
  });
});

test("POST invalid JSON returns 400", async () => {
  await withHandler({}, async (handler) => {
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(parseJsonBody(res).error, "invalid_json");
  });
});

test("POST empty body returns 400", async () => {
  await withHandler({}, async (handler) => {
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { body: "   " },
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(parseJsonBody(res).error, "invalid_body");
  });
});

test("POST without DATABASE_URL returns 503", async () => {
  await withHandler({ RATE_LIMIT_SECRET: "test-secret" }, async (handler) => {
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { body: "hello" },
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.statusCode, 503);
    assert.equal(parseJsonBody(res).error, "comments_unavailable");
  });
});

test("POST documents rate-limit guard when secret is missing", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(resolve(repo, "apps/web/lib/comments-service.mjs"), "utf8");
  assert.match(source, /dailyRateLimitIdentity/);
  assert.match(source, /if \(inserted === null\)/);
  assert.match(source, /rate_limit_unavailable/);
});

test("unsupported method returns 405", async () => {
  await withHandler({}, async (handler) => {
    const req = { method: "PUT", headers: {}, url: "/api/comments" };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.statusCode, 405);
    assert.equal(parseJsonBody(res).error, "method_not_allowed");
    assert.equal(res.headers.allow, "GET, POST, OPTIONS");
  });
});

test("CORS allows unpacked extension when EXTENSION_IDS is empty", async () => {
  await withHandler({}, async (handler) => {
    const req = {
      method: "OPTIONS",
      headers: { origin: "chrome-extension://local-dev-id" },
      url: "/api/comments",
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.headers["access-control-allow-origin"], "chrome-extension://local-dev-id");
  });
});

test("CORS blocks unknown extension when EXTENSION_IDS is set", async () => {
  await withHandler({ EXTENSION_IDS: "allowed-id" }, async (handler) => {
    const req = {
      method: "OPTIONS",
      headers: { origin: "chrome-extension://other-id" },
      url: "/api/comments",
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });
});

test("CORS allows listed extension id", async () => {
  await withHandler({ EXTENSION_IDS: "allowed-id,another-id" }, async (handler) => {
    const req = {
      method: "OPTIONS",
      headers: { origin: "chrome-extension://allowed-id" },
      url: "/api/comments",
    };
    const res = createRes();
    await handler(req, res);
    assert.equal(res.headers["access-control-allow-origin"], "chrome-extension://allowed-id");
  });
});
