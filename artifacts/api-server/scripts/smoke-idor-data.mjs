// Cross-account access test for payments, diets, reports, chat and sessions.
// Same setup and rules as smoke-idor.mjs (4 verified accounts, LOCAL API only, NODE_ENV=test).
//
//   API_URL=http://localhost:3100 TEST_PASSWORD=... \
//   TRAINER_EMAIL=... CLIENT_EMAIL=... TRAINER2_EMAIL=... CLIENT2_EMAIL=... \
//   node --test scripts/smoke-idor-data.mjs
import assert from "node:assert/strict";
import test from "node:test";

const API_URL = process.env.API_URL ?? "http://localhost:3100";
const PASSWORD = process.env.TEST_PASSWORD;
const { TRAINER_EMAIL, CLIENT_EMAIL, TRAINER2_EMAIL, CLIENT2_EMAIL } = process.env;

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API_URL)) {
  throw new Error(`Refusing to run against ${API_URL}: only localhost is allowed`);
}
if (!PASSWORD || !TRAINER_EMAIL || !CLIENT_EMAIL || !TRAINER2_EMAIL || !CLIENT2_EMAIL) {
  throw new Error("Set TEST_PASSWORD, TRAINER_EMAIL, CLIENT_EMAIL, TRAINER2_EMAIL and CLIENT2_EMAIL");
}

async function login(email) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  assert.equal(res.status, 200, `login ${email}`);
  const body = await res.json();
  return { token: body.mobileToken, id: body.id };
}

