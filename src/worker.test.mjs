import assert from "node:assert/strict";
import test from "node:test";
import {
  base64urlToBytes,
  bytesToBase64url,
  openSealed,
  parseCookies,
  safeReturnTo,
  seal,
} from "./worker.js";

const secret = "0123456789abcdefghijklmnopqrstuvwxyz";

test("base64url round trip", () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
  assert.deepEqual(base64urlToBytes(bytesToBase64url(bytes)), bytes);
});

test("sealed payload round trip", async () => {
  const payload = { sub: "auth0|abc", email: "a@example.com", exp: 123 };
  const token = await seal(payload, secret);
  assert.match(token, /^v1\./);
  assert.deepEqual(await openSealed(token, secret), payload);
});

test("sealed payload rejects wrong secret", async () => {
  const token = await seal({ ok: true }, secret);
  await assert.rejects(() => openSealed(token, "wrong secret value with enough length"));
});

test("safeReturnTo allows relative paths", () => {
  const request = new Request("https://id.bitneedle.com/login");
  assert.equal(safeReturnTo("/press", request, {}), "/press");
  assert.equal(safeReturnTo("//evil.test", request, {}), "/");
});

test("safeReturnTo allows configured origins", () => {
  const request = new Request("https://id.bitneedle.com/login");
  const env = { ALLOWED_RETURN_ORIGINS: "https://bitneedle.com" };
  assert.equal(
    safeReturnTo("https://bitneedle.com/press", request, env),
    "https://bitneedle.com/press",
  );
  assert.equal(safeReturnTo("https://evil.test/press", request, env), "/");
});

test("safeReturnTo allows cookie domain subdomains", () => {
  const request = new Request("https://id.bitneedle.com/login");
  const env = { COOKIE_DOMAIN: ".bitneedle.com" };
  assert.equal(
    safeReturnTo("https://www.bitneedle.com/press", request, env),
    "https://www.bitneedle.com/press",
  );
});

test("parseCookies handles normal cookie headers", () => {
  const cookies = parseCookies("a=1; b=two; c=three=four");
  assert.equal(cookies.get("a"), "1");
  assert.equal(cookies.get("b"), "two");
  assert.equal(cookies.get("c"), "three=four");
});
