// Smoke / authorization test for the core trainer <-> client flow. Runs against a LOCAL API only.
//
//   API_URL=http://localhost:3100 TEST_PASSWORD=... \
//   TRAINER_EMAIL=trener.test@local.test CLIENT_EMAIL=klient.test@local.test \
//   STUDIO_EMAIL=studio.test@local.test node --test scripts/smoke-core.mjs
//
// Accounts must exist with verified e-mail; the client must not have a trainer yet.
// Start the API with NODE_ENV=test (skips the auth rate limiter).
// Optional: set CRON_JOB_TOKEN (the API's value) to also test the session reminders.
// The test cleans up after itself (plan deleted, relationship archived).
import assert from "node:assert/strict";
import test from "node:test";

const API_URL = process.env.API_URL ?? "http://localhost:3100";
const PASSWORD = process.env.TEST_PASSWORD;
const { TRAINER_EMAIL, CLIENT_EMAIL, STUDIO_EMAIL } = process.env;

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API_URL)) {
  throw new Error(`Refusing to run against ${API_URL}: only localhost is allowed`);
}
if (!PASSWORD || !TRAINER_EMAIL || !CLIENT_EMAIL || !STUDIO_EMAIL) {
  throw new Error("Set TEST_PASSWORD, TRAINER_EMAIL, CLIENT_EMAIL and STUDIO_EMAIL");
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

let trainer, client, outsider;
const state = {};

test.before(async () => {
  [trainer, client, outsider] = await Promise.all([login(TRAINER_EMAIL), login(CLIENT_EMAIL), login(STUDIO_EMAIL)]);
});

test("only trainers create plans, workouts and exercises", async () => {
  assert.equal((await call(client, "POST", "/api/plans", { name: "Hack" })).status, 403);
  const created = await call(trainer, "POST", "/api/plans", { name: "Smoke plan", description: "test" });
  assert.equal(created.status, 201);
  state.planId = (await created.json()).id;

  const workout = await call(trainer, "POST", `/api/plans/${state.planId}/workouts`, { name: "Trening A", orderIndex: 0 });
  assert.equal(workout.status, 201);
  state.workoutId = (await workout.json()).id;

  // The endpoint takes a list of exercises
  const notAList = await call(trainer, "POST", `/api/workouts/${state.workoutId}/exercises`, { name: "Przysiad" });
  assert.equal(notAList.status, 400, "invalid payload is a 400, not a 500");
  for (const bad of ["javascript:alert(1)", "tel:+48600600600", "intent://x#Intent;end"]) {
    const rejected = await call(trainer, "POST", `/api/workouts/${state.workoutId}/exercises`, [
      { name: "Zły link", sets: 3, reps: 8, load: "60", restTime: 90, orderIndex: 9, videoUrl: bad },
    ]);
    assert.equal(rejected.status, 400, `video link ${bad} must be refused`);
  }
  const exercise = await call(trainer, "POST", `/api/workouts/${state.workoutId}/exercises`, [
    { name: "Przysiad", sets: 3, reps: 8, load: "60", restTime: 90, orderIndex: 0, videoUrl: "https://www.youtube.com/watch?v=abc" },
  ]);
  assert.equal(exercise.status, 201);
  state.exerciseId = (await exercise.json())[0].id;
});

test("a plan is private until assigned", async () => {
  assert.equal((await call(client, "GET", `/api/plans/${state.planId}`)).status, 403);
  assert.equal((await call(outsider, "GET", `/api/plans/${state.planId}`)).status, 403);
  assert.equal((await call(client, "PUT", `/api/plans/${state.planId}`, { name: "Przejęty" })).status, 403);
  assert.equal((await call(client, "DELETE", `/api/plans/${state.planId}`)).status, 403);
  assert.equal((await call(client, "PATCH", `/api/client/exercises/${state.exerciseId}`, { reps: 99 })).status, 403);
});

test("trainer cannot assign a plan to someone who is not their client", async () => {
  const res = await call(trainer, "POST", "/api/assignments/bulk", { planId: state.planId, clientIds: [client.id] });
  assert.equal(res.status, 403);
});

test("invitation links the client to the trainer, then the plan can be assigned", async () => {
  const sent = await call(trainer, "POST", "/api/invitations/send", { clientEmail: CLIENT_EMAIL, clientFirstName: "Kasia" });
  assert.equal(sent.status, 200, "invitation sent");
  const invitation = await sent.json();
  assert.equal((await call(trainer, "POST", `/api/invitations/${invitation.id}/accept`)).status, 403, "trainer cannot accept");
  assert.equal((await call(client, "POST", `/api/invitations/${invitation.id}/accept`)).status, 200);
  assert.equal((await call(client, "POST", `/api/invitations/${invitation.id}/accept`)).status, 409, "no double accept");

  const assigned = await call(trainer, "POST", "/api/assignments/bulk", { planId: state.planId, clientIds: [client.id] });
  assert.equal(assigned.status, 200);
});

test("the client sees the assigned plan and may only change reps and load", async () => {
  assert.equal((await call(client, "GET", `/api/plans/${state.planId}`)).status, 200);
  const ok = await call(client, "PATCH", `/api/client/exercises/${state.exerciseId}`, { reps: 10, load: "62.5" });
  assert.equal(ok.status, 200);
  assert.equal((await call(client, "PATCH", `/api/client/exercises/${state.exerciseId}`, { reps: 5000 })).status, 400);
  assert.equal((await call(client, "PATCH", `/api/client/exercises/${state.exerciseId}`, { reps: -1 })).status, 400);
  assert.equal((await call(client, "PUT", `/api/plans/${state.planId}`, { name: "Przejęty" })).status, 403);
  assert.equal((await call(outsider, "GET", `/api/plans/${state.planId}`)).status, 403);
});

test("a set that beats the history is flagged as a personal record", async () => {
  const log = async (reps, load, setNumber) => {
    const res = await call(client, "POST", `/api/exercises/${state.exerciseId}/log`, { reps, load, setNumber });
    assert.equal(res.status, 200, `log ${load}x${reps}`);
    return res.json();
  };
  assert.equal((await log(5, "100", 1)).personalRecord, undefined, "the first set only sets the baseline");
  const record = await log(5, "110", 2);
  assert.ok(record.personalRecord, "a heavier set is a record");
  assert.equal(record.personalRecord.exercise, "Przysiad");
  assert.ok(record.personalRecord.estimatedOneRepMax > record.personalRecord.previousBest);
  assert.equal((await log(5, "105", 3)).personalRecord, undefined, "a weaker set is not");
  assert.equal((await log(5, "", 4)).personalRecord, undefined, "no load, no record");
});

test("the client is notified when a session is booked or cancelled", async () => {
  const feed = async () => JSON.stringify(await (await call(client, "GET", "/api/notifications/mine")).json());
  const waitFor = async (text) => {
    for (let i = 0; i < 20; i += 1) {
      if ((await feed()).includes(text)) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };
  const created = await call(trainer, "POST", "/api/sessions", {
    clientId: client.id, scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(), durationMinutes: 60,
  });
  assert.equal(created.status, 201);
  const id = (await created.json()).id;
  assert.ok(await waitFor("Nowy termin treningu"), "client got the booking notification");
  assert.equal((await call(trainer, "DELETE", `/api/sessions/${id}`)).status, 200);
  assert.ok(await waitFor("Trening odwołany"), "client got the cancellation notification");
});

test("the client's upcoming sessions never include past ones", async () => {
  const past = await call(trainer, "POST", "/api/sessions", {
    clientId: client.id, scheduledAt: new Date(Date.now() - 3 * 86400000).toISOString(), durationMinutes: 60, location: "Wczoraj",
  });
  assert.equal(past.status, 201);
  const pastId = (await past.json()).id;
  const future = await call(trainer, "POST", "/api/sessions", {
    clientId: client.id, scheduledAt: new Date(Date.now() + 3 * 86400000).toISOString(), durationMinutes: 60, location: "Za trzy dni",
  });
  const futureId = (await future.json()).id;
  const list = await (await call(client, "GET", "/api/client/sessions")).json();
  assert.ok(list.every((item) => new Date(item.scheduledAt) > new Date(Date.now() - 3600000)), "a past session is listed as upcoming");
  assert.equal(list[0]?.id, futureId, "the nearest upcoming session comes first");
  await call(trainer, "DELETE", `/api/sessions/${pastId}`);
  await call(trainer, "DELETE", `/api/sessions/${futureId}`);
});

test("session reminders go out once for sessions starting within 24 hours", { skip: !process.env.CRON_JOB_TOKEN }, async () => {
  const runCron = async () => {
    const res = await fetch(`${API_URL}/api/cron/payment-notifications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_JOB_TOKEN}` },
    });
    assert.equal(res.status, 200);
    return (await res.json()).sessionReminders;
  };
  const created = await call(trainer, "POST", "/api/sessions", {
    clientId: client.id, scheduledAt: new Date(Date.now() + 5 * 3600000).toISOString(), durationMinutes: 45, location: "Siłownia Testowa",
  });
  assert.equal(created.status, 201);
  const id = (await created.json()).id;

  const first = await runCron();
  assert.ok(first.sent >= 1, "a reminder was sent");
  const feed = JSON.stringify(await (await call(client, "GET", "/api/notifications/mine")).json());
  assert.ok(feed.includes("Trening już wkrótce"));
  const second = await runCron();
  assert.equal(second.sent, 0, "no duplicate reminder on a second run");
  await call(trainer, "DELETE", `/api/sessions/${id}`);
  assert.equal((await fetch(`${API_URL}/api/cron/payment-notifications`, { method: "POST" })).status, 401, "cron needs its token");
});

test("cleanup: archive the relationship and delete the plan", async () => {
  assert.equal((await call(client, "POST", `/api/clients/${client.id}/archive`)).status, 403, "client cannot archive");
  await call(trainer, "DELETE", `/api/assignments/client/${client.id}`);
  await call(trainer, "POST", `/api/clients/${client.id}/archive`);
  assert.equal((await call(trainer, "DELETE", `/api/plans/${state.planId}`)).status, 200);
});
