// Smoke / authorization test for the core trainer <-> client flow. Runs against a LOCAL API only.
//
//   API_URL=http://localhost:3100 TEST_PASSWORD=... \
//   TRAINER_EMAIL=trener.test@local.test CLIENT_EMAIL=klient.test@local.test \
//   STUDIO_EMAIL=studio.test@local.test node --test scripts/smoke-core.mjs
//
// Accounts must exist with verified e-mail; the client must not have a trainer yet.
// Start the API with NODE_ENV=test (skips the auth rate limiter).
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

test("cleanup: archive the relationship and delete the plan", async () => {
  assert.equal((await call(client, "POST", `/api/clients/${client.id}/archive`)).status, 403, "client cannot archive");
  await call(trainer, "DELETE", `/api/assignments/client/${client.id}`);
  await call(trainer, "POST", `/api/clients/${client.id}/archive`);
  assert.equal((await call(trainer, "DELETE", `/api/plans/${state.planId}`)).status, 200);
});
