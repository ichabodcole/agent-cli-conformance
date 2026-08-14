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
    expect(classifyInertness(inv(["--frmat", "json"], "no-verb"))).toBe("no-verb");
  });

  // THE IMPORTANT ONE. A checker that mislabels a real command as inert must be refused,
  // not trusted. The gate fails closed.
  test("REFUSES a claimed help-path that carries a real verb", () => {
    expect(() => assertInert(inv(["deploy", "--help"], "help-path"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed sentinel invocation with no sentinel in it", () => {
    expect(() => assertInert(inv(["deploy", "--force"], "sentinel"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed no-verb invocation that has a verb", () => {
    expect(() => assertInert(inv(["deploy", "--frmat"], "no-verb"))).toThrow(/not inert/i);
  });
});
