import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERB_DISPATCH_ASSUMED } from "../../inert.ts";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { namesOffendingTokenChecker } from "./names-offending-token.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("A3 — errors must name the offending token", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [namesOffendingTokenChecker]);
    const f = namesOffendingTokenChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A3");
  });

  // The negative control: this fixture never errors at all on an unrecognised token — it
  // accepts anything and exits 0 — so stderr is empty and names nothing.
  test("FAILS a CLI whose rejections name nothing", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [
      namesOffendingTokenChecker,
    ]);
    const f = namesOffendingTokenChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("did not name");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [namesOffendingTokenChecker]);
    const f = namesOffendingTokenChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});

// THE SAME PREMISE, POINTING THE OTHER WAY. Against `first-positional-is-data.ts` there is no
// rejection to name anything in — the token was a search pattern — and this checker still
// reports `fail`, complaining about the wording of a diagnostic nothing emitted. The verdict is
// unchanged here on purpose; what it now carries is the assumption behind it.
describe("A3 — the verb clause says what it assumed about the first positional", () => {
  test("still fails a target whose first positional is data, and discloses the assumption", async () => {
    const h = await record(fixture("first-positional-is-data.ts"), [namesOffendingTokenChecker]);
    const f = namesOffendingTokenChecker.check(h);
    expect({ verdict: f.verdict, discloses: f.detail.includes(VERB_DISPATCH_ASSUMED) }).toEqual({
      verdict: "fail",
      discloses: true,
    });
    // The flag half needs no such clause and must not acquire one: an unknown option is an
    // unknown option whatever the target does with positionals.
    expect(f.detail).toContain("verb rejection did not name the verb");
  });

  // The pass asserts a verb REJECTION happened, so it inherits the premise as well.
  test("carries it on the conforming fixture's pass", async () => {
    const h = await record(fixture("conforming.ts"), [namesOffendingTokenChecker]);
    const f = namesOffendingTokenChecker.check(h);
    expect({ verdict: f.verdict, discloses: f.detail.includes(VERB_DISPATCH_ASSUMED) }).toEqual({
      verdict: "pass",
      discloses: true,
    });
  });

  test("names the assumption in its coverage gaps", () => {
    const named = namesOffendingTokenChecker.coverageGaps.filter((g) =>
      g.includes("the verb probe assumes"),
    );
    expect(named.length).toBe(1);
  });
});
