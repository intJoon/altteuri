import assert from "node:assert/strict";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const handlerUrl = pathToFileURL(resolve(repo, "web/api/health.mjs")).href;

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

test("health endpoint reports database configuration state", async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const { default: handler } = await import(`${handlerUrl}?t=${Date.now()}`);
  const res = createRes();
  await handler({}, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.database, "missing");
  if (previous === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previous;
});
