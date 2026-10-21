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
  assert.deepEqual((await options(client)).map((o) => o.type), ["session_reminder", "report_reminder", "review_request"]);
  assert.ok((await options(trainer)).every((o) => ["weekly_summary", "studio_announcement"].includes(o.type)), "trainers see their own list");

  const bad = await call(client, "PUT", "/api/notification-preferences", { muted: "report_reminder" });
  assert.equal(bad.status, 400);
  // transactional and foreign types are ignored
  assert.equal((await call(client, "PUT", "/api/notification-preferences", { muted: ["report_reminder", "plan_assigned", "weekly_summary"] })).status, 200);
  const after = await options(client);
  assert.equal(after.find((o) => o.type === "report_reminder").enabled, false);
  assert.equal(after.find((o) => o.type === "session_reminder").enabled, true);
  assert.equal(after.length, 3, "nothing else became switchable");
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

test("cleanup: archive the relationship and delete the plan", async () => {
  assert.equal((await call(client, "POST", `/api/clients/${client.id}/archive`)).status, 403, "client cannot archive");
  await call(trainer, "DELETE", `/api/assignments/client/${client.id}`);
  await call(trainer, "POST", `/api/clients/${client.id}/archive`);
  assert.equal((await call(trainer, "DELETE", `/api/plans/${state.planId}`)).status, 200);
});
