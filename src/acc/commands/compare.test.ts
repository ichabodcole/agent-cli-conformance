// THE ACCEPTANCE TEST: `acc compare` reproduces, from the product, the divergences a human found
// by hand.
//
// `docs/reports/2026-08-24-eight-owner-clis.md` §2 tabulated five ways the owner's eight
// agent-facing CLIs contradict each other, and produced that table with a shell loop while eight
// `--json` reports sat in the same directory holding the same numbers. Nothing in the catalogue
// could report any of it: every rule judges one tool alone, and several report `PASS+` on BOTH
// sides of a genuine disagreement because they require only "non-zero".
//
// Nothing here is hand-built from that report's prose. Three fixtures model the three distinct
// rows of its table (see src/acc/kit/fixtures/population/), `acc check --json` is run against
// each exactly as an adopter would run it, and `acc compare` is then asked what it sees. The
// assertions are on the divergences coming BACK.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Comparison,
  type ProbeComparison,
  type SurfaceRow,
  surfaceRow,
} from "../kit/compare.ts";
import type { Surface } from "../kit/surface.ts";
import { surfaceSummary } from "../kit/surface.ts";
import { rowSurface } from "./compare.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "../cli.ts");
const POPULATION = join(HERE, "../kit/fixtures/population");

/** The three rows of the report's §2 table that the observations can carry. */
const TARGETS = {
  // Six of the eight: help on stdout at 0, rejections at 2, no `--version` at all.
  seven: "exits-2-no-version",
  // mind-mapper: one usage line on stderr at exit 2, for every argv there is.
  mindMapper: "help-to-stderr",
  // anthill: the other repository, rejecting at exit 1 and answering `--version`.
  anthill: "exits-1-with-version",
} as const;

interface Run {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Run acc with stdin closed, exactly as the harness in conformance.test.ts does. */
function run(args: string[]): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn("bun", [CLI, ...args], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.stdin.end();
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

let dir: string;
/** Report file per fixture, written by the real `acc check --json`. */
const reports: Record<string, string> = {};

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "acc-compare-"));
  for (const name of Object.values(TARGETS)) {
    const r = await run(["check", join(POPULATION, `${name}.ts`), "--json"]);
    // 9 is `Outcome.NonConformant` — a successful check with a negative answer. All three of
    // these fixtures violate something, exactly as all eight real CLIs do; that is not what is
    // being measured here, and a run that failed to PRODUCE a report would be.
    expect({ name, code: r.code }).toEqual({ name, code: 9 });
    reports[name] = join(dir, `${name}.json`);
    writeFileSync(reports[name] as string, r.stdout);
  }
}, 180_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const all = () => Object.values(TARGETS).map((n) => reports[n] as string);

async function compare(paths: string[] = all()): Promise<{ code: number | null; c: Comparison }> {
  const r = await run(["compare", ...paths, "--json"]);
  expect(r.stderr).toBe("");
  const envelope = JSON.parse(r.stdout);
  expect(envelope.ok).toBe(true);
  return { code: r.code, c: envelope.data as Comparison };
}

/** The row for one exact argv, with no repetition index — the base recording of that probe. */
function probe(c: Comparison, args: string[]): ProbeComparison {
  const key = JSON.stringify(args);
  const found = [...c.divergent, ...c.agreed, ...c.unaligned].find(
    (p) => JSON.stringify(p.args) === key && p.repeat === undefined && p.env === undefined,
  );
  if (!found) throw new Error(`no probe for argv ${key}`);
  return found;
}

/** `{ "exit 2": ["seven", ...] }` — the axis, reduced to what a reader reads off it. */
function groups(p: ProbeComparison, axis: "ending" | "placement"): Record<string, string[]> {
  return Object.fromEntries(
    (p.axes.find((a) => a.axis === axis)?.groups ?? []).map((g) => [g.value, g.targets]),
  );
}

