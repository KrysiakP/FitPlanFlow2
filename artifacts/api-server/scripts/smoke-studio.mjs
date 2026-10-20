// Smoke test for the studio (gym) flow. Runs against a LOCAL API only.
//
//   API_URL=http://localhost:3100 TEST_PASSWORD=... \
//   STUDIO_EMAIL=studio.test@local.test TRAINER_EMAIL=trener.test@local.test \
//   CLIENT_EMAIL=klient.test@local.test node scripts/smoke-studio.mjs
//
// The three accounts must already exist with verified e-mail addresses.
import assert from "node:assert/strict";
import test from "node:test";

const API_URL = process.env.API_URL ?? "http://localhost:3100";
const PASSWORD = process.env.TEST_PASSWORD;
const { STUDIO_EMAIL, TRAINER_EMAIL, CLIENT_EMAIL } = process.env;

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API_URL)) {
  throw new Error(`Refusing to run against ${API_URL}: only localhost is allowed`);
}
if (!PASSWORD || !STUDIO_EMAIL || !TRAINER_EMAIL || !CLIENT_EMAIL) {
  throw new Error("Set TEST_PASSWORD, STUDIO_EMAIL, TRAINER_EMAIL and CLIENT_EMAIL");
}

async function login(email) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  assert.equal(res.status, 200, `login ${email}`);
  return (await res.json()).mobileToken;
}

function call(token, method, path, body) {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

let studio, trainer, client;

test.before(async () => {
  [studio, trainer, client] = await Promise.all([login(STUDIO_EMAIL), login(TRAINER_EMAIL), login(CLIENT_EMAIL)]);
  // Start from a clean state: trainer outside any studio
  await call(trainer, "DELETE", "/api/trainer/gym");
  const list = await (await call(studio, "GET", "/api/gym/trainers")).json();
  for (const row of list) await call(studio, "DELETE", `/api/gym/trainers/${row.id}`);
});

test("studio panel is closed to trainers and clients", async () => {
  assert.equal((await call(trainer, "GET", "/api/gym/me")).status, 403);
  assert.equal((await call(client, "GET", "/api/gym/me")).status, 403);
});

test("owner invites a trainer, duplicates are rejected", async () => {
  const first = await call(studio, "POST", "/api/gym/trainers/invite", { email: TRAINER_EMAIL });
  assert.equal(first.status, 201);
  const invite = await first.json();
  assert.equal(invite.status, "invited");
  assert.match(invite.inviteCode, /^[A-F0-9]{8}$/);
  assert.equal((await call(studio, "POST", "/api/gym/trainers/invite", { email: TRAINER_EMAIL })).status, 409);
  test.inviteCode = invite.inviteCode;
});

test("owner can resend an invitation; trainers cannot", async () => {
  const rows = await (await call(studio, "GET", "/api/gym/trainers")).json();
  const pending = rows.find((row) => row.status === "invited");
  assert.ok(pending);
  const resent = await call(studio, "POST", `/api/gym/trainers/${pending.id}/resend`);
  assert.equal(resent.status, 200);
  assert.equal(typeof (await resent.json()).emailSent, "boolean");
  assert.equal((await call(trainer, "POST", `/api/gym/trainers/${pending.id}/resend`)).status, 403);
});

test("the invited trainer sees the pending invitation without typing a code", async () => {
  const list = await (await call(trainer, "GET", "/api/trainer/gym/invitations")).json();
  assert.ok(list.some((item) => item.inviteCode === test.inviteCode));
  assert.equal((await call(client, "GET", "/api/trainer/gym/invitations")).status, 403);
});

test("only the invited trainer can use the code", async () => {
  assert.equal((await call(client, "POST", `/api/gym/join/${test.inviteCode}`)).status, 403);
  assert.equal((await call(trainer, "POST", "/api/gym/join/ZZZZZZZZ")).status, 404);
  assert.equal((await call(trainer, "POST", `/api/gym/join/${test.inviteCode.toLowerCase()}`)).status, 200);
  const mine = await (await call(trainer, "GET", "/api/trainer/gym")).json();
  assert.ok(mine?.gym?.name, "trainer sees the studio");
  assert.equal(mine.status, "active");
});

test("analytics show aggregate numbers only", async () => {
  const res = await call(studio, "GET", "/api/gym/analytics");
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.activeTrainers, 1);
  for (const row of data.trainerBreakdown) {
    assert.deepEqual(Object.keys(row).sort(), ["activeClients", "name", "plansCount", "sessionCount", "trainerId"]);
  }
});

test("trainer can leave the studio", async () => {
  assert.equal((await call(trainer, "DELETE", "/api/trainer/gym")).status, 200);
  const data = await (await call(studio, "GET", "/api/gym/analytics")).json();
  assert.equal(data.activeTrainers, 0);
});

test("owner edits studio details; others cannot; bad input is rejected", async () => {
  const before = await (await call(studio, "GET", "/api/gym/me")).json();
  const edited = await call(studio, "PATCH", "/api/gym/me", { phone: "500600700", address: "ul. Testowa 1" });
  assert.equal(edited.status, 200);
  assert.equal((await edited.json()).phone, "500600700");
  assert.equal((await call(studio, "PATCH", "/api/gym/me", { contactEmail: "to-nie-email" })).status, 400);
  assert.equal((await call(trainer, "PATCH", "/api/gym/me", { name: "Przejęcie" })).status, 403);
  // restore
  await call(studio, "PATCH", "/api/gym/me", { phone: before.phone, address: before.address });
});
