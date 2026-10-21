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

test("the trainer's attention list flags the client who has a plan but never trained, and unpaid dues", async () => {
  const attention = async () => (await (await call(trainer, "GET", "/api/trainer/attention")).json()).find((item) => item.clientId === client.id);
  assert.ok((await attention())?.reasons.some((r) => r.type === "never_trained"));

  const payment = await call(trainer, "POST", "/api/payments", {
    clientId: client.id, amount: 100, dueDate: new Date(Date.now() - 2 * 86400000).toISOString(), description: "Zaległa",
  });
  assert.equal(payment.status, 201);
  const paymentId = (await payment.json()).id;
  assert.ok((await attention())?.reasons.some((r) => r.type === "overdue_payment"), "an overdue payment is flagged");
  assert.equal((await call(trainer, "PATCH", `/api/payments/${paymentId}/mark-paid`, {})).status < 300, true);
  assert.ok(!(await attention())?.reasons.some((r) => r.type === "overdue_payment"), "a paid one is not");
  await call(trainer, "DELETE", `/api/payments/${paymentId}`);
  assert.equal((await call(client, "GET", "/api/trainer/attention")).status, 403);
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

  const history = await (await call(client, "GET", "/api/client/exercise-history")).json();
  const squat = history.find((item) => item.exercise === "Przysiad");
  assert.ok(squat, "the logged exercise has a history");
  assert.equal(squat.points.length, 1, "all sets were logged today: one point");
  assert.equal(squat.points[0].bestLoad, 110);
  assert.equal((await call(trainer, "GET", `/api/client/exercise-history`)).status, 403, "trainers use their own endpoint");
  const viaTrainer = await (await call(trainer, "GET", `/api/trainer/clients/${client.id}/exercise-history`)).json();
  assert.equal(viaTrainer[0].exercise, "Przysiad");
});

test("clients can see which trainer opened their data", async () => {
  const log = async (who) => (await (await call(who, "GET", "/api/account/access-log")).json()).entries;
  const before = (await log(client)).length;
  assert.equal((await call(trainer, "GET", `/api/clients/${client.id}/reports`)).status, 200);
  assert.equal((await call(trainer, "GET", `/api/trainer/clients/${client.id}/exercise-logs`)).status, 200);
  await new Promise((resolve) => setTimeout(resolve, 300)); // the entry is written after the response
  const entries = await log(client);
  assert.ok(entries.length >= before, "entries are never lost");
  assert.ok(entries.some((entry) => entry.what.includes("raporty")), "the report view is listed");
  assert.ok(entries.some((entry) => entry.what.includes("treningi")), "the training view is listed");
  assert.ok(entries.every((entry) => entry.by && entry.at), "who and when are present");
  assert.equal((await log(trainer)).some((entry) => entry.what.includes("raporty")), false, "the trainer's own log has nothing about the client's data");
  assert.equal((await fetch(`${API_URL}/api/account/access-log`)).status, 401);
});

test("upcoming sessions can be downloaded as a calendar file by each side", async () => {
  const created = await call(trainer, "POST", "/api/sessions", {
    clientId: client.id, scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(), durationMinutes: 50, location: "Sala, nr 3",
  });
  assert.equal(created.status, 201);
  const sessionId = (await created.json()).id;
  try {
    for (const who of [trainer, client]) {
      const res = await call(who, "GET", "/api/sessions/calendar.ics");
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /text\/calendar/);
      const ics = await res.text();
      assert.ok(ics.startsWith("BEGIN:VCALENDAR") && ics.includes(`UID:${sessionId}@paneltrenera.pl`), "the session is in the file");
      assert.ok(ics.includes("LOCATION:Sala\\, nr 3"), "the location is escaped");
    }
    assert.equal((await fetch(`${API_URL}/api/sessions/calendar.ics`)).status, 401);
  } finally {
    await call(trainer, "DELETE", `/api/sessions/${sessionId}`);
  }
});

test("trainers label their clients privately", async () => {
  const labels = async () => {
    const list = await (await call(trainer, "GET", "/api/trainer/clients")).json();
    return list.find((item) => item.id === client.id)?.labels;
  };
  // the list carries each client's newest assignment with its plan (one query for all clients)
  const listed = (await (await call(trainer, "GET", "/api/trainer/clients")).json()).find((item) => item.id === client.id);
  assert.equal(listed.assignment?.planId, state.planId, "the assigned plan is on the client");
  assert.equal(listed.assignment?.plan?.id, state.planId, "with the plan itself");
  const stats = await (await call(trainer, "GET", "/api/trainer/stats")).json();
  assert.ok(stats.totalAssignments >= 1 && stats.totalPlans >= 1 && stats.totalClients >= 1, "the dashboard counts see the plan and its assignment");

  const saved = await call(trainer, "PUT", `/api/trainer/clients/${client.id}/labels`, { labels: ["  VIP ", "online", "vip", ""] });
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).labels, ["VIP", "online"]);
  assert.deepEqual(await labels(), ["VIP", "online"], "the client list carries the labels in order");
  assert.equal((await call(trainer, "PUT", `/api/trainer/clients/${client.id}/labels`, { labels: "VIP" })).status, 400);
  assert.equal((await call(client, "PUT", `/api/trainer/clients/${client.id}/labels`, { labels: ["x"] })).status, 403, "clients cannot label themselves");
  const own = JSON.stringify(await (await call(client, "GET", "/api/account/export")).json());
  assert.ok(!own.includes("VIP"), "labels never reach the client, not even through the data export");
  assert.equal((await call(trainer, "PUT", `/api/trainer/clients/${client.id}/labels`, { labels: [] })).status, 200);
  assert.deepEqual(await labels(), [], "an empty list clears them");
});

