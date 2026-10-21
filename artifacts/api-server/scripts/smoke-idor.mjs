// Cross-account access test (IDOR): a trainer or client must never reach another pair's data.
// Runs against a LOCAL API only.
//
//   API_URL=http://localhost:3100 TEST_PASSWORD=... \
//   TRAINER_EMAIL=trener.test@local.test CLIENT_EMAIL=klient.test@local.test \
//   TRAINER2_EMAIL=trener2.test@local.test CLIENT2_EMAIL=klient2.test@local.test \
//   node --test scripts/smoke-idor.mjs
//
// Four verified accounts are needed; both clients must have no trainer yet.
// Start the API with NODE_ENV=test (skips the auth rate limiter). Cleans up after itself.
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

// Access must be refused: 401/403/404, never a success and never a server error
async function assertDenied(label, promise) {
  const res = await promise;
  assert.ok([401, 403, 404].includes(res.status), `${label}: expected access denied, got ${res.status}`);
}

let t1, c1, t2, c2;
const state = {};

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

  const plan = await call(t1, "POST", "/api/plans", { name: "IDOR plan" });
  state.planId = (await plan.json()).id;
  const workout = await call(t1, "POST", `/api/plans/${state.planId}/workouts`, { name: "A", orderIndex: 0 });
  state.workoutId = (await workout.json()).id;
  const exercise = await call(t1, "POST", `/api/workouts/${state.workoutId}/exercises`, [
    { name: "Martwy ciąg", sets: 3, reps: 5, load: "100", restTime: 120, orderIndex: 0 },
  ]);
  state.exerciseId = (await exercise.json())[0].id;
  assert.equal((await call(t1, "POST", "/api/assignments/bulk", { planId: state.planId, clientIds: [c1.id] })).status, 200);
});

test("trainer 2 cannot read or change trainer 1's client", async () => {
  const id = c1.id;
  await assertDenied("progress", call(t2, "GET", `/api/trainer/clients/${id}/progress`));
  await assertDenied("exercise history", call(t2, "GET", `/api/trainer/clients/${id}/exercise-history`));
  await assertDenied("notes read", call(t2, "GET", `/api/trainer/clients/${id}/notes`));
  await assertDenied("notes write", call(t2, "PATCH", `/api/trainer/clients/${id}/notes`, { notes: "przejęte" }));
  await assertDenied("exercise logs", call(t2, "GET", `/api/trainer/clients/${id}/exercise-logs`));
  await assertDenied("workout sessions", call(t2, "GET", `/api/trainer/clients/${id}/workout-sessions`));
  await assertDenied("active diet", call(t2, "GET", `/api/trainer/clients/${id}/active-diet`));
  await assertDenied("diet stats", call(t2, "GET", `/api/trainer/clients/${id}/diet-stats?planId=00000000-0000-0000-0000-000000000000`));
  await assertDenied("reports", call(t2, "GET", `/api/clients/${id}/reports`));
  await assertDenied("remind", call(t2, "POST", `/api/trainer/clients/${id}/remind`, {}));
  await assertDenied("archive", call(t2, "POST", `/api/clients/${id}/archive`));
});

test("trainer 2 cannot touch trainer 1's plan or assign to trainer 1's client", async () => {
  await assertDenied("read plan", call(t2, "GET", `/api/plans/${state.planId}`));
  await assertDenied("edit plan", call(t2, "PUT", `/api/plans/${state.planId}`, { name: "Przejęty" }));
  await assertDenied("delete plan", call(t2, "DELETE", `/api/plans/${state.planId}`));
  await assertDenied("copy plan", call(t2, "POST", `/api/plans/${state.planId}/copy`, {}));
  await assertDenied("add workout", call(t2, "POST", `/api/plans/${state.planId}/workouts`, { name: "X", orderIndex: 0 }));
  const own = await call(t2, "POST", "/api/plans", { name: "Plan trenera 2" });
  state.plan2Id = (await own.json()).id;
  await assertDenied("assign own plan to foreign client", call(t2, "POST", "/api/assignments/bulk", { planId: state.plan2Id, clientIds: [c1.id] }));
  await assertDenied("assign foreign plan", call(t2, "POST", "/api/assignments/bulk", { planId: state.planId, clientIds: [c2.id] }));
});