const call = (who, method, path, body) =>
  fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${who.token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

async function assertDenied(label, promise) {
  const res = await promise;
  assert.ok([401, 403, 404].includes(res.status), `${label}: expected access denied, got ${res.status}`);
}

let t1, c1, t2, c2;
const s = {};

async function link(trainer, client, clientEmail) {
  const sent = await call(trainer, "POST", "/api/invitations/send", { clientEmail, clientFirstName: "Test" });
  assert.equal(sent.status, 200, `invitation to ${clientEmail}`);
  const invitation = await sent.json();
  assert.equal((await call(client, "POST", `/api/invitations/${invitation.id}/accept`)).status, 200);
}

test.before(async () => {
  [t1, c1, t2, c2] = await Promise.all([login(TRAINER_EMAIL), login(CLIENT_EMAIL), login(TRAINER2_EMAIL), login(CLIENT2_EMAIL)]);
  await link(t1, c1, CLIENT_EMAIL);
  await link(t2, c2, CLIENT2_EMAIL);

  const payment = await call(t1, "POST", "/api/payments", {
    clientId: c1.id, amount: 100, dueDate: new Date().toISOString(), description: "Smoke",
  });
  assert.equal(payment.status, 201, "payment created");
  s.paymentId = (await payment.json()).id;

  const diet = await call(t1, "POST", "/api/diets/plans", {
    name: "Smoke dieta", clientId: c1.id, targetCalories: 2000, targetProtein: 150, targetFat: 60, targetCarbs: 200, mealsPerDay: 4,
  });
  assert.equal(diet.status, 201, "diet created");
  s.dietId = (await diet.json()).id;

  const report = await call(c1, "POST", "/api/reports", { reportDate: new Date().toISOString(), weight: "70", mood: "ok", sleepHours: "7,5", waterLiters: "2" });
  assert.ok([200, 201].includes(report.status), "report created");
  s.reportId = (await report.json()).id;
});

test("payments stay with the owning trainer", async () => {
  await assertDenied("create for foreign client", call(t2, "POST", "/api/payments", {
    clientId: c1.id, amount: 50, dueDate: new Date().toISOString(),
  }));
  await assertDenied("mark paid", call(t2, "PATCH", `/api/payments/${s.paymentId}/mark-paid`, {}));
  await assertDenied("delete", call(t2, "DELETE", `/api/payments/${s.paymentId}`));
  await assertDenied("client marks own payment paid", call(c1, "PATCH", `/api/payments/${s.paymentId}/mark-paid`, {}));
  await assertDenied("client deletes payment", call(c1, "DELETE", `/api/payments/${s.paymentId}`));
  const mine = await (await call(t2, "GET", "/api/payments")).json();
  assert.ok(!JSON.stringify(mine).includes(s.paymentId), "trainer 2 sees trainer 1's payment");
});

test("diet plans stay with the owning trainer and their client", async () => {
  await assertDenied("read", call(t2, "GET", `/api/diets/plans/${s.dietId}`));
  await assertDenied("edit", call(t2, "PUT", `/api/diets/plans/${s.dietId}`, { name: "Przejęta" }));
  await assertDenied("delete", call(t2, "DELETE", `/api/diets/plans/${s.dietId}`));
  await assertDenied("copy", call(t2, "POST", `/api/diets/plans/${s.dietId}/copy`, {}));
  await assertDenied("add meal", call(t2, "POST", `/api/diets/plans/${s.dietId}/meals`, { name: "x", orderIndex: 1 }));
  await assertDenied("list meals", call(t2, "GET", `/api/diets/plans/${s.dietId}/meals`));
  await assertDenied("other client reads", call(c2, "GET", `/api/diets/plans/${s.dietId}`));
  await assertDenied("client edits", call(c1, "PUT", `/api/diets/plans/${s.dietId}`, { name: "Moja" }));
  const mine = await (await call(t2, "GET", "/api/diets/plans")).json();
  assert.ok(!JSON.stringify(mine).includes(s.dietId), "trainer 2 sees trainer 1's diet plan");
});

test("weekly reports are visible only to their client and the client's trainer", async () => {
  const own = await call(c1, "GET", `/api/reports/${s.reportId}`);
  assert.equal(own.status, 200);
  const ownBody = await own.json();
  assert.equal(ownBody.sleepHours, "7,5", "sleep is stored with the report");
  assert.equal(ownBody.waterLiters, "2", "and so is water");
  const viaTrainer = await (await call(t1, "GET", `/api/clients/${c1.id}/reports`)).json();
  assert.ok(JSON.stringify(viaTrainer).includes(s.reportId), "the client's trainer sees the report");
  await assertDenied("foreign trainer reads", call(t2, "GET", `/api/reports/${s.reportId}`));
  await assertDenied("foreign client reads", call(c2, "GET", `/api/reports/${s.reportId}`));
  await assertDenied("foreign trainer marks viewed", call(t2, "POST", `/api/reports/${s.reportId}/mark-as-viewed`, {}));
  await assertDenied("foreign client edits", call(c2, "PATCH", `/api/reports/${s.reportId}`, { mood: "x" }));
  const list = await (await call(c2, "GET", "/api/reports")).json();
  assert.ok(!JSON.stringify(list).includes(s.reportId), "client 2 sees client 1's report");
});

test("chat is limited to a client and their own trainer", async () => {
  const sent = await call(t1, "POST", "/api/chat/messages", { recipientId: c1.id, body: "Cześć" });
  assert.ok([200, 201].includes(sent.status), "message sent");
  assert.equal((await call(c1, "GET", `/api/chat/messages/${t1.id}/${c1.id}`)).status, 200);
  await assertDenied("trainer 2 reads conversation", call(t2, "GET", `/api/chat/messages/${t1.id}/${c1.id}`));
  await assertDenied("trainer 2 reads as own trainer id", call(t2, "GET", `/api/chat/messages/${t2.id}/${c1.id}`));
  await assertDenied("client 2 reads conversation", call(c2, "GET", `/api/chat/messages/${t1.id}/${c1.id}`));
  await assertDenied("trainer 2 writes to foreign client", call(t2, "POST", "/api/chat/messages", { recipientId: c1.id, body: "Hej" }));
  await assertDenied("client 2 writes to foreign trainer", call(c2, "POST", "/api/chat/messages", { recipientId: t1.id, body: "Hej" }));
  await assertDenied("client writes to other client", call(c1, "POST", "/api/chat/messages", { recipientId: c2.id, body: "Hej" }));
});

test("training sessions can only be cancelled by their trainer", async () => {
  const created = await call(t1, "POST", "/api/sessions", {
    clientId: c1.id, scheduledAt: new Date(Date.now() + 86400000).toISOString(), durationMinutes: 60,
  });
  assert.equal(created.status, 201);
  const id = (await created.json()).id;
  await assertDenied("foreign trainer cancels", call(t2, "DELETE", `/api/sessions/${id}`));
  await assertDenied("client cancels", call(c1, "DELETE", `/api/sessions/${id}`));
  assert.equal((await call(t1, "DELETE", `/api/sessions/${id}`)).status < 300, true);
  await assertDenied("create for foreign client", call(t2, "POST", "/api/sessions", {
    clientId: c1.id, scheduledAt: new Date(Date.now() + 86400000).toISOString(), durationMinutes: 60,
  }));
});

test.after(async () => {
  if (!t1) return;
  if (s.paymentId) await call(t1, "DELETE", `/api/payments/${s.paymentId}`);
  if (s.dietId) await call(t1, "DELETE", `/api/diets/plans/${s.dietId}`);
  await call(t1, "POST", `/api/clients/${c1.id}/archive`);
  await call(t2, "POST", `/api/clients/${c2.id}/archive`);
});
