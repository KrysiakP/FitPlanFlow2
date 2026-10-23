// node --test tests/formResolver.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { z as z3 } from "zod";
import { z as z4 } from "zod/v4";
import { schemaResolver, setNestedError } from "../src/lib/formResolver.ts";

const run = (schema, values) => schemaResolver(schema)(values, undefined, { fields: {}, shouldUseNativeValidation: false });

for (const [version, z] of [["zod 3", z3], ["zod 4", z4]]) {
  test(`${version}: valid input returns the parsed values and no errors`, async () => {
    const result = await run(z.object({ name: z.string().min(1), amount: z.coerce.number() }), { name: "Przysiad", amount: "5" });
    assert.deepEqual(result.errors, {});
    assert.deepEqual(result.values, { name: "Przysiad", amount: 5 });
  });

  test(`${version}: invalid input returns the messages by field instead of throwing`, async () => {
    const result = await run(z.object({ name: z.string().min(1, "Nazwa jest wymagana"), email: z.string().email("Zły e-mail") }), { name: "", email: "x" });
    assert.deepEqual(result.values, {});
    assert.equal(result.errors.name.message, "Nazwa jest wymagana");
    assert.equal(result.errors.email.message, "Zły e-mail");
  });

  test(`${version}: nested and array paths become nested errors`, async () => {
    const schema = z.object({ workouts: z.array(z.object({ name: z.string().min(1, "Brak nazwy"), exercises: z.array(z.object({ reps: z.number().min(1, "Minimum 1") })) })) });
    const result = await run(schema, { workouts: [{ name: "A", exercises: [{ reps: 3 }] }, { name: "", exercises: [{ reps: 3 }, { reps: 0 }] }] });
    assert.equal(result.errors.workouts[1].name.message, "Brak nazwy");
    assert.equal(result.errors.workouts[1].exercises[1].reps.message, "Minimum 1");
    assert.equal(result.errors.workouts[0], undefined);
  });
}

test("a rule across fields is reported at the field the schema names", async () => {
  const schema = z4.object({ from: z4.number(), to: z4.number() }).refine((v) => v.to > v.from, { message: "Koniec po początku", path: ["to"] });
  assert.equal((await run(schema, { from: 5, to: 1 })).errors.to.message, "Koniec po początku");
});

test("an error on the whole object goes to the root, and the first message of a field wins", () => {
  const tree = {};
  setNestedError(tree, [], { type: "custom", message: "Ogólny błąd" });
  setNestedError(tree, ["a"], { type: "x", message: "pierwszy" });
  setNestedError(tree, ["a"], { type: "y", message: "drugi" });
  assert.equal(tree.root.message, "Ogólny błąd");
  assert.equal(tree.a.message, "pierwszy");
});