test("client lists never include another trainer's clients", async () => {
  const list = await (await call(t2, "GET", "/api/trainer/clients")).json();
  assert.ok(Array.isArray(list));
  assert.ok(!list.some((row) => row.id === c1.id), "trainer 2 sees trainer 1's client");
  const list1 = await (await call(t1, "GET", "/api/trainer/clients")).json();
  assert.ok(!list1.some((row) => row.id === c2.id), "trainer 1 sees trainer 2's client");
});

test("client 2 cannot see client 1's plan or data", async () => {
  await assertDenied("plan", call(c2, "GET", `/api/plans/${state.planId}`));
  const assignment = await call(c2, "GET", "/api/client/assignment");
  if (assignment.status === 200) {
    const body = await assignment.json();
    assert.ok(!body || !JSON.stringify(body).includes(state.planId), "client 2 got client 1's assignment");
  }
  await assertDenied("trainer endpoint as client", call(c2, "GET", `/api/trainer/clients/${c1.id}/progress`));
  await assertDenied("create plan as client", call(c2, "POST", "/api/plans", { name: "x" }));
});

test("exercise logs and workouts belong to the plan's owner and assignee", async () => {
  await assertDenied("foreign client logs a set", call(c2, "POST", `/api/exercises/${state.exerciseId}/log`, { reps: 5, load: "100", setNumber: 1 }));
  // These are scoped to the caller's own history: denied, or an empty answer, but never another client's data
  for (const path of [`/api/exercises/${state.exerciseId}/logs`, `/api/exercises/${state.exerciseId}/latest-log`]) {
    const res = await call(c2, "GET", path);
    if (res.status === 200) {
      const body = await res.json();
      assert.ok(body === null || (Array.isArray(body) && body.length === 0) || Object.keys(body).length === 0, `${path} leaked data`);
    } else {
      assert.ok([403, 404].includes(res.status), `${path}: got ${res.status}`);
    }
  }
  await assertDenied("foreign trainer reads workout", call(t2, "GET", `/api/workouts/${state.workoutId}`));
  await assertDenied("foreign trainer lists exercises", call(t2, "GET", `/api/workouts/${state.workoutId}/exercises`));
  await assertDenied("foreign trainer edits exercise", call(t2, "PUT", `/api/exercises/${state.exerciseId}`, { name: "Przejęte" }));
  await assertDenied("foreign trainer deletes exercise", call(t2, "DELETE", `/api/exercises/${state.exerciseId}`));
  await assertDenied("foreign trainer edits workout", call(t2, "PUT", `/api/workouts/${state.workoutId}`, { name: "x" }));
  await assertDenied("foreign trainer deletes workout", call(t2, "DELETE", `/api/workouts/${state.workoutId}`));
  // the assignee may log
  const ok = await call(c1, "POST", `/api/exercises/${state.exerciseId}/log`, { reps: 5, load: "100", setNumber: 1 });
  assert.ok([200, 201].includes(ok.status), `assignee logs a set (got ${ok.status})`);
});

test.after(async () => {
  if (!t1) return;
  await call(t1, "DELETE", `/api/assignments/client/${c1.id}`);
  await call(t1, "POST", `/api/clients/${c1.id}/archive`);
  await call(t2, "POST", `/api/clients/${c2.id}/archive`);
  if (state.planId) await call(t1, "DELETE", `/api/plans/${state.planId}`);
  if (state.plan2Id) await call(t2, "DELETE", `/api/plans/${state.plan2Id}`);
});
