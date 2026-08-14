import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXPECTATIONS_FILE, ExpectationsError, loadExpectations } from "./expectations.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "acc-expectations-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Write the expectations file with arbitrary — including invalid — content. */
function write(content: string): void {
  writeFileSync(join(dir, EXPECTATIONS_FILE), content);
}

const IDS = ["A1", "A2", "B1"];

describe("loadExpectations", () => {
  test("a present file is parsed", () => {
    write(JSON.stringify({ knownFailures: { A1: "legacy parser" } }));
    expect(loadExpectations(dir, IDS)).toEqual({ knownFailures: { A1: "legacy parser" } });
  });

  test("a file missing knownFailures still yields an empty object rather than undefined", () => {
    write(JSON.stringify({}));
    expect(loadExpectations(dir, IDS)).toEqual({ knownFailures: {} });
  });

  test("an empty knownRuleIds list disables the id check, for a partial corpus", () => {
    write(JSON.stringify({ knownFailures: { Z9: "not a rule here" } }));
    expect(loadExpectations(dir, [])).toEqual({ knownFailures: { Z9: "not a rule here" } });
  });
});

// "Nobody asked" and "you asked for this path" are different questions, and answering both with
// an empty expectations set meant a `--expectations` typo failed rules the project believed it
// had excused — the silent-failure shape the catalogue exists to catch (review R2-4).
describe("which missing file is an error", () => {
  test("no default file in the cwd is not an error", () => {
    expect(loadExpectations(undefined, IDS)).toEqual({ knownFailures: {} });
  });

  test("an explicitly requested directory that does not exist is an error naming it", () => {
    const missing = join(dir, "nope");
    expect(() => loadExpectations(missing, IDS)).toThrow(ExpectationsError);
    expect(() => loadExpectations(missing, IDS)).toThrow(/no such directory/);
  });

  test("an explicitly requested directory with no expectations file is an error", () => {
    expect(() => loadExpectations(dir, IDS)).toThrow(/no \.acc-expectations\.json/);
  });

  test("the error carries the offending path as a field, not only in the message", () => {
    try {
      loadExpectations(join(dir, "nope"), IDS);
      throw new Error("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ExpectationsError);
      expect((err as ExpectationsError).path).toBe(join(dir, "nope", EXPECTATIONS_FILE));
    }
  });
});

// The parsed JSON used to be cast straight to `Partial<Expectations>` — a promise the type
// system cannot keep about a file on disk. Each case below is a value that promise admitted.
describe("shape validation", () => {
  test("malformed JSON is a configuration error, not an unclassified fault", () => {
    write("{ not json");
    expect(() => loadExpectations(dir, IDS)).toThrow(ExpectationsError);
    expect(() => loadExpectations(dir, IDS)).toThrow(/is not valid JSON/);
  });

  test.each([
    ["null", "null"],
    ["an array", "[]"],
    ["a number", "42"],
    ["a string", '"A1"'],
  ])("a root that is %s is rejected", (_label, json) => {
    write(json);
    expect(() => loadExpectations(dir, IDS)).toThrow(/must contain a JSON object/);
  });

  // The specific defect the review names: `knownFailures: null` survived the cast and threw on a
  // later `in` operation, reporting a configuration mistake as an internal fault.
  test.each([
    ["null", null],
    ["an array", []],
    ["a number", 3],
    ["a string", "A1"],
  ])("knownFailures that is %s is rejected", (_label, value) => {
    write(JSON.stringify({ knownFailures: value }));
    expect(() => loadExpectations(dir, IDS)).toThrow(/knownFailures must be an object/);
  });

  test.each([
    ["null", null],
    ["a number", 1],
    ["an array", ["because"]],
    ["an object", { why: "because" }],
    ["an empty string", ""],
    ["whitespace", "   "],
  ])("a reason that is %s is rejected", (_label, reason) => {
    write(JSON.stringify({ knownFailures: { A1: reason } }));
    expect(() => loadExpectations(dir, IDS)).toThrow(/must be a non-empty string reason/);
  });

  test("the rejection names the rule whose reason is wrong", () => {
    write(JSON.stringify({ knownFailures: { A1: "fine", B1: 7 } }));
    expect(() => loadExpectations(dir, IDS)).toThrow(/knownFailures\.B1/);
  });
});

// An id no checker answers to excuses nothing AND never becomes a stale expectation, so the
// ratchet cannot tighten past it: the entry sits in the file forever, doing nothing, looking
// like coverage.
describe("rule ids are checked against the active registry", () => {
  test("an unknown id is rejected, quoting the ids that exist", () => {
    write(JSON.stringify({ knownFailures: { Z9: "a rule that does not exist" } }));
    expect(() => loadExpectations(dir, IDS)).toThrow(/"Z9", which is not a rule this kit checks/);
    expect(() => loadExpectations(dir, IDS)).toThrow(/A1, A2, B1/);
  });

  test.each(["a1", "A1 ", " A1"])("the near-miss %j is rejected, not silently accepted", (id) => {
    write(JSON.stringify({ knownFailures: { [id]: "typo" } }));
    expect(() => loadExpectations(dir, IDS)).toThrow(/is not a rule this kit checks/);
  });

  test("every valid id is accepted", () => {
    write(JSON.stringify({ knownFailures: { A1: "one", A2: "two", B1: "three" } }));
    expect(Object.keys(loadExpectations(dir, IDS).knownFailures)).toEqual(["A1", "A2", "B1"]);
  });
});
