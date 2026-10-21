// node --test tests/blog.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ARTICLES, wordCount } from "../src/content/blog.ts";

const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");

test("slugs are unique, URL-safe and every article is in the sitemap", () => {
  const slugs = ARTICLES.map((article) => article.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(sitemap.includes(`https://paneltrenera.pl/blog/${slug}`), `${slug} is missing from the sitemap`);
  }
  assert.ok(sitemap.includes("https://paneltrenera.pl/blog</loc>"), "the index is in the sitemap");
});

test("each article has a meta description that fits a search result, a valid date and real substance", () => {
  for (const article of ARTICLES) {
    assert.ok(article.title.length > 10 && article.title.length <= 90, `${article.slug}: title length`);
    assert.ok(article.description.length >= 80 && article.description.length <= 160, `${article.slug}: description is ${article.description.length} characters`);
    assert.ok(!Number.isNaN(Date.parse(article.date)), `${article.slug}: date`);
    assert.ok(article.blocks.filter((block) => block.type === "h2").length >= 4, `${article.slug}: at least four sections`);
    assert.ok(wordCount(article) >= 330, `${article.slug}: only ${wordCount(article)} words`);
  }
});

test("no promises the product does not keep", () => {
  const text = JSON.stringify(ARTICLES).toLowerCase();
  for (const claim of ["gwarantuj", "100% skuteczn", "bez ryzyka", "cudown"]) assert.ok(!text.includes(claim), `contains "${claim}"`);
});
