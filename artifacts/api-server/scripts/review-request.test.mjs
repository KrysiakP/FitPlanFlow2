// node --test scripts/review-request.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { formatReviewRequest } from "../src/lib/reviewRequest.ts";

test("the name appears as an apposition, so no Polish case ending can go wrong", () => {
  const message = formatReviewRequest("Tomek");
  assert.equal(message.title, "Jak oceniasz współpracę z trenerem?");
  assert.match(message.body, /Oceń trenera Tomek w zakładce Profil/);
});

test("it still reads well without a name", () => {
  assert.match(formatReviewRequest(null).body, /^Oceń trenera w zakładce Profil/);
  assert.match(formatReviewRequest("  ").body, /^Oceń trenera w zakładce Profil/);
});