test("clients see their achievements, nobody else does", async () => {
  const res = await call(client, "GET", "/api/client/achievements");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.achievements.length, 8);
  assert.equal(body.earned, body.achievements.filter((item) => item.earned).length);
  for (const item of body.achievements) {
    assert.ok(item.title && item.description, "each badge explains itself");
    assert.ok(item.progress >= 0 && item.progress <= 1);
  }
  assert.equal((await call(trainer, "GET", "/api/client/achievements")).status, 403);
  assert.equal((await fetch(`${API_URL}/api/client/achievements`)).status, 401);
});

test("trainers see how long their clients stay", async () => {
  const res = await call(trainer, "GET", "/api/trainer/retention");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.activeClients >= 1, "the linked client counts as active");
  assert.ok(body.averageMonths === null || body.averageMonths >= 0);
  assert.ok(body.retention90 === null || (body.retention90 >= 0 && body.retention90 <= 100));
  assert.equal((await call(client, "GET", "/api/trainer/retention")).status, 403);
});

test("clients set a weight goal that is judged against their reports", async () => {
  const tomorrow = new Date(Date.now() + 40 * 86400000).toISOString();
  assert.equal((await call(trainer, "PUT", "/api/client/goal", { targetKg: 70 })).status, 403, "only clients have goals");
  assert.equal((await call(client, "PUT", "/api/client/goal", { targetKg: 5, startKg: 80 })).status, 400, "an implausible target is refused");
  assert.equal((await call(client, "PUT", "/api/client/goal", { targetKg: 70, startKg: 80, targetDate: "2020-01-01" })).status, 400, "a deadline in the past is refused");

  const saved = await call(client, "PUT", "/api/client/goal", { targetKg: 70, startKg: 80, targetDate: tomorrow });
  // without any weekly report the start weight must be supplied; with one it is taken from the report
  assert.ok([200, 400].includes(saved.status));
  if (saved.status === 200) {
    const body = await (await call(client, "GET", "/api/client/goal")).json();
    assert.equal(body.goal.targetKg, 70);
    assert.ok(body.progress.percent >= 0 && body.progress.percent <= 100);
    assert.ok(["on_track", "behind", "reached", "overdue", "no_deadline"].includes(body.progress.status));
    assert.ok(body.progress.daysLeft > 30 && body.progress.daysLeft <= 41, "the deadline is about 40 days away");
    assert.equal((await call(client, "DELETE", "/api/client/goal")).status, 200);
    assert.equal((await (await call(client, "GET", "/api/client/goal")).json()).goal, null, "deleting clears it");
  }
  assert.equal((await fetch(`${API_URL}/api/client/goal`)).status, 401);
});

