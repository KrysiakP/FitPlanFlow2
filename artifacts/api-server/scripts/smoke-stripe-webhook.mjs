// Stripe webhook test: signature checks and subscription state changes. LOCAL API only.
// Uses events that need no call to the Stripe API (checkout completed, subscription updated/deleted).
//
//   API_URL=http://localhost:3100 TEST_PASSWORD=... TRAINER_EMAIL=... \
//   STRIPE_WEBHOOK_SECRET=<same value the API runs with> node --test scripts/smoke-stripe-webhook.mjs
import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";

const API_URL = process.env.API_URL ?? "http://localhost:3100";
const PASSWORD = process.env.TEST_PASSWORD;
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const { TRAINER_EMAIL } = process.env;

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API_URL)) {
  throw new Error(`Refusing to run against ${API_URL}: only localhost is allowed`);
}
if (!PASSWORD || !SECRET || !TRAINER_EMAIL) {
  throw new Error("Set TEST_PASSWORD, TRAINER_EMAIL and STRIPE_WEBHOOK_SECRET");
}

const stripe = new Stripe("sk_test_unused", { apiVersion: "2024-11-20.acacia" });

async function login(email) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  return { token: body.mobileToken, id: body.id };
}

const me = async (who) =>
  (await fetch(`${API_URL}/api/auth/user`, { headers: { Authorization: `Bearer ${who.token}` } })).json();

function send(event, { signed = true, secret = SECRET } = {}) {
  const payload = JSON.stringify(event);
  const headers = { "Content-Type": "application/json" };
  if (signed) headers["stripe-signature"] = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return fetch(`${API_URL}/api/webhooks/stripe`, { method: "POST", headers, body: payload });
}

const event = (type, object) => ({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`, object: "event", type, data: { object } });

let trainer;

test.before(async () => {
  trainer = await login(TRAINER_EMAIL);
});

test("unsigned and wrongly signed events are rejected", async () => {
  const body = event("checkout.session.completed", { client_reference_id: trainer.id, subscription: "sub_x", customer: "cus_x", metadata: { tier: "pro" } });
  assert.equal((await send(body, { signed: false })).status, 400);
  assert.equal((await send(body, { secret: "whsec_wrong" })).status, 400);
  assert.notEqual((await me(trainer)).subscriptionTier, "pro", "a rejected event must not change the plan");
});

test("a paid checkout activates the chosen plan", async () => {
  const res = await send(event("checkout.session.completed", {
    client_reference_id: trainer.id, subscription: "sub_smoke", customer: "cus_smoke", metadata: { userId: trainer.id, tier: "pro" },
  }));
  assert.equal(res.status, 200);
  const user = await me(trainer);
  assert.equal(user.subscriptionTier, "pro");
  assert.equal(user.subscriptionStatus, "active");
});

test("a second checkout is refused while a subscription is active", async () => {
  const res = await fetch(`${API_URL}/api/subscription/create-checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${trainer.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tier: "solo" }),
  });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).useBillingPortal, true);
  const invalid = await fetch(`${API_URL}/api/subscription/create-checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${trainer.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tier: "studio" }),
  });
  assert.equal(invalid.status, 400, "unknown or unlisted tiers are rejected");
});

test("a failed payment marks the subscription and keeps the grace-period date", async () => {
  const res = await send(event("customer.subscription.updated", {
    id: "sub_smoke", status: "past_due", metadata: { userId: trainer.id, tier: "pro" }, canceled_at: null,
  }));
  assert.equal(res.status, 200);
  const user = await me(trainer);
  assert.equal(user.subscriptionStatus, "past_due");
  assert.ok(user.subscriptionCancelledAt, "grace period start is recorded");
});

test("a deleted subscription falls back to the free plan", async () => {
  const res = await send(event("customer.subscription.deleted", {
    id: "sub_smoke", status: "canceled", metadata: { userId: trainer.id }, canceled_at: Math.floor(Date.now() / 1000),
  }));
  assert.equal(res.status, 200);
  const user = await me(trainer);
  assert.equal(user.subscriptionTier, "start");
  assert.equal(user.subscriptionStatus, "canceled");
});

test("events without a user are ignored without errors", async () => {
  assert.equal((await send(event("customer.subscription.updated", { id: "sub_none", status: "active", metadata: {} }))).status, 200);
  assert.equal((await send(event("charge.refunded", { id: "ch_1" }))).status, 200);
});

test.after(async () => {
  // Leave the account as we found it: free plan, no cancellation marker
  await send(event("customer.subscription.updated", { id: "sub_smoke", status: "active", metadata: { userId: trainer.id } }));
});
