// node --test scripts/access-audit.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { accessFromRequest, ACTION_LABELS } from "../src/lib/accessAudit.ts";

test("trainer reads of client data are recognised with the client id", () => {
  assert.deepEqual(accessFromRequest("GET", "/api/clients/c1/profile"), { subjectId: "c1", action: "profile" });
  assert.deepEqual(accessFromRequest("GET", "/api/clients/c1/reports"), { subjectId: "c1", action: "reports" });
  assert.deepEqual(accessFromRequest("GET", "/api/trainer/clients/c1/exercise-logs"), { subjectId: "c1", action: "training" });
  assert.deepEqual(accessFromRequest("GET", "/api/trainer/clients/c1/active-diet"), { subjectId: "c1", action: "diet" });
});

test("writes, other paths and lookalikes are not logged", () => {
  assert.equal(accessFromRequest("PATCH", "/api/clients/c1/profile"), null);
  assert.equal(accessFromRequest("GET", "/api/clients/c1/profile/extra"), null);
  assert.equal(accessFromRequest("GET", "/api/reports"), null);
  assert.equal(accessFromRequest("GET", "/api/trainer/clients/c1/notes"), null, "the trainer's own notes are not the client's data");
});

test("every logged action has a label for the client", () => {
  for (const action of ["profile", "reports", "training", "diet"]) assert.ok(ACTION_LABELS[action], action);
});