test("trainers keep private reminders about clients and are pushed on the due day", { skip: !process.env.CRON_JOB_TOKEN }, async () => {
  const yesterday = new Date(Date.now() - 12 * 3600000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  const base = `/api/trainer/clients/${client.id}/reminders`;
  assert.equal((await call(client, "POST", base, { text: "x", dueDate: nextWeek })).status, 403, "clients cannot create them");
  assert.equal((await call(trainer, "POST", base, { text: "   ", dueDate: nextWeek })).status, 400);
  assert.equal((await call(trainer, "POST", base, { text: "x", dueDate: "not a date" })).status, 400);
  assert.equal((await call(trainer, "POST", base, { text: "x", dueDate: "2001-01-01" })).status, 400, "a date long past is refused");

  const unique = `Zapytaj o kolano ${Date.now()}`;
  const due = await (await call(trainer, "POST", base, { text: unique, dueDate: yesterday })).json();
  const later = await (await call(trainer, "POST", base, { text: `Za tydzień ${Date.now()}`, dueDate: nextWeek })).json();
  try {
    assert.ok((await (await call(trainer, "GET", "/api/trainer/reminders")).json()).some((item) => item.id === due.id && item.clientFirstName));
    assert.equal((await (await call(client, "GET", "/api/trainer/reminders")).status), 403);

    const run = async () => (await (await fetch(`${API_URL}/api/cron/payment-notifications`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_JOB_TOKEN}` } })).json()).clientReminders;
    const feed = async () => JSON.stringify(await (await call(trainer, "GET", "/api/notifications/mine?limit=100")).json());
    const first = await run();
    assert.ok(first.sent >= 1, "the due reminder was pushed");
    assert.ok((await feed()).includes(unique), "it reached the trainer's feed");
    assert.ok(!(await feed()).includes(later.text), "a reminder for next week is not pushed yet");
    assert.equal((await run()).sent, 0, "each reminder is pushed once");
  } finally {
    assert.equal((await call(trainer, "POST", `/api/trainer/reminders/${due.id}/done`)).status, 200);
    assert.equal((await call(trainer, "DELETE", `/api/trainer/reminders/${later.id}`)).status, 200);
  }
  assert.ok(!(await (await call(trainer, "GET", "/api/trainer/reminders")).json()).some((item) => item.id === due.id), "finished ones leave the list");
  assert.equal((await call(trainer, "DELETE", `/api/trainer/reminders/${later.id}`)).status, 404, "already gone");
});

test("two-step login: setup, enforcement at login, backup codes, and no secrets in responses", async () => {
  const { totpCode } = await import("../src/lib/totp.ts");
  const base = `${API_URL}/api/login`;
  const loginRaw = (body) => fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: process.env.TRAINER_EMAIL, password: process.env.TEST_PASSWORD, ...body }) });

  // a normal login must never expose secrets, even before 2FA
  const plain = await (await loginRaw({})).json();
  for (const field of ["password", "passwordResetToken", "emailVerificationToken", "totpSecret", "totpBackupCodes"]) assert.ok(!(field in plain), `${field} must not be in the login response`);

  assert.deepEqual(await (await call(trainer, "GET", "/api/account/2fa")).json(), { enabled: false, backupCodesLeft: 0 });
  const setup = await (await call(trainer, "POST", "/api/account/2fa/setup")).json();
  assert.match(setup.secret, /^[A-Z2-7]{32}$/);
  assert.match(setup.otpauthUrl, /^otpauth:\/\/totp\//);
  assert.equal((await loginRaw({})).status, 200, "pending setup does not change login yet");
  assert.equal((await call(trainer, "POST", "/api/account/2fa/enable", { code: "000000" })).status, 400, "a wrong code does not enable it");

  const enabled = await call(trainer, "POST", "/api/account/2fa/enable", { code: totpCode(setup.secret) });
  assert.equal(enabled.status, 200);
  const { backupCodes } = await enabled.json();
  assert.equal(backupCodes.length, 10);
  assert.equal((await call(trainer, "POST", "/api/account/2fa/setup")).status, 409, "already enabled");

  try {
    const noCode = await loginRaw({});
    assert.equal(noCode.status, 401);
    assert.equal((await noCode.json()).requires2fa, true, "the app is told to ask for a code");
    assert.equal((await loginRaw({ totpCode: "123456" })).status, 401, "a wrong code is refused");
    const withCode = await loginRaw({ totpCode: totpCode(setup.secret) });
    assert.equal(withCode.status, 200);
    const loggedIn = await withCode.json();
    assert.ok(!("totpSecret" in loggedIn) && !("totpBackupCodes" in loggedIn));

    assert.equal((await loginRaw({ totpCode: backupCodes[0] })).status, 200, "a backup code works once");
    assert.equal((await loginRaw({ totpCode: backupCodes[0] })).status, 401, "and only once");
    assert.equal((await (await call(trainer, "GET", "/api/account/2fa")).json()).backupCodesLeft, 9);

    // switching it off needs the password and a code
    assert.equal((await call(trainer, "POST", "/api/account/2fa/disable", { password: "wrong", code: totpCode(setup.secret) })).status, 403);
    assert.equal((await call(trainer, "POST", "/api/account/2fa/disable", { password: process.env.TEST_PASSWORD, code: "000000" })).status, 403);
  } finally {
    const off = await call(trainer, "POST", "/api/account/2fa/disable", { password: process.env.TEST_PASSWORD, code: totpCode(setup.secret) });
    assert.equal(off.status, 200, "the account must be left without 2FA for the other tests");
  }
  assert.equal((await loginRaw({})).status, 200, "login is back to a password");
});

test("warm-up sets are stored but never count as records, history or the weight to prefill", async () => {
  const before = await (await call(client, "GET", "/api/client/exercise-history")).json();
  const bestBefore = before.find((item) => item.exercise === "Przysiad")?.best;
  const latestBefore = await (await call(client, "GET", `/api/exercises/${state.exerciseId}/latest-log`)).json();

  const heavy = await call(client, "POST", `/api/exercises/${state.exerciseId}/log`, { reps: 5, load: "300", setNumber: 20, isWarmup: true });
  assert.equal(heavy.status, 200);
  const stored = await heavy.json();
  assert.equal(stored.isWarmup, true, "it is saved, flagged as a warm-up");
  assert.equal(stored.personalRecord, undefined, "an absurdly heavy warm-up is still not a record");

  const after = await (await call(client, "GET", "/api/client/exercise-history")).json();
  assert.equal(after.find((item) => item.exercise === "Przysiad")?.best, bestBefore, "the strength history ignores it");
  const latestAfter = await (await call(client, "GET", `/api/exercises/${state.exerciseId}/latest-log`)).json();
  assert.equal(latestAfter?.id, latestBefore?.id, "the next set is not pre-filled from a warm-up");
  const all = await (await call(client, "GET", "/api/exercise-logs")).json();
  assert.ok(all.some((item) => item.id === stored.id), "the trainer and client can still see it in the log");
});

test("a finished workout can carry a 1-10 difficulty rating that the trainer sees", async () => {
  const body = { workoutId: state.workoutId, planId: state.planId, exercisesCompleted: 3, totalExercises: 3, durationSeconds: 1800 };
  assert.equal((await call(client, "POST", "/api/workout-sessions", { ...body, rpe: 11 })).status, 400, "above ten is refused");
  assert.equal((await call(client, "POST", "/api/workout-sessions", { ...body, rpe: 0 })).status, 400, "below one is refused");
  const rated = await call(client, "POST", "/api/workout-sessions", { ...body, rpe: 8 });
  assert.equal(rated.status, 201);
  assert.equal((await rated.json()).rpe, 8);
  const unrated = await call(client, "POST", "/api/workout-sessions", body);
  assert.equal(unrated.status, 201, "the rating is optional");
  assert.equal((await unrated.json()).rpe, null);
  const seen = await (await call(trainer, "GET", `/api/trainer/clients/${client.id}/workout-sessions`)).json();
  assert.ok(seen.some((item) => item.rpe === 8), "the trainer sees the rating");
});

test("editing a diet keeps what the client already ticked off", async () => {
  const meal = (dayOfWeek, orderIndex, name, extra = {}) => ({ dayOfWeek, orderIndex, name, calories: 500, protein: 30, fat: 15, carbs: 60, ...extra });
  const created = await call(trainer, "POST", "/api/diets/plans", { name: "Dieta do edycji", clientId: client.id, mode: "full_plan", targetCalories: 2000, targetProtein: 150, targetFat: 60, targetCarbs: 200, mealsPerDay: 3 });
  assert.equal(created.status, 201);
  const planId = (await created.json()).id;
  try {
    const first = await call(trainer, "PUT", `/api/diets/plans/${planId}/meals/sync`, { meals: [meal(1, 1, "Owsianka"), meal(1, 2, "Kurczak z ryżem"), meal(2, 1, "Owsianka")] });
    assert.equal(first.status, 200);
    const saved = await first.json();
    assert.equal(saved.length, 3);
    const porridgeMonday = saved.find((item) => item.dayOfWeek === 1 && item.name === "Owsianka");
    const chicken = saved.find((item) => item.name === "Kurczak z ryżem");
    const today = new Date().toISOString().slice(0, 10);

    const ticked = await call(client, "POST", "/api/client/diet/log", {
      date: today, planId, waterLiters: "2", mealCheckmarks: [{ mealId: porridgeMonday.id, completed: true, eatenCalories: 480 }, { mealId: chicken.id, completed: true, eatenCalories: 520 }],
    });
    assert.equal(ticked.status, 200, "the client ticks two meals");
    const logsOf = async () => (await (await call(client, "GET", `/api/client/diet/logs?planId=${planId}&startDate=${today}&endDate=${today}`)).json());
    assert.equal((await logsOf())[0].checkmarks.length, 2);

    // edit: rename nothing, change a macro, add a meal and drop the Tuesday porridge; ids come from the saved rows
    const edit = await call(trainer, "PUT", `/api/diets/plans/${planId}/meals/sync`, {
      meals: [meal(1, 1, "Owsianka", { id: porridgeMonday.id, calories: 450 }), meal(1, 2, "Kurczak z ryżem", { id: chicken.id }), meal(1, 3, "Kolacja")],
    });
    assert.equal(edit.status, 200);
    const after = await edit.json();
    assert.equal(after.length, 3, "Tuesday's meal was removed, a new one added");
    assert.equal(after.find((item) => item.id === porridgeMonday.id)?.calories, 450, "the kept meal was updated in place");
    assert.equal((await logsOf())[0].checkmarks.length, 2, "both ticked meals are still in the client's history");

    // without ids the same meal is found by day and name (the same name on another day is a different meal)
    const byName = await call(trainer, "PUT", `/api/diets/plans/${planId}/meals/sync`, { meals: [meal(1, 1, "Owsianka"), meal(1, 2, "Kurczak z ryżem")] });
    assert.equal(byName.status, 200);
    assert.equal((await logsOf())[0].checkmarks.length, 2, "history survived the edit without ids too");

    assert.equal((await call(trainer, "PUT", `/api/diets/plans/${planId}/meals/sync`, { meals: "nie lista" })).status, 400);
    assert.equal((await call(trainer, "PUT", `/api/diets/plans/${planId}/meals/sync`, { meals: [{ dayOfWeek: 1, orderIndex: 1, name: "" }] })).status, 400, "an invalid meal rejects the whole save");
    assert.equal((await logsOf())[0].checkmarks.length, 2, "and nothing was lost by the rejected save");
    assert.equal((await call(client, "PUT", `/api/diets/plans/${planId}/meals/sync`, { meals: [] })).status, 403, "clients cannot edit");
    assert.ok((await call(outsider, "PUT", `/api/diets/plans/${planId}/meals/sync`, { meals: [] })).status >= 400, "and neither can another account");
  } finally {
    await call(trainer, "DELETE", `/api/diets/plans/${planId}`);
  }
});

test("a trainer starts a plan from a template and gets a plan of their own", async () => {
  assert.equal((await call(client, "GET", "/api/plan-templates")).status, 403, "trainers only");
  const templates = await (await call(trainer, "GET", "/api/plan-templates")).json();
  assert.ok(templates.length >= 4);
  assert.ok(templates.every((item) => item.key && item.name && item.workouts.length > 0));
  const created = [];
  try {
    for (const template of templates) {
      const res = await call(trainer, "POST", `/api/plans/from-template/${template.key}`, template.key === templates[0].key ? { name: "Mój FBW" } : {});
      assert.equal(res.status, 201, `${template.key} creates a plan`);
      const plan = await res.json();
      created.push(plan.id);
      const full = await (await call(trainer, "GET", `/api/plans/${plan.id}`)).json();
      assert.equal(full.workouts.length, template.workouts.length, `${template.key}: all workouts`);
      assert.equal(full.workouts[0].exercises.length, template.workouts[0].exercises.length);
      if (template.key === templates[0].key) assert.equal(full.name, "Mój FBW", "a custom name is used");
    }
    assert.equal((await call(trainer, "POST", "/api/plans/from-template/nie-ma", {})).status, 404);
    assert.equal((await call(client, "POST", `/api/plans/from-template/${templates[0].key}`, {})).status, 403);
    // the copy belongs to the trainer alone
    assert.equal((await call(outsider, "GET", `/api/plans/${created[0]}`)).status >= 400, true);
  } finally {
    for (const id of created) await call(trainer, "DELETE", `/api/plans/${id}`);
  }
});

test("editing a plan keeps the history of what was not removed", async () => {
  const exercise = (name, orderIndex, extra = {}) => ({ name, sets: 3, reps: 5, load: "50", restTime: 60, orderIndex, ...extra });
  const created = await call(trainer, "POST", "/api/plans/bulk", {
    name: "Plan do edycji",
    workouts: [{ name: "A", orderIndex: 0, exercises: [exercise("Przysiad", 0), exercise("Wyciskanie", 1)] }, { name: "B", orderIndex: 1, exercises: [exercise("Martwy ciąg", 0)] }],
  });
  assert.ok([200, 201].includes(created.status), `plan created (${created.status})`);
  const planId = (await created.json()).id;
  const load = async () => (await (await call(trainer, "GET", `/api/plans/${planId}`)).json());
  try {
    const before = await load();
    const [workoutA, workoutB] = before.workouts;
    const [squat, bench] = workoutA.exercises;
    assert.equal((await call(trainer, "DELETE", `/api/assignments/client/${client.id}`)).status < 500, true);
    assert.equal((await call(trainer, "POST", "/api/assignments/bulk", { planId, clientIds: [client.id] })).status, 200);

    assert.equal((await call(client, "POST", `/api/exercises/${squat.id}/log`, { reps: 5, load: "100", setNumber: 1 })).status, 200);
    assert.equal((await call(client, "POST", `/api/exercises/${bench.id}/log`, { reps: 5, load: "60", setNumber: 1 })).status, 200);
    assert.equal((await call(client, "POST", "/api/workout-sessions", { workoutId: workoutA.id, planId, exercisesCompleted: 2, totalExercises: 2 })).status, 201);
    const logsOf = async (id) => (await (await call(client, "GET", `/api/exercises/${id}/logs`)).json());

    // edit with ids: change a rep count, rename one exercise, add a new one, drop workout B
    const edit = await call(trainer, "PUT", `/api/plans/${planId}/bulk`, {
      name: "Plan do edycji (po zmianach)",
      workouts: [{ id: workoutA.id, name: "A", orderIndex: 0, exercises: [exercise("Przysiad", 0, { id: squat.id, reps: 8 }), exercise("Wyciskanie hantli", 1, { id: bench.id }), exercise("Wiosłowanie", 2)] }],
    });
    assert.equal(edit.status, 200);
    const after = await load();
    assert.equal(after.workouts.length, 1, "workout B was removed");
    assert.equal(after.workouts[0].id, workoutA.id, "workout A is the same row");
    const ids = after.workouts[0].exercises.map((item) => item.id);
    assert.ok(ids.includes(squat.id) && ids.includes(bench.id), "existing exercises keep their ids, also when renamed");
    assert.equal(after.workouts[0].exercises.find((item) => item.id === squat.id).reps, 8, "and are updated");
    assert.equal((await logsOf(squat.id)).length, 1, "the squat history survived the edit");
    assert.equal((await logsOf(bench.id)).length, 1, "so did the renamed bench history");
    const mySessions = await (await call(client, "GET", "/api/workout-sessions")).json();
    assert.ok(mySessions.some((item) => item.workoutId === workoutA.id), "the finished workout survived");

    // an edit without ids (an older page) still matches by name
    const byName = await call(trainer, "PUT", `/api/plans/${planId}/bulk`, {
      name: "Plan do edycji",
      workouts: [{ name: "A", orderIndex: 0, exercises: [exercise("Przysiad", 0, { reps: 6 }), exercise("Wyciskanie hantli", 1)] }],
    });
    assert.equal(byName.status, 200);
    const final = await load();
    assert.equal(final.workouts[0].id, workoutA.id);
    assert.ok(final.workouts[0].exercises.some((item) => item.id === squat.id && item.reps === 6));
    assert.equal(final.workouts[0].exercises.some((item) => item.name === "Wiosłowanie"), false, "the dropped exercise is gone");
    assert.equal((await logsOf(squat.id)).length, 1, "history survived the edit without ids as well");
  } finally {
    await call(trainer, "DELETE", `/api/assignments/client/${client.id}`);
    await call(trainer, "DELETE", `/api/plans/${planId}`);
    // the shared plan of the other tests belongs to the client again
    await call(trainer, "POST", "/api/assignments/bulk", { planId: state.planId, clientIds: [client.id] });
  }
});

test("the trainer comments on a finished workout and the client sees and hears about it", async () => {
  const created = await call(client, "POST", "/api/workout-sessions", { workoutId: state.workoutId, planId: state.planId, exercisesCompleted: 3, totalExercises: 3, durationSeconds: 1200 });
  assert.equal(created.status, 201);
  const sessionId = (await created.json()).id;
  const text = `Dobra robota, dołóż 2,5 kg ${Date.now()}`;

  assert.equal((await call(client, "PUT", `/api/trainer/workout-sessions/${sessionId}/comment`, { comment: "sam sobie" })).status, 403, "clients cannot comment");
  assert.equal((await call(trainer, "PUT", `/api/trainer/workout-sessions/${sessionId}/comment`, { comment: 5 })).status, 400);
  assert.equal((await call(trainer, "PUT", `/api/trainer/workout-sessions/${sessionId}/comment`, { comment: "x".repeat(1001) })).status, 400, "capped at 1000 characters");
  assert.equal((await call(trainer, "PUT", "/api/trainer/workout-sessions/00000000-0000-0000-0000-000000000000/comment", { comment: "x" })).status, 404);

  const saved = await call(trainer, "PUT", `/api/trainer/workout-sessions/${sessionId}/comment`, { comment: `  ${text}  ` });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).trainerComment, text, "trimmed");

  const mine = await (await call(client, "GET", "/api/workout-sessions")).json();
  assert.equal(mine.find((item) => item.id === sessionId)?.trainerComment, text, "the client sees it next to the workout");
  const theirs = await (await call(trainer, "GET", `/api/trainer/clients/${client.id}/workout-sessions`)).json();
  assert.equal(theirs.find((item) => item.id === sessionId)?.trainerComment, text);

  let heard = false;
  for (let i = 0; i < 20 && !heard; i += 1) {
    const feed = await (await call(client, "GET", "/api/notifications/mine?limit=20")).json();
    heard = feed.notifications.some((item) => item.type === "trainer_comment" && item.body === text);
    if (!heard) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(heard, "the client got a notification");

  // an empty comment removes it
  assert.equal((await call(trainer, "PUT", `/api/trainer/workout-sessions/${sessionId}/comment`, { comment: "" })).status, 200);
  const cleared = await (await call(client, "GET", "/api/workout-sessions")).json();
  assert.equal(cleared.find((item) => item.id === sessionId)?.trainerComment, null);
});

test("notes written next to a set reach the trainer, and only the right trainer", async () => {
  const text = `Kolano pobolewa ${Date.now()}`;
  const logged = await call(client, "POST", `/api/exercises/${state.exerciseId}/log`, { reps: 5, load: "60", setNumber: 21, notes: text });
  assert.equal(logged.status, 200);
  const notes = await (await call(trainer, "GET", `/api/trainer/clients/${client.id}/exercise-notes`)).json();
  const found = notes.find((item) => item.note === text);
  assert.ok(found, "the note is listed");
  assert.equal(found.exercise, "Przysiad", "with the exercise it belongs to");
  assert.ok(!notes.some((item) => !item.note || !item.note.trim()), "empty notes are never listed");
  assert.equal((await call(client, "GET", `/api/trainer/clients/${client.id}/exercise-notes`)).status, 403);
  const tooLong = await call(client, "POST", `/api/exercises/${state.exerciseId}/log`, { reps: 5, load: "60", setNumber: 22, notes: "x".repeat(501) });
  assert.equal(tooLong.status, 400, "a set note is capped at 500 characters");
});

test("the health endpoint answers without a login", async () => {
  const res = await fetch(`${API_URL}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.ok(!("password" in body) && !JSON.stringify(body).includes("postgres"), "no secrets or connection strings");
});

test("everyone can download their own data, without secrets or other people's records", async () => {
  const res = await call(client, "GET", "/api/account/export");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-disposition") ?? "", /attachment; filename="panel-trenera-moje-dane-\d{4}-\d{2}-\d{2}\.json"/);
  const text = await res.text();
  const mine = JSON.parse(text);
  assert.equal(mine.account.id, client.id);
  assert.ok(mine.exerciseLogs.length >= 1, "the logged sets are in the export");
  assert.ok(!/"password"|passwordResetToken|emailVerificationToken|stripeCustomerId/.test(text), "no secrets");

  const trainerRes = await call(trainer, "GET", "/api/account/export");
  assert.equal(trainerRes.status, 200);
  const theirs = await trainerRes.json();
  assert.equal(theirs.account.id, trainer.id);
  assert.ok(theirs.plans.some((plan) => plan.workouts?.some((workout) => workout.exercises?.length)), "plans come with workouts and exercises");
  const listed = theirs.clients.find((item) => item.id === client.id);
  assert.deepEqual(Object.keys(listed).sort(), ["firstName", "id", "lastName"], "clients are listed by name only");

  assert.equal((await fetch(`${API_URL}/api/account/export`)).status, 401, "anonymous download is refused");
});

test("the trainer reads the identity of their own client, and nothing sensitive", async () => {
  const res = await call(trainer, "GET", `/api/clients/${client.id}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, client.id);
  assert.ok(body.firstName, "the page header needs a name");
  assert.deepEqual(Object.keys(body).sort(), ["firstName", "id", "lastName", "profileImageUrl"]);
  assert.equal((await call(client, "GET", `/api/clients/${client.id}`)).status, 403, "clients use their own endpoints");
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

test("a chat message notifies the recipient, with the sender and a preview", async () => {
  const text = `Pytanie o technikę ${Date.now()}`;
  assert.equal((await call(client, "POST", "/api/chat/messages", { recipientId: trainer.id, body: text })).status, 200);
  let found;
  for (let i = 0; i < 20 && !found; i += 1) {
    const feed = await (await call(trainer, "GET", "/api/notifications/mine?limit=20")).json();
    found = feed.notifications.find((item) => item.type === "new_message" && item.body === text);
    if (!found) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(found, "the trainer got a notification");
  assert.ok(found.title && found.title !== "Nowa wiadomość", "titled with the sender's name");
  const long = "d".repeat(400);
  assert.equal((await call(trainer, "POST", "/api/chat/messages", { recipientId: client.id, body: long })).status, 200);
  let preview;
  for (let i = 0; i < 20 && !preview; i += 1) {
    const feed = await (await call(client, "GET", "/api/notifications/mine?limit=20")).json();
    preview = feed.notifications.find((item) => item.type === "new_message" && item.body.startsWith("ddd"));
    if (!preview) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(preview && preview.body.length <= 100, "a long message is cut for the lock screen");
});

test("a client cancels their own session up to 24 hours before it, and the trainer hears about it", async () => {
  const book = async (hoursAhead) => {
    const res = await call(trainer, "POST", "/api/sessions", {
      clientId: client.id, scheduledAt: new Date(Date.now() + hoursAhead * 3600000).toISOString(), durationMinutes: 60,
    });
    assert.equal(res.status, 201);
    return (await res.json()).id;
  };
  const far = await book(72);
  const near = await book(5);
  const listed = await (await call(client, "GET", "/api/client/sessions")).json();
  const farRow = listed.find((row) => row.id === far);
  assert.ok(farRow?.cancellableUntil, "the list says until when the client may cancel");
  assert.ok(new Date(farRow.cancellableUntil) > new Date(), "still open for the far session");
  assert.ok(new Date(listed.find((row) => row.id === near).cancellableUntil) < new Date(), "already closed for the near one");

  const tooLate = await call(client, "POST", `/api/client/sessions/${near}/cancel`);
  assert.equal(tooLate.status, 409);
  assert.match((await tooLate.json()).message, /24/);
  assert.equal((await call(trainer, "POST", `/api/client/sessions/${far}/cancel`)).status, 404, "only the booked client may use it");

  assert.equal((await call(client, "POST", `/api/client/sessions/${far}/cancel`)).status, 200);
  assert.equal((await call(client, "POST", `/api/client/sessions/${far}/cancel`)).status, 404, "cancelling twice finds nothing");
  const after = await (await call(client, "GET", "/api/client/sessions")).json();
  assert.ok(!after.some((row) => row.id === far), "the cancelled session is gone from the list");

  let heard = false;
  for (let i = 0; i < 20 && !heard; i += 1) {
    heard = JSON.stringify(await (await call(trainer, "GET", "/api/notifications/mine")).json()).includes("Odwołany termin");
    if (!heard) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(heard, "the trainer got a notification");
  await call(trainer, "DELETE", `/api/sessions/${near}`);
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
    clientId: client.id, scheduledAt: new Date(Date.now() + 5 * 3600000).toISOString(), durationMinutes: 45, location: `Siłownia Testowa ${Date.now()}`, // unique text: the same reminder is never sent twice within 36 hours, so repeated suite runs must not collide
  });
  assert.equal(created.status, 201);
  const id = (await created.json()).id;

  try {
    const first = await runCron();
    assert.ok(first.sent >= 1, "a reminder was sent");
    const feed = JSON.stringify(await (await call(client, "GET", "/api/notifications/mine")).json());
    assert.ok(feed.includes("Trening już wkrótce"));
    const second = await runCron();
    assert.equal(second.sent, 0, "no duplicate reminder on a second run");
  } finally {
    await call(trainer, "DELETE", `/api/sessions/${id}`); // a failed assertion must not leave a session that breaks later tests
  }
  assert.equal((await fetch(`${API_URL}/api/cron/payment-notifications`, { method: "POST" })).status, 401, "cron needs its token");
});

test("clients without a recent weekly report get one reminder", { skip: !process.env.CRON_JOB_TOKEN }, async () => {
  const runCron = async () => {
    const res = await fetch(`${API_URL}/api/cron/payment-notifications?forceReports=1`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_JOB_TOKEN}` },
    });
    assert.equal(res.status, 200);
    return (await res.json()).reportReminders;
  };
  // Other suites leave weekly reports (and earlier runs leave reminders) behind, so compare the feed before and after
  const reports = await (await call(client, "GET", "/api/reports")).json();
  const hasRecentReport = reports.some((report) => Date.now() - new Date(report.createdAt).getTime() < 6 * 86400000);
  const reminders = async () => JSON.stringify(await (await call(client, "GET", "/api/notifications/mine?limit=100")).json()).split("Raport tygodniowy").length - 1;
  const before = await reminders();
  const first = await runCron();
  const after = await reminders();
  if (hasRecentReport) {
    assert.equal(after, before, "a client who sent a report this week is left alone");
  } else if (before === 0) {
    // an earlier run may have reminded this client already (one per 5 days) and that entry may have scrolled out of the feed
    if (first.sent === 0) assert.ok(first.skipped >= 1, "no reminder only because one was sent recently");
    else {
      assert.equal(after, 1);
      assert.equal((await runCron()).sent, 0, "no second reminder within 5 days");
    }
  } else {
    assert.equal(after, before, "already reminded in the last 5 days: no duplicate");
  }
  assert.equal((await fetch(`${API_URL}/api/cron/payment-notifications?forceReports=1`, { method: "POST" })).status, 401, "cron needs its token");
});

test("optional notifications can be switched off per role, and a muted one is not delivered", { skip: !process.env.CRON_JOB_TOKEN }, async () => {
  const options = async (who) => (await (await call(who, "GET", "/api/notification-preferences")).json()).options;
  assert.deepEqual((await options(client)).map((o) => o.type), ["session_reminder", "report_reminder", "review_request", "email_fallback"]);
  assert.ok((await options(trainer)).every((o) => ["daily_summary", "weekly_summary", "studio_announcement", "email_fallback"].includes(o.type)), "trainers see their own list");

  const bad = await call(client, "PUT", "/api/notification-preferences", { muted: "report_reminder" });
  assert.equal(bad.status, 400);
  // transactional and foreign types are ignored
  assert.equal((await call(client, "PUT", "/api/notification-preferences", { muted: ["report_reminder", "plan_assigned", "weekly_summary"] })).status, 200);
  const after = await options(client);
  assert.equal(after.find((o) => o.type === "report_reminder").enabled, false);
  assert.equal(after.find((o) => o.type === "session_reminder").enabled, true);
  assert.equal(after.length, 4, "nothing else became switchable");
  assert.equal(after.find((o) => o.type === "email_fallback").enabled, true, "the e-mail fallback is on by default");
  assert.equal((await options(trainer)).every((o) => o.enabled), true, "another user is unaffected");

  const count = async () => JSON.stringify(await (await call(client, "GET", "/api/notifications/mine")).json()).split("Raport tygodniowy").length - 1;
  const before = await count();
  const res = await fetch(`${API_URL}/api/cron/payment-notifications?forceReports=1`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_JOB_TOKEN}` } });
  assert.equal(res.status, 200);
  assert.equal(await count(), before, "a muted reminder is not delivered");

  // quiet hours: only the offered presets, independent of the muted list
  const quiet = async () => (await (await call(client, "GET", "/api/notification-preferences")).json()).quietHours;
  assert.equal((await call(client, "PUT", "/api/notification-preferences", { quietHours: { start: 1, end: 2 } })).status, 400, "arbitrary windows are refused");
  assert.equal((await call(client, "PUT", "/api/notification-preferences", { quietHours: { start: 22 * 60, end: 7 * 60 } })).status, 200);
  assert.deepEqual((await quiet()).current, { start: 1320, end: 420 });
  assert.equal((await options(client)).find((o) => o.type === "report_reminder").enabled, false, "the muted list was left alone");
  assert.ok((await quiet()).presets.length >= 1, "the app gets the presets from the server");
  assert.equal((await call(client, "PUT", "/api/notification-preferences", { quietHours: null })).status, 200);
  assert.equal((await quiet()).current, null);

  assert.equal((await call(client, "PUT", "/api/notification-preferences", { muted: [] })).status, 200);
  assert.ok((await options(client)).every((o) => o.enabled), "everything is on again");
  assert.equal((await fetch(`${API_URL}/api/notification-preferences`)).status, 401);
});

test("trainers get a weekly summary once", { skip: !process.env.CRON_JOB_TOKEN }, async () => {
  const runCron = async () => {
    const res = await fetch(`${API_URL}/api/cron/payment-notifications?forceWeekly=1`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_JOB_TOKEN}` },
    });
    assert.equal(res.status, 200);
    return (await res.json()).weeklySummaries;
  };
  const first = await runCron();
  assert.ok(first.trainers >= 1);
  const feed = JSON.stringify(await (await call(trainer, "GET", "/api/notifications/mine?limit=100")).json());
  // earlier runs may already have sent this week's summary (one per 5 days, and old ones scroll out of the feed)
  assert.ok(feed.includes("Twój tydzień z podopiecznymi") || first.skipped >= 1, "the trainer received the summary, or already had one");
  const second = await runCron();
  assert.equal(second.sent, 0, "no second summary within five days");
  // without force the job only sends on Mondays; either way it must answer cleanly
  const plain = await fetch(`${API_URL}/api/cron/payment-notifications`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_JOB_TOKEN}` } });
  assert.equal(plain.status, 200);
});

test("trainers get a morning message about today's calendar, once", { skip: !process.env.CRON_JOB_TOKEN }, async () => {
  const booked = await call(trainer, "POST", "/api/sessions", {
    clientId: client.id, scheduledAt: new Date(Date.now() + 2 * 60000).toISOString(), durationMinutes: 30,
  });
  assert.equal(booked.status, 201);
  const sessionId = (await booked.json()).id;
  try {
    const runCron = async () => {
      const res = await fetch(`${API_URL}/api/cron/payment-notifications`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_JOB_TOKEN}` } });
      assert.equal(res.status, 200);
      return (await res.json()).dailySummaries;
    };
    const first = await runCron();
    assert.ok(first.trainers >= 1);
    const feed = await (await call(trainer, "GET", "/api/notifications/mine?limit=100")).json();
    const message = feed.notifications.find((item) => item.title === "Twój dzień");
    assert.ok(message, "the trainer received the morning message (now, or earlier within 18 hours)");
    // which run sent it (and so what it listed) depends on earlier cron calls within 18 hours; the wording is unit-tested
    assert.match(message.body, /^Dziś: /);
    assert.equal((await runCron()).sent, 0, "never twice within 18 hours");
  } finally {
    await call(trainer, "DELETE", `/api/sessions/${sessionId}`);
  }
});

test("cleanup: archive the relationship and delete the plan", async () => {
  assert.equal((await call(client, "POST", `/api/clients/${client.id}/archive`)).status, 403, "client cannot archive");
  await call(trainer, "DELETE", `/api/assignments/client/${client.id}`);
  await call(trainer, "POST", `/api/clients/${client.id}/archive`);
  assert.equal((await call(trainer, "DELETE", `/api/plans/${state.planId}`)).status, 200);
});
