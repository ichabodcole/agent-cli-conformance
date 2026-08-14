import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { noSecretsInHelpChecker } from "./no-secrets-in-help.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("F1 — help and schema never contain secrets", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [noSecretsInHelpChecker]);
    const f = noSecretsInHelpChecker.check(h);
    expect(f.verdict).toBe("pass");
    // Scope, not just the verdict: the pass says WHERE it looked and how weak the claim is, and
    // the rule page's `## Current checker coverage` section has to say the same thing.
    expect(f.detail).toContain("no KNOWN credential pattern in root help");
    expect(f.ruleId).toBe("F1");
  });

  // The negative control: help embeds an AKIA-prefixed placeholder (see the fixture's own
  // comment — it is a deliberate non-secret) as a flag's default value.
  test("FAILS a CLI whose help text embeds a credential-shaped string", async () => {
    const h = await record(fixture("broken/leaks-secret-in-help.ts"), [noSecretsInHelpChecker]);
    const f = noSecretsInHelpChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("AWS access key");
    expect(f.ruleId).toBe("F1");
  });

  test("reports unverified when the probe was not recorded", () => {
    const h: History = {
      target: { path: "x", argv0: ["x"] },
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
      byId: new Map(),
    };
    const f = noSecretsInHelpChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [noSecretsInHelpChecker]);
    const f = noSecretsInHelpChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