describe("the divergences the eight-CLI report found by hand", () => {
  // §2(a). THE ONE THE CATALOGUE IS STRUCTURALLY INCAPABLE OF NOTICING. Seven CLIs answer an
  // unknown flag with exit 2 and one answers with exit 1; A1, A2 and A3 report `PASS+` on both,
  // because each requires only "non-zero" and says so in its own coverage gap. A comparison over
  // VERDICTS would return `PASS+ ∩ PASS+` and report agreement here.
  test("(a) exit 2 versus exit 1, for the same error class", async () => {
    const { c } = await compare();
    for (const args of [["--acc-probe-xyzzy-flag"], ["acc-probe-xyzzy-verb"]]) {
      const p = probe(c, args);
      expect({ args, divergent: p.divergent }).toEqual({ args, divergent: true });
      expect({ args, ending: groups(p, "ending") }).toEqual({
        args,
        ending: { "exit 2": [TARGETS.seven, TARGETS.mindMapper], "exit 1": [TARGETS.anthill] },
      });
      // ...and they agree about the stream, which is the other half of the finding: the split is
      // about the CODE, not about where the message went.
      expect({ args, placement: groups(p, "placement") }).toEqual({
        args,
        placement: { stderr: [TARGETS.seven, TARGETS.mindMapper, TARGETS.anthill] },
      });
    }
  });

  // §2(b). Three answers to one question inside one toolset.
  test("(b) --help on stdout at 0, versus stderr at exit 2", async () => {
    const { c } = await compare();
    for (const args of [["--help"], ["-h"]]) {
      const p = probe(c, args);
      expect({ args, divergent: p.divergent }).toEqual({ args, divergent: true });
      expect({ args, ending: groups(p, "ending") }).toEqual({
        args,
        ending: { "exit 0": [TARGETS.seven, TARGETS.anthill], "exit 2": [TARGETS.mindMapper] },
      });
      expect({ args, placement: groups(p, "placement") }).toEqual({
        args,
        placement: { stdout: [TARGETS.seven, TARGETS.anthill], stderr: [TARGETS.mindMapper] },
      });
    }
  });

  // §2(c). One of eight.
  test("(c) --version answered by one target and absent from the others", async () => {
    const { c } = await compare();
    const p = probe(c, ["--version"]);
    expect(p.divergent).toBe(true);
    expect(groups(p, "ending")).toEqual({
      "exit 0": [TARGETS.anthill],
      "exit 2": [TARGETS.seven, TARGETS.mindMapper],
    });
    expect(groups(p, "placement")).toEqual({
      stdout: [TARGETS.anthill],
      stderr: [TARGETS.seven, TARGETS.mindMapper],
    });
    // The absence is legible as an absence: the two without the flag wrote nothing to stdout and
    // a rejection to stderr, which is what "it fell through as an unknown verb" looks like.
    const byLabel = Object.fromEntries(p.outcomes.map((o) => [o.label, o]));
    expect(byLabel[TARGETS.seven]?.stdoutBytes).toBe(0);
    expect(byLabel[TARGETS.anthill]?.stdoutBytes).toBeGreaterThan(0);
  });

  // THE TABLE ITSELF. §2 is exit code, stdout bytes and stderr bytes over six argvs, and every
  // one of those cells has to be reachable from the comparison — otherwise the surface reports
  // the shape of the divergence and loses the evidence a reader would quote.
  test("every cell of the report's own table is reachable from one row", async () => {
    const { c } = await compare();
    const p = probe(c, ["--help"]);
    for (const o of p.outcomes) {
      expect({ label: o.label, has: typeof o.exitCode === "number" }).toEqual({
        label: o.label,
        has: true,
      });
      expect(typeof o.stdoutBytes).toBe("number");
      expect(typeof o.stderrBytes).toBe("number");
    }
  });
});

