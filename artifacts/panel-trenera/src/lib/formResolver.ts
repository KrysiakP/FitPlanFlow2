import type { FieldValues, Resolver } from "react-hook-form";

/**
 * A react-hook-form resolver for zod schemas of both major versions. The one shipped with @hookform/resolvers 3.x only
 * understands zod 3: handed a zod 4 schema (every schema generated from the database tables is one) it THROWS on invalid
 * input, so the form shows no error at all and simply does nothing.
 */

interface Issue {
  path: PropertyKey[];
  message: string;
  code?: string;
}

interface SchemaLike {
  safeParseAsync(value: unknown): Promise<{ success: true; data: unknown } | { success: false; error: { issues: Issue[] } }>;
}

type ErrorTree = Record<string, unknown>;

/** Puts an error at a path like ["workouts", 0, "name"], creating arrays for numeric steps; the first error of a field wins. */
export function setNestedError(tree: ErrorTree, path: PropertyKey[], error: { type: string; message: string }): void {
  const steps = path.map(String);
  if (steps.length === 0) steps.push("root");
  let node: any = tree;
  steps.forEach((step, index) => {
    const last = index === steps.length - 1;
    if (last) {
      if (node[step] === undefined) node[step] = error;
      return;
    }
    if (node[step] === undefined || typeof node[step] !== "object" || "message" in node[step]) {
      node[step] = /^\d+$/.test(steps[index + 1]) ? [] : {};
    }
    node = node[step];
  });
}

export function schemaResolver(schema: unknown): Resolver<any> {
  return async (values) => {
    const result = await (schema as SchemaLike).safeParseAsync(values);
    if (result.success) return { values: result.data as FieldValues, errors: {} };
    const errors: ErrorTree = {};
    for (const issue of result.error.issues) {
      setNestedError(errors, issue.path, { type: issue.code ?? "validation", message: issue.message });
    }
    return { values: {}, errors: errors as any };
  };
}
