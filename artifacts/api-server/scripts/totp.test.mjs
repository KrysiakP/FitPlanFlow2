// node --test scripts/totp.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { base32Decode, base32Encode, generateBackupCodes, hashBackupCode, openSecret, otpauthUrl, sealSecret, totpCode, verifyTotp } from "../src/lib/totp.ts";
import { stripSecrets } from "../src/lib/publicUser.ts";

// RFC 6238 appendix B: the SHA-1 secret is the ASCII string "12345678901234567890"
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("matches the RFC 6238 test vectors (last six digits of the 8-digit codes)", () => {
  assert.equal(totpCode(RFC_SECRET, 59 * 1000), "287082");
  assert.equal(totpCode(RFC_SECRET, 1111111109 * 1000), "081804");
  assert.equal(totpCode(RFC_SECRET, 1234567890 * 1000), "005924");
});

test("base32 round-trips and ignores spaces, dashes and case", () => {
  const bytes = Buffer.from("hello totp 123");
  assert.deepEqual(base32Decode(base32Encode(bytes)), bytes);
  assert.deepEqual(base32Decode(base32Encode(bytes).toLowerCase().replace(/(.{4})/g, "$1 ")), bytes);
  assert.throws(() => base32Decode("not*base32"));
});

test("a code is accepted in its own 30 s step and one step either side, not two", () => {
  const at = 1_700_000_000_000;
  const code = totpCode(RFC_SECRET, at);
  assert.equal(verifyTotp(RFC_SECRET, code, at), true);
  assert.equal(verifyTotp(RFC_SECRET, code, at + 30_000), true);
  assert.equal(verifyTotp(RFC_SECRET, code, at - 30_000), true);
  assert.equal(verifyTotp(RFC_SECRET, code, at + 90_000), false);
  assert.equal(verifyTotp(RFC_SECRET, code.slice(0, 5), at), false, "wrong length");
  assert.equal(verifyTotp(RFC_SECRET, "abcdef", at), false);
  assert.equal(verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, at), true, "a space in the middle is how apps show it");
});

test("the setup URL carries the secret and the issuer", () => {
  const url = otpauthUrl("anna@example.com", "ABCDEF");
  assert.match(url, /^otpauth:\/\/totp\/Panel%20Trenera:anna%40example\.com\?secret=ABCDEF&issuer=Panel%20Trenera/);
});

test("sealed secrets round-trip, differ every time and fail with another key", () => {
  const a = sealSecret("JBSWY3DPEHPK3PXP", "server-secret");
  const b = sealSecret("JBSWY3DPEHPK3PXP", "server-secret");
  assert.notEqual(a, b);
  assert.equal(openSecret(a, "server-secret"), "JBSWY3DPEHPK3PXP");
  assert.throws(() => openSecret(a, "other-secret"));
});

test("backup codes are unique, readable and hashed without dashes or case", () => {
  const codes = generateBackupCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.match(codes[0], /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  assert.equal(hashBackupCode(codes[0]), hashBackupCode(codes[0].toLowerCase().replace("-", " ")));
});

test("secrets never survive stripSecrets", () => {
  const safe = stripSecrets({ id: "1", email: "a@b.c", password: "hash", totpSecret: "s", totpBackupCodes: ["h"], passwordResetToken: "t", emailVerificationToken: "v", firstName: "Anna" });
  assert.deepEqual(Object.keys(safe).sort(), ["email", "firstName", "id"]);
});
