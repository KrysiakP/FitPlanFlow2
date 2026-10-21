// node --test tests/trainerSeo.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { trainerPageMeta } from "../src/lib/trainerSeo.ts";

const base = { id: "abc", firstName: "Anna", lastName: "Nowak", bio: null, specialization: null, averageRating: null, reviewCount: 0 };

test("the title names the trainer and the specialization", () => {
  assert.equal(trainerPageMeta(base, "https://x.pl").title, "Anna Nowak – trener personalny | Panel Trenera");
  assert.equal(trainerPageMeta({ ...base, specialization: "redukcja i siła" }, "https://x.pl").title, "Anna Nowak – trener personalny, redukcja i siła | Panel Trenera");
});

test("the description is the bio on one line, cut to 155 characters, or a sentence when there is no bio", () => {
  const long = trainerPageMeta({ ...base, bio: `Pracuję z\n\nosobami ${"a".repeat(300)}` }, "https://x.pl").description;
  assert.ok(long.length <= 155 && long.endsWith("…") && !long.includes("\n"));
  assert.equal(trainerPageMeta({ ...base, bio: "Krótko o mnie." }, "https://x.pl").description, "Krótko o mnie.");
  assert.match(trainerPageMeta(base, "https://x.pl").description, /Anna Nowak/);
});

test("structured data carries the link, and the rating only when there are reviews", () => {
  const without = trainerPageMeta(base, "https://x.pl").jsonLd;
  assert.equal(without["@type"], "Person");
  assert.equal(without.url, "https://x.pl/t/abc");
  assert.equal("aggregateRating" in without, false);
  assert.equal("aggregateRating" in trainerPageMeta({ ...base, averageRating: 5, reviewCount: 0 }, "https://x.pl").jsonLd, false, "a rating without reviews is not published");
  const rated = trainerPageMeta({ ...base, averageRating: 4.5, reviewCount: 12 }, "https://x.pl").jsonLd;
  assert.deepEqual(rated.aggregateRating, { "@type": "AggregateRating", ratingValue: 4.5, reviewCount: 12, bestRating: 5, worstRating: 1 });
});