// WHAT THE OBSERVATIONS CANNOT EXPRESS, asserted rather than admitted in a comment.
//
// The report's §2(b) is a THREE-way split: prose help on stdout, a usage line on stderr, and a
// JSON DOCUMENT on stdout. The first and third are indistinguishable here, and the reason is a
// property of the report shape rather than of this command: `ReportedObservation` carries
// `stdoutBytes` and `stdoutDigest` and deliberately not the bytes (see the field's own doc
// comment in kit/types.ts — the digest adjudicates equality and refuses to say what the stream
// was). So "both wrote to stdout and exited 0, with different byte counts" is the whole of what
// a stored report can say, and different byte counts are what any two help screens have.
//
// This is not worked around. Classifying the payload would mean either re-probing the targets —
// which this command exists not to do — or adding a content field to every report, which is a
// change to the report shape and a decision for the owner of the catalogue, not for this surface.
describe("the divergence a stored report cannot carry", () => {
  test("prose help and JSON help are one group, and only the digests differ", async () => {
    const { c } = await compare();
    const p = probe(c, ["--help"]);
    const both = groups(p, "placement").stdout as string[];
    expect(both).toEqual([TARGETS.seven, TARGETS.anthill]);

    const byLabel = Object.fromEntries(p.outcomes.map((o) => [o.label, o]));
    // Byte-different, provably: one is prose and one is `{"ok":true,...}`. The evidence that they
    // differ survives; the evidence of HOW they differ does not.
    expect(byLabel[TARGETS.seven]?.stdoutDigest).not.toBe(byLabel[TARGETS.anthill]?.stdoutDigest);
    // And nothing in the row separates them by kind. If a `contentKind` (or anything like it)
    // is ever added to the report shape, this assertion is where the gap closes.
    const fields = Object.keys(byLabel[TARGETS.seven] as object);
    expect(fields).not.toContain("stdout");
    expect(fields).not.toContain("contentKind");
  });
});

