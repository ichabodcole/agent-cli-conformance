// The kit, run against a REAL system binary.
//
// `acc`'s self-check is weaker evidence than it looks. acc satisfies B3 and C2's exit-2 branch
// by construction — it declares `--json` in its own spec and derives every usage error from one
// exit-code table — and those are precisely the branches that come back `unverified` against
// real tools. So the positive control exercises paths no real CLI takes, and the fixtures are
// all Bun scripts written by us, against our own idea of what a CLI looks like.
//
// `git` is none of those things: a C binary, decades of accreted argument handling, exit 129
// for usage errors, a bare invocation that prints help to stdout, and no machine-mode flag at
// all. This asserts NO VERDICT — what git scores is git's business and would make this test a
// hostage to git's release notes. It asserts that the kit survives contact: every checker
// returns a well-formed finding, nothing throws, nothing hangs, and the report is coherent.

import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { VERSION } from "../version.ts";
import { loadConfig } from "./config.ts";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import { buildReport, runCheckers } from "./report.ts";
import type { TargetInfo } from "./types.ts";

/** Resolve a system binary, or null if this machine does not have it. */
function which(name: string): string | null {
  try {
    const p = execFileSync("which", [name], { encoding: "utf8" }).trim();
    return p === "" ? null : p;
  } catch {
    return null;
  }
}

// `?? "git"` keeps the type non-null for the block below, which never runs when git is absent.
const GIT = which("git") ?? "git";

// Skipped cleanly rather than failed: a machine without git is a fine machine, and a suite that
// red-lights on a missing optional tool trains people to ignore it.
const describeIfGit = which("git") ? describe : describe.skip;

describeIfGit("the kit against a real system binary (git)", () => {
  const target: TargetInfo = { path: GIT, argv0: [GIT] };

  test("records a history without throwing", async () => {
    const h = await record(target, CHECKERS);
    expect(h.observations.length).toBeGreaterThan(0);
    expect(h.target.path).toBe(GIT);
    // Discovery ran and parsed something. git's help is not in the shape our fixtures use, so
    // this is the one place the heuristics meet a layout nobody wrote for them.
    expect(h.discovery.helpReadable).toBe(true);
  }, 120_000);

  test("every checker returns a well-formed finding", async () => {
    const h = await record(target, CHECKERS);
    const findings = runCheckers(h, CHECKERS);
    expect(findings).toHaveLength(CHECKERS.length);
    for (const f of findings) {
      expect(["pass", "fail", "unverified"]).toContain(f.verdict);
      // A finding nobody can act on is not a finding. Both of these have been empty in real
      // defects on this branch (B1 cited no evidence at all while holding observations).
      expect(f.detail.length).toBeGreaterThan(0);
      for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
    }
  }, 120_000);

  test("builds a coherent report", async () => {
    const h = await record(target, CHECKERS);
    const r = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      loadConfig(undefined),
      "L0",
      VERSION,
    );

    // Deliberately NO assertion about `conformant`. What git scores is git's business; this
    // test is about whether the kit survives a real CLI, and pinning a verdict here would make
    // the suite a hostage to somebody else's release.
    expect(typeof r.conformant).toBe("boolean");
    expect(typeof r.fullyVerified).toBe("boolean");
    expect(r.findings).toHaveLength(CHECKERS.length);

    // Internal consistency of the counts, which is checkable without knowing the verdict.
    const applicable = r.findings.filter((f) => f.applicable);
    expect(r.counts.notApplicable).toBe(r.findings.length - applicable.length);
    expect(r.counts.core).toBe(applicable.filter((f) => f.tier === "core").length);
    expect(r.counts.corePassed + r.counts.coreFailures).toBeLessThanOrEqual(r.counts.core);
    // The ruling: full verification is the stronger claim, so it can never hold alone.
    if (r.fullyVerified) expect(r.conformant).toBe(true);
  }, 120_000);

  test("no probe hits the deadline", async () => {
    // Not a claim about git so much as about the kit: every L0 probe is a help path or an
    // invalid invocation, and any of them blocking would mean the probe set is not what it
    // claims to be.
    const h = await record(target, CHECKERS);
    const hung = h.observations.filter((o) => o.timedOut);
    expect(hung.map((o) => o.invocation.args.join(" "))).toEqual([]);
  }, 120_000);
});
