// File upload safety test: an uploaded file must never be served back as active content
// (HTML/SVG/JS) from our own origin. LOCAL API only.
//
//   API_URL=http://localhost:3100 TEST_PASSWORD=... CLIENT_EMAIL=... node --test scripts/smoke-upload.mjs
import assert from "node:assert/strict";
import test from "node:test";

const API_URL = process.env.API_URL ?? "http://localhost:3100";
const PASSWORD = process.env.TEST_PASSWORD;
const { CLIENT_EMAIL } = process.env;

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API_URL)) {
  throw new Error(`Refusing to run against ${API_URL}: only localhost is allowed`);
}
if (!PASSWORD || !CLIENT_EMAIL) throw new Error("Set TEST_PASSWORD and CLIENT_EMAIL");

let token;

test.before(async () => {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CLIENT_EMAIL, password: PASSWORD }),
  });
  assert.equal(res.status, 200);
  token = (await res.json()).mobileToken;
});

async function upload(filename, mimetype, content) {
  const form = new FormData();
  form.append("file", new Blob([content], { type: mimetype }), filename);
  return fetch(`${API_URL}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
}

test("HTML disguised as an image is never served as HTML", async () => {
  const res = await upload("evil.html", "image/png", "<script>alert(document.domain)</script>");
  if (res.status !== 200) {
    assert.equal(res.status, 400, "rejecting the file is fine");
    return;
  }
  const { url } = await res.json();
  assert.ok(!/\.(html?|svg|xml|js|mjs)$/i.test(url), `stored with a dangerous extension: ${url}`);
  const served = await fetch(`${API_URL}${url}`);
  assert.ok(!/text\/html|svg|javascript|xml/i.test(served.headers.get("content-type") ?? ""), `served as ${served.headers.get("content-type")}`);
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  assert.match(served.headers.get("content-security-policy") ?? "", /default-src 'none'.*sandbox/, "uploads are served with a locked-down CSP");
});

test("double extensions and odd names cannot smuggle an extension", async () => {
  const res = await upload("photo.png.html", "image/jpeg", "<h1>x</h1>");
  if (res.status !== 200) return;
  const { url } = await res.json();
  assert.match(url, /\.(jpg|jpeg|png|webp)$/i, `unexpected extension in ${url}`);
});

test("a genuine image still uploads and is served as an image", async () => {
  // 1x1 transparent PNG
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const res = await upload("avatar.png", "image/png", png);
  assert.equal(res.status, 200);
  const { url } = await res.json();
  assert.match(url, /\.png$/);
  const served = await fetch(`${API_URL}${url}`);
  assert.equal(served.status, 200);
  assert.match(served.headers.get("content-type") ?? "", /image\/png/);
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
});

test("a file whose content does not match its type is rejected", async () => {
  assert.equal((await upload("fake.png", "image/png", "<script>alert(1)</script>")).status, 400);
  assert.equal((await upload("fake.pdf", "application/pdf", "MZ not a pdf")).status, 400);
});

test("types outside the allow-list are refused", async () => {
  assert.equal((await upload("a.html", "text/html", "<h1>x</h1>")).status, 400);
  assert.equal((await upload("a.svg", "image/svg+xml", "<svg onload=alert(1)/>")).status, 400);
  assert.equal((await upload("a.js", "application/javascript", "alert(1)")).status, 400);
});

test("anonymous uploads are refused", async () => {
  const form = new FormData();
  form.append("file", new Blob(["x"], { type: "image/png" }), "a.png");
  assert.equal((await fetch(`${API_URL}/api/upload`, { method: "POST", body: form })).status, 401);
});