describe("the comparison is a comparison, not a judgement", () => {
  test("exits 0 with divergences present, and publishes no verdict", async () => {
    const { code, c } = await compare();
    expect(code).toBe(0);
    expect(c.counts.divergent).toBeGreaterThan(0);
    const document = JSON.stringify(c);
    for (const forbidden of ['"conformant"', '"fullyVerified"', '"verdict"', '"findings"']) {
      expect(document).not.toContain(forbidden);
    }
  });

  test("the text form says so in words, and names who differs from whom on what", async () => {
    const r = await run(["compare", ...all(), "--format", "text"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("A COMPARISON, NOT A VERDICT");
    // The three axes-and-membership lines for `--version`, as a reader meets them.
    expect(r.stdout).toContain("exit 1");
    expect(r.stdout).toMatch(new RegExp(`exit 2\\s+${TARGETS.seven}, ${TARGETS.mindMapper}`));
    expect(r.stdout).toMatch(new RegExp(`stdout\\s+${TARGETS.anthill}`));
    // The byte counts of the report's table, on the row they belong to.
    expect(r.stdout).toMatch(/bytes\s+\S+ out=\d+ err=\d+/);
  });
});

// THE NEGATIVE CONTROLS. A comparison that marked everything divergent would satisfy every
// assertion above and mean nothing.
describe("what does NOT count as a divergence", () => {
  test("a report compared with itself diverges nowhere", async () => {
    const one = reports[TARGETS.seven] as string;
    // Copied to a second NAME so the two columns are labelled differently and the alignment has
    // to do real work — passing one path twice would make the labels collide.
    const copy = join(dir, "copy.json");
    copyFileSync(one, copy);
    const { c } = await compare([one, copy]);
    expect(c.counts.divergent).toBe(0);
    expect(c.counts.agreed).toBe(c.counts.aligned);
    expect(c.counts.aligned).toBeGreaterThan(5);
  });

  test("two targets that disagree on some probes still AGREE on others", async () => {
    const { c } = await compare([
      reports[TARGETS.seven] as string,
      reports[TARGETS.anthill] as string,
    ]);
    // Both reject an unknown flag on stderr, and both write help to stdout at 0 — the agreement
    // that makes the exit-code split worth reporting rather than one difference among many.
    expect(c.counts.divergent).toBeGreaterThan(0);
    expect(c.counts.agreed).toBeGreaterThan(0);
  });
});

// End to end: the capture is written by `acc check --json` and read back by `acc compare`. The
// unit tests cover what it recognises; this covers that it survives the artifact.
describe("self-declared flags across the population", () => {
  test("every target gets a row, and none of these three enumerates", async () => {
    const { c } = await compare();
    expect(c.surfaces.map((s) => s.label).sort()).toEqual(Object.values(TARGETS).sort());
    for (const row of c.surfaces) {
      // These fixtures answer an unknown flag without naming what they accept — which is the
      // ordinary case for a CLI, and the reason `not-enumerated` had to be a status rather than an
      // empty array. `flags` is absent, not empty.
      expect(row.status).toBe("not-enumerated");
      expect(row.flags).toBeUndefined();
      expect(row.probesRead).toBeGreaterThan(0);
    }
  }, 60_000);

  test("the text form says the target did not enumerate, not that it has no flags", async () => {
    const r = await run(["compare", ...all(), "--format", "text"]);
    expect(r.stdout).toContain("SELF-DECLARED FLAGS");
    expect(r.stdout).toContain("did not enumerate");
    expect(r.stdout).toContain("NOT a tool with no flags");
  }, 60_000);
});

// `rowSurface` (this command) rebuilds a `Surface` from `surfaceRow`'s compact `SurfaceRow` so
// `acc check` and `acc compare` render the flag-surface capture through ONE function,
// `surfaceSummary`. A row that dropped a state-specific field the sentence reads would make that
// round trip lossy — two different sentences for one status, which `surface.ts`'s own comment
// forbids. This exercises the round trip directly rather than through a fixture: the point is
// that `surfaceRow → SurfaceRow → rowSurface → surfaceSummary` renders IDENTICALLY to
// `surfaceSummary` on the original `Surface`, for every status this capture can produce.
describe("the compare row renders the same sentence as `acc check`", () => {
  const roundTrip = (surface: Surface): string =>
    surfaceSummary(rowSurface(surfaceRow("t", surface)));

  test("`enumerated` — flags and consistency survive the round trip", () => {
    const s: Surface = {
      status: "enumerated",
      flags: ["--format", "--help"],
      consistent: true,
      evidence: [],
      probesRead: 2,
    };
    expect(roundTrip(s)).toBe(surfaceSummary(s));
  });

  test("`not-enumerated` — including its near-miss clause", () => {
    const s: Surface = {
      status: "not-enumerated",
      evidence: [],
      probesRead: 3,
      nonFlagCandidates: [{ key: "choices", sample: ["rules", "show"], count: 2 }],
    };
    const rendered = roundTrip(s);
    expect(rendered).toBe(surfaceSummary(s));
    expect(rendered).toContain("choices");
  });

  // THE SHAPE THE BRIEF NAMED: a target answering both a verb-shaped `choices` list and an empty
  // `validFlags` — `enumerated-none`, carrying both `emptySetKeys` and `nonFlagCandidates`. Before
  // this fix, `rowSurface` hardcoded these fields away and the compare-path sentence silently
  // dropped the near-miss clause the check-path sentence still carried.
  test("`enumerated-none` — including the near-miss clause that named this task", () => {
    const s: Surface = {
      status: "enumerated-none",
      evidence: [],
      probesRead: 1,
      emptySetKeys: ["validFlags"],
      nonFlagCandidates: [{ key: "choices", sample: ["run", "build"], count: 2 }],
    };
    const rendered = roundTrip(s);
    expect(rendered).toBe(surfaceSummary(s));
    expect(rendered).toContain("stated an empty set of flags");
    expect(rendered).toContain("choices");
    expect(rendered).toContain("not flag-shaped");
  });

  test("`no-evidence` and `not-recorded`", () => {
    const s: Surface = { status: "no-evidence", evidence: [], probesRead: 0 };
    expect(roundTrip(s)).toBe(surfaceSummary(s));
    const row: SurfaceRow = { label: "t", status: "not-recorded", probesRead: 0 };
    expect(surfaceSummary(rowSurface(row))).toBe(surfaceSummary(undefined));
  });
});

describe("bad input", () => {
  test("one report is a usage error, not an empty comparison", async () => {
    const r = await run(["compare", reports[TARGETS.seven] as string, "--json"]);
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
    expect(JSON.parse(r.stderr).error.kind).toBe("usage");
  });

  test("a missing report is not_found, and names the file", async () => {
    const missing = join(dir, "nope.json");
    const r = await run(["compare", reports[TARGETS.seven] as string, missing, "--json"]);
    expect(r.code).toBe(5);
    const envelope = JSON.parse(r.stderr);
    expect(envelope.error.kind).toBe("not_found");
    expect(envelope.error.details.path).toBe(missing);
  });

  test("a JSON file that is not a report is a usage error", async () => {
    const notAReport = join(dir, "not-a-report.json");
    writeFileSync(notAReport, JSON.stringify({ ok: true, data: { hello: "world" } }));
    const r = await run(["compare", reports[TARGETS.seven] as string, notAReport, "--json"]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.stderr).error.message).toContain("not an acc check report");
  });

  test("a bare report payload (jq '.data') is accepted as well as the envelope", async () => {
    const bare = join(dir, "bare.json");
    const enveloped = JSON.parse(readFileSync(reports[TARGETS.seven] as string, "utf8"));
    writeFileSync(bare, JSON.stringify(enveloped.data));
    const { c } = await compare([reports[TARGETS.anthill] as string, bare]);
    expect(c.counts.aligned).toBeGreaterThan(5);
  });
});

// THE NOTE — the sentence this feature was added to say, and the one rendered surface that had no
// test. It is a four-clause guard inlined into the renderer: any clause could invert and every
// assertion above would still pass. So it is exercised BOTH ways here, because a guard nobody has
// seen stay silent is a guard that could be printing on everything.
describe("the NOTE about targets that call themselves the same thing", () => {
  /**
   * A real report, copied with its identity quote rewritten.
   *
   * Only `status` and `said` move: the observations, and therefore every divergence the
   * comparison finds, are the ones `acc check` actually recorded. Rewriting the quote is the only
   * way to reach the case — the fixtures in this population do not share a `--version` answer,
   * and inventing the observations instead would test the renderer against a comparison no run
   * produces.
   */
  const quoting = (name: string, said: string, as: string): string => {
    const path = join(dir, `identity-${as}.json`);
    const envelope = JSON.parse(readFileSync(reports[name] as string, "utf8"));
    envelope.data.targetIdentity = { ...envelope.data.targetIdentity, status: "stated", said };
    writeFileSync(path, JSON.stringify(envelope));
    return path;
  };

  const text = (paths: string[]) => run(["compare", ...paths, "--format", "text"]);

  test("it FIRES when every target quotes the same bytes and probes diverged", async () => {
    const r = await text([
      quoting(TARGETS.seven, "tool 2.3.0", "same-a"),
      quoting(TARGETS.anthill, "tool 2.3.0", "same-b"),
    ]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("NOTE: every target here said the same thing about itself");
    expect(r.stdout).toContain("Identical bytes under --version are not evidence of one binary");
    // The quote is on screen too, under each path — the NOTE without it is an assertion the
    // reader cannot check.
    expect(r.stdout).toContain('the target answered with "tool 2.3.0"');
  }, 60_000);

  test("it stays SILENT when the quotes differ, divergences and all", async () => {
    const r = await text([
      quoting(TARGETS.seven, "tool 2.3.0", "diff-a"),
      quoting(TARGETS.anthill, "tool 2.4.0", "diff-b"),
    ]);
    expect(r.stdout).not.toContain("NOTE:");
    // The negative control on the negative control: these two really do diverge, so silence here
    // is the guard's `said.size === 1` clause and not an empty comparison.
    const { c } = await compare([
      reports[TARGETS.seven] as string,
      reports[TARGETS.anthill] as string,
    ]);
    expect(c.counts.divergent).toBeGreaterThan(0);
  }, 60_000);

  test("it stays SILENT when a target said nothing, which is not agreement", async () => {
    // Undoctored, and the ordinary case: `exits-2-no-version` writes nothing to stdout under
    // `--version`, so its identity is `not-stated`. One quote and one absence is not two targets
    // saying the same thing, and the NOTE must not read the absence as a match.
    const r = await text([reports[TARGETS.seven] as string, reports[TARGETS.anthill] as string]);
    expect(r.stdout).toContain("wrote nothing to stdout");
    expect(r.stdout).not.toContain("NOTE:");
  }, 60_000);

  test("it stays SILENT when identical targets agree everywhere", async () => {
    // Same bytes, and nothing to warn about: the NOTE is about a CONTRADICTION between what two
    // targets call themselves and how they behave, so with no divergence there is no reading to
    // pre-empt and printing it would be noise on every fleet of clones.
    const r = await text([
      quoting(TARGETS.seven, "tool 2.3.0", "clone-a"),
      quoting(TARGETS.seven, "tool 2.3.0", "clone-b"),
    ]);
    expect(r.stdout).toContain('the target answered with "tool 2.3.0"');
    expect(r.stdout).not.toContain("NOTE:");
  }, 60_000);

  // §5's repair, and the reason the premise needed one: `truncated` says the quote is a PREFIX
  // and `lossy` says (in the field's own words) that equality of these strings is not equality of
  // bytes. Either way two equal renderings are consistent with two different answers, so the
  // sentence "they said the same thing" is not established and is withheld.
  test.each([["truncated"], ["lossy"]])(
    "it stays SILENT on a %s quote",
    async (flag) => {
      const doctor = (name: string, as: string): string => {
        const path = join(dir, `identity-${as}.json`);
        const envelope = JSON.parse(readFileSync(reports[name] as string, "utf8"));
        envelope.data.targetIdentity = {
          ...envelope.data.targetIdentity,
          status: "stated",
          said: "tool 2.3.0",
          [flag]: true,
        };
        writeFileSync(path, JSON.stringify(envelope));
        return path;
      };
      const r = await text([
        doctor(TARGETS.seven, `${flag}-a`),
        doctor(TARGETS.anthill, `${flag}-b`),
      ]);
      expect(r.stdout).toContain('the target answered with "tool 2.3.0"');
      expect(r.stdout).not.toContain("NOTE:");
    },
    60_000,
  );
});

// THE SAME UNVALIDATED FIELD, AT THE SECOND COMMAND THAT READS IT. `acc compare` renders every
// input report's surface through `surfaceSummary` (see `rowSurface`), so the guard that keeps a
// status this build cannot read from printing as a bare enum token has to hold here too — and
// this is the entry point the sweep measured it at.
describe("a stored report whose surface status this build has never heard of", () => {
  test("the SELF-DECLARED FLAGS row renders a sentence, not the raw token", async () => {
    const future = join(dir, "future-status.json");
    const envelope = JSON.parse(readFileSync(reports[TARGETS.seven] as string, "utf8"));
    envelope.data.surface = { status: "enumerated-partial", evidence: [], probesRead: 7 };
    writeFileSync(future, JSON.stringify(envelope));

    const r = await run([
      "compare",
      future,
      reports[TARGETS.anthill] as string,
      "--format",
      "text",
    ]);
    expect(r.code).toBe(0);
    const line = r.stdout
      .split("\n")
      .find((l) => l.includes("future-status") && l.includes("enumerated-partial"));
    expect(line).toBeDefined();
    expect(line).toContain("not recorded by this kit");
    expect(line).toContain("not a statement about the tool");
  }, 60_000);
});

// A MALFORMED STORED INPUT IS THE CALLER'S TO FIX, NOT A KIT FAULT. `assertFlagsOnlyOnEnumerated`
// is right that a non-`enumerated` surface carrying `flags` must not pass silently — `flags` is
// absent-never-empty by its own contract, and this boundary is where a violation would otherwise
// reach a published artifact. What it got wrong is whose fault it named: the surface came out of a
// report FILE, so `internal` (exit 1, "acc broke") blames the kit for a document the caller can
// edit. `loadReport` classifies every other malformed-artifact case as `usage`, with a kebab-case
// `details.reason` a wrapper branches on, and this is one of those.
describe("a stored report carrying `flags` on a non-enumerated surface", () => {
  test("is refused as usage, with a reason a wrapper can branch on", async () => {
    const bad = join(dir, "flags-on-not-enumerated.json");
    const envelope = JSON.parse(readFileSync(reports[TARGETS.seven] as string, "utf8"));
    envelope.data.surface = {
      status: "not-enumerated",
      evidence: [],
      probesRead: 7,
      flags: ["--format"],
    };
    writeFileSync(bad, JSON.stringify(envelope));

    const r = await run(["compare", bad, reports[TARGETS.anthill] as string, "--json"]);
    // 2 is `ExitCode.Usage`. NOT 1 (`internal`): nothing in the kit malfunctioned.
    expect(r.code).toBe(2);
    const error = (JSON.parse(r.stderr) as { error: Record<string, unknown> }).error;
    expect(error.kind).toBe("usage");
    expect(error.exit_code).toBe(2);
    expect((error.details as { reason?: string }).reason).toBe("flags-on-non-enumerated-surface");
    // The path, because the caller passed several files and has to know which one to open.
    expect((error.details as { path?: string }).path).toBe(bad);
    expect(String(error.message)).toContain("flags must stay absent, not empty");
  }, 60_000);
});
