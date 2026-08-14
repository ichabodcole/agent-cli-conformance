import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const EXPECTATIONS_FILE = ".acc-expectations.json";

export interface Expectations {
  /** Rule ids whose failure is currently accepted, each with a reason. */
  knownFailures: Record<string, string>;
}

/**
 * A malformed or misdirected expectations file.
 *
 * Its own error type rather than an `AccError`, for the reason `record.ts`'s
 * `TargetNotExecutableError` is: the kit is meant to be usable without this CLI's error
 * taxonomy, and the command layer owns the mapping to a kind and an exit code. `path` is carried
 * separately from the message so the translation can put it in structured `details` rather than
 * leaving the caller to parse prose.
 */
export class ExpectationsError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(message);
    this.name = "ExpectationsError";
    this.path = path;
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Known failures live in a per-project file that RATCHETS DOWN — never as edits to the shared
 * checker corpus. Borrowed from Web Platform Tests: it lets a project adopt the kit today
 * without a wall of red, while keeping every outstanding failure named and visible.
 *
 * The file only ever shrinks. Nothing in the kit adds to it automatically.
 *
 * ## Everything here is validated, because the file suppresses a gate
 *
 * The parsed JSON used to be cast straight to `Partial<Expectations>`, which is a promise the
 * type system cannot keep about a file on disk (review R2-4). What that admitted:
 * `knownFailures: null` reached a later `in` and threw an INTERNAL error over a configuration
 * mistake; arrays and numbers entered the report despite the declared type; and a mistyped rule
 * id excused nothing, silently — it does not match a finding, so it never suppresses a failure
 * AND never shows up as a stale expectation. A file whose whole job is to suppress a gate is the
 * last place to accept "probably fine".
 *
 * `knownRuleIds` is passed in rather than imported from the registry so the kit stays free of it;
 * an empty list disables the id check, which is what a caller checking a partial corpus wants.
 *
 * ## An explicitly requested path that is wrong is an ERROR
 *
 * `dir` undefined means "nobody asked" — the default lookup in the cwd, where a missing file is
 * the normal case and yields empty expectations. A `dir` the caller passed is a request, and a
 * request that cannot be honoured is reported instead of ignored: silently continuing with an
 * empty set would fail a rule the project believed it had excused, which is precisely the
 * silent-failure shape this catalogue exists to catch a CLI doing.
 */
export function loadExpectations(
  dir: string | undefined,
  knownRuleIds: readonly string[] = [],
): Expectations {
  const explicit = dir !== undefined;
  const path = join(dir ?? ".", EXPECTATIONS_FILE);

  if (!existsSync(path)) {
    if (!explicit) return { knownFailures: {} };
    throw new ExpectationsError(
      path,
      existsSync(dir) && statSync(dir).isDirectory()
        ? `no ${EXPECTATIONS_FILE} in the requested directory`
        : `no such directory: ${dir}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    // The parser's own message names the offset, which is the one detail that makes a syntax
    // error fixable; it is quoted rather than replaced with "invalid JSON".
    throw new ExpectationsError(path, `is not valid JSON: ${(err as Error).message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new ExpectationsError(path, `must contain a JSON object, found ${describe(parsed)}`);
  }

  const raw = parsed.knownFailures;
  if (raw === undefined) return { knownFailures: {} };
  if (!isPlainObject(raw)) {
    throw new ExpectationsError(path, `knownFailures must be an object, found ${describe(raw)}`);
  }

  const known = new Set(knownRuleIds);
  const knownFailures: Record<string, string> = {};
  for (const [ruleId, reason] of Object.entries(raw)) {
    if (typeof reason !== "string" || reason.trim() === "") {
      throw new ExpectationsError(
        path,
        `knownFailures.${ruleId} must be a non-empty string reason, found ${describe(reason)}`,
      );
    }
    // An id no checker answers to excuses nothing and never becomes a stale expectation either,
    // so the ratchet cannot tighten past it. `A1 ` and `a1` are the realistic typos.
    if (known.size > 0 && !known.has(ruleId)) {
      throw new ExpectationsError(
        path,
        `knownFailures names "${ruleId}", which is not a rule this kit checks (known: ${[...known].sort().join(", ")})`,
      );
    }
    knownFailures[ruleId] = reason;
  }
  return { knownFailures };
}

/** A value's shape, for an error message. `null` and `[]` are the two that matter. */
function describe(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "an array";
  return `a ${typeof v}`;
}
