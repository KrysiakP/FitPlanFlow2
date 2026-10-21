// node --test scripts/account-export.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { buildAccountExport, exportFileName, exportableAccount } from "../src/lib/accountExport.ts";

const user = {
  id: "u1",
  email: "kasia@example.com",
  firstName: "Kasia",
  lastName: "Nowak",
  role: "client",
  password: "$2b$10$hash",
  passwordResetToken: "reset",
  emailVerificationToken: "verify",
  stripeCustomerId: "cus_123",
  isAdmin: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("secrets and internal flags are never exported", () => {
  const account = exportableAccount(user);
  assert.equal(account.email, "kasia@example.com");
  for (const secret of ["password", "passwordResetToken", "emailVerificationToken", "stripeCustomerId", "isAdmin"]) {
    assert.ok(!(secret in account), `${secret} must not be exported`);
  }
});

test("missing optional fields come out as null so the file shape is stable", () => {
  assert.equal(exportableAccount(user).profileImageUrl, null);
});

test("sections are added next to the account and the timestamp", () => {
  const result = buildAccountExport(user, { weeklyReports: [{ id: "r1" }] }, new Date("2026-10-21T10:00:00Z"));
  assert.equal(result.exportedAt, "2026-10-21T10:00:00.000Z");
  assert.deepEqual(result.weeklyReports, [{ id: "r1" }]);
  assert.ok(!JSON.stringify(result).includes("$2b$10$hash"));
});

test("the download has a dated file name", () => {
  assert.equal(exportFileName(new Date("2026-10-21T10:00:00Z")), "panel-trenera-moje-dane-2026-10-21.json");
});
