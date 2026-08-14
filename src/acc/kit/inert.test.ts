import { describe, expect, test } from "bun:test";
import { assertInert, classifyInertness, SENTINEL } from "./inert.ts";
import type { Invocation } from "./types.ts";

const inv = (args: string[], inertness: Invocation["inertness"]): Invocation => ({
  args,
  inertness,
  purpose: "test",
});

describe("classifyInertness", () => {
  test("accepts a pure help path", () => {
    expect(classifyInertness(inv(["--help"], "help-path"))).toBe("help-path");
    expect(classifyInertness(inv(["--version"], "help-path"))).toBe("help-path");
  });

  test("accepts an invocation carrying the sentinel", () => {
    expect(classifyInertness(inv([`--${SENTINEL}-flag`], "sentinel"))).toBe("sentinel");
  });

  test("accepts a flag-only invocation with no verb", () => {
    expect(classifyInertness(inv(["--frmat"], "no-verb"))).toBe("no-verb");
  });

  // THE IMPORTANT ONE. A checker that mislabels a real command as inert must be refused,
  // not trusted. The gate fails closed.
  test("REFUSES a claimed help-path that carries a real verb", () => {
    expect(() => assertInert(inv(["deploy", "--help"], "help-path"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed sentinel invocation with no sentinel in it", () => {
    expect(() => assertInert(inv(["deploy", "--force"], "sentinel"))).toThrow(/not inert/i);
  });

  // The sentinel appearing SOMEWHERE is not enough: a real verb can ride alongside it. A
  // lenient parser rejects the unrecognised sentinel flag and executes `deploy` regardless.
  test("REFUSES a claimed sentinel invocation where a real verb rides alongside the sentinel", () => {
    expect(() => assertInert(inv(["deploy", `--${SENTINEL}`], "sentinel"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed no-verb invocation that has a verb", () => {
    expect(() => assertInert(inv(["deploy", "--frmat"], "no-verb"))).toThrow(/not inert/i);
  });

  // A flag's value is syntactically identical to a verb — nothing distinguishes `--frmat json`
  // from `--dry-run deploy` without knowing the flag's arity, which we never know for an
  // unknown binary. The gate refuses the whole shape rather than guess.
  test("REFUSES a claimed no-verb invocation carrying a value indistinguishable from a verb", () => {
    expect(() => assertInert(inv(["--frmat", "json"], "no-verb"))).toThrow(/not inert/i);
  });

  test("REFUSES the motivating case: a boolean-looking flag followed by a real verb", () => {
    expect(() => assertInert(inv(["--dry-run", "deploy"], "no-verb"))).toThrow(/not inert/i);
  });

  // `bare` is its own class, not a side effect of `[].every(...)` being vacuously true. D2 and
  // E1 both need to probe an empty-args invocation, so it has to be nameable — but naming it
  // `bare` must be the ONLY way in, not an accident that `help-path` or `no-verb` fall into.
  test("accepts a bare invocation (no arguments at all)", () => {
    expect(classifyInertness(inv([], "bare"))).toBe("bare");
  });

  test("REFUSES a claimed no-verb invocation with no arguments — that is `bare`, not `no-verb`", () => {
    expect(() => assertInert(inv([], "no-verb"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed help-path invocation with no arguments — that is `bare`, not `help-path`", () => {
    expect(() => assertInert(inv([], "help-path"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed bare invocation that actually carries an argument", () => {
    expect(() => assertInert(inv(["--help"], "bare"))).toThrow(/not inert/i);
  });

  test("REFUSES an invocation whose env carries a key outside the allowlist", () => {
    const withEnv: Invocation = { ...inv(["--help"], "help-path"), env: { PATH: "/evil" } };
    expect(() => assertInert(withEnv)).toThrow(/not inert/i);
  });
});
