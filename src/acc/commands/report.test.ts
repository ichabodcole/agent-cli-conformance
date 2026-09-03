import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sweepId } from "../kit/report.ts";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "cli.ts");
const CONFORMING = join(dirname(CLI), "kit/fixtures/conforming.ts");
const BROKEN = join(dirname(CLI), "kit/fixtures/broken/exits-zero-on-unknown-flag.ts");

function run(args: string[]): { code: number; stdout: string; stderr: string } {
  const r = Bun.spawnSync(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
  return {
    code: r.exitCode,
    stdout: new TextDecoder().decode(r.stdout),
    stderr: new TextDecoder().decode(r.stderr),
  };
}

/** One check of the broken fixture, parsed. Cached: the sweep is the artifact under test. */
let brokenEnvelope: { data: Record<string, unknown> } | null = null;
function brokenReport(): { data: Record<string, unknown> } {
  if (!brokenEnvelope) {
    const r = run(["check", BROKEN, "--json"]);
    expect(r.code).toBe(9);
    brokenEnvelope = JSON.parse(r.stdout);
  }
  return brokenEnvelope as { data: Record<string, unknown> };
}

describe("acc report — a rendering of a stored sweep", () => {
  test("the exit code mirrors the stored verdict, both ways", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const ok = run(["check", CONFORMING, "--json"]);
    expect(ok.code).toBe(0);
    writeFileSync(join(dir, "ok.json"), ok.stdout);
    writeFileSync(join(dir, "bad.json"), JSON.stringify(brokenReport()));

    expect(run(["report", join(dir, "ok.json"), "--format", "text"]).code).toBe(0);
    expect(run(["report", join(dir, "bad.json"), "--format", "text"]).code).toBe(9);
    rmSync(dir, { recursive: true, force: true });
  });

  test("the rendering declares itself and carries the artifact's own sweep mark", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const file = join(dir, "r.json");
    writeFileSync(file, JSON.stringify(brokenReport()));
    const data = brokenReport().data as { sweep: string; capturedAt: string };
    expect(typeof data.sweep).toBe("string");

    const rendered = run(["report", file, "--format", "text"]);
    expect(rendered.stdout).toContain("RENDERED FROM A STORED REPORT");
    expect(rendered.stdout).toContain(`captured ${data.capturedAt}`);
    // The pairing check a reader actually performs: one sweep id on both documents.
    expect(rendered.stdout).toContain(`sweep ${data.sweep}`);
    rmSync(dir, { recursive: true, force: true });
  });

  test("an artifact from an older kit names each absence; nothing renders as absent", () => {
    // Synthesised pre-field shape: what every adopter JSON in existence looks like — no
    // capturedAt, no sweep, no probes on findings, no surface, no identity. The control that
    // motivated the guards crashed on `r.surface.evidence` before they existed.
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const old = structuredClone(brokenReport()) as {
      data: Record<string, unknown> & { findings: Record<string, unknown>[] };
    };
    delete old.data.capturedAt;
    delete old.data.sweep;
    delete old.data.targetIdentity;
    delete old.data.surface;
    for (const f of old.data.findings) delete f.probes;
    old.data.kitVersion = "0.1.3";
    const file = join(dir, "old.json");
    writeFileSync(file, JSON.stringify(old));

    const r = run(["report", file, "--format", "text"]);
    expect(r.code).toBe(9); // the stored verdict still mirrors
    expect(r.stdout).toContain("written by acc 0.1.3, before reports carried a time");
    expect(r.stdout).toContain("this artifact predates the surface census (written by acc 0.1.3)");
    expect(r.stdout).toContain("this artifact predates sweep and capture marks");
    expect(r.stdout).toContain("this artifact carries no identity capture");
    rmSync(dir, { recursive: true, force: true });
  });

  test("a file with observations but no verdict is refused with the kit version named", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const file = join(dir, "half.json");
    writeFileSync(file, JSON.stringify({ target: "/t", observations: [], kitVersion: "0.1.2" }));
    const r = run(["report", file, "--format", "text"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("not a verdict this command can render");
    rmSync(dir, { recursive: true, force: true });
  });

  test("a missing file is not_found, same as everywhere else", () => {
    expect(run(["report", "/no/such/report.json", "--format", "text"]).code).toBe(5);
  });

  test("machine mode re-emits the stored data under this command's envelope", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const file = join(dir, "r.json");
    writeFileSync(file, JSON.stringify(brokenReport()));
    const r = run(["report", file, "--json"]);
    expect(r.code).toBe(9);
    const envelope = JSON.parse(r.stdout);
    expect(envelope.ok).toBe(true);
    expect(envelope.meta.command).toBe("report");
    expect(envelope.data.sweep).toBe((brokenReport().data as { sweep: string }).sweep);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("sweepId — deterministic over evidence, blind to the clock", () => {
  const obs = (id: string, out: string, code = 0) =>
    ({
      id,
      exitCode: code,
      signal: null,
      stdoutDigest: out,
      stderrDigest: "e",
    }) as Parameters<typeof sweepId>[0][number];

  test("same evidence, same id — durations and timestamps play no part", () => {
    expect(sweepId([obs("a", "d1"), obs("b", "d2")])).toBe(
      sweepId([obs("a", "d1"), obs("b", "d2")]),
    );
  });

  test("a single differing stream digest moves the id — the nondeterministic-target case", () => {
    expect(sweepId([obs("a", "d1")])).not.toBe(sweepId([obs("a", "OTHER")]));
  });

  test("a differing exit code moves the id even with identical bytes", () => {
    expect(sweepId([obs("a", "d1", 0)])).not.toBe(sweepId([obs("a", "d1", 2)]));
  });
});

describe("the three refusals branch in the envelope, not only in prose", () => {
  // A CI wrapper distinguishing "fix the artifact" from "run acc check first" branches on
  // `.error.details.reason` — `details` is the branching surface by its own contract
  // ("structured detail for branching, never prose"), and the exit taxonomy stays closed.
  function refusal(file: string): { code: number; reason: unknown } {
    const r = run(["report", file, "--json"]);
    const envelope = JSON.parse(r.stderr) as { error?: { details?: { reason?: unknown } } };
    return { code: r.code, reason: envelope.error?.details?.reason };
  }

  test('a file that is not JSON carries reason "not-json"', () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const file = join(dir, "garbage.json");
    writeFileSync(file, "{ not json");
    const r = refusal(file);
    expect(r.code).toBe(2);
    expect(r.reason).toBe("not-json");
    rmSync(dir, { recursive: true, force: true });
  });

  test('JSON that is not a report carries reason "not-a-report"', () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const file = join(dir, "other.json");
    writeFileSync(file, JSON.stringify({ some: "thing" }));
    const r = refusal(file);
    expect(r.code).toBe(2);
    expect(r.reason).toBe("not-a-report");
    rmSync(dir, { recursive: true, force: true });
  });

  test('a verdict-less report carries reason "no-verdict" — the refusal whose next step is a different command', () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-"));
    const file = join(dir, "half.json");
    writeFileSync(file, JSON.stringify({ target: "/t", observations: [], kitVersion: "0.1.2" }));
    const r = refusal(file);
    expect(r.code).toBe(2);
    expect(r.reason).toBe("no-verdict");
    rmSync(dir, { recursive: true, force: true });
  });
});

// A REPORT WRITTEN BY A NEWER KIT, which `how-to-read-the-check-report-json.md` names as a live
// case: `acc report` and `acc compare` accept any report file, and `surface.status` arrives from
// `JSON.parse` with nothing on the path validating it against this build's `SurfaceStatus`. The
// compile-time exhaustiveness in `surfaceSummary` and the `Record<SurfaceStatus, string>` keying
// of `VERDICT_WORD` are both claims about the TYPE; neither is a claim about a file on disk.
//
// The rule this kit holds for a field an older artifact lacks — render it as "not recorded by
// that kit", never as an absent or garbled thing — is the same rule here, reached from the other
// direction: a status this build cannot read is not a status it may print raw or drop.
describe("a status from a kit this build has never heard of", () => {
  const doctored = (mutate: (data: Record<string, unknown>) => void): string => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-future-"));
    const envelope = structuredClone(brokenReport());
    mutate(envelope.data);
    const file = join(dir, "future.json");
    writeFileSync(file, JSON.stringify(envelope));
    return file;
  };

  test("the surface sentence names the unreadable status; it never prints the bare token alone", () => {
    const file = doctored((data) => {
      data.surface = { status: "enumerated-partial", evidence: [], probesRead: 7 };
    });
    const r = run(["report", file, "--format", "text"]);
    expect(r.code).toBe(9);
    const line = r.stdout
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.includes("enumerated-partial"));
    // Present at all — a status the reader cannot interpret must still reach the reader.
    expect(line).toBeDefined();
    // ...and not AS the sentence. `enumerated-partial` alone is what the `never` fallthrough
    // returned: an enum token with no scope, no qualifier and no statement of the limit.
    expect(line).not.toBe("enumerated-partial");
    expect(line).toContain("not recorded by this kit");
    // The same qualifier every other surface sentence carries: this is a limit of the reader.
    expect(line).toContain("not a statement about the tool");
    rmSync(dirname(file), { recursive: true, force: true });
  });

  test("the census rollup prints a word for it, never `undefined`", () => {
    // FOLD_AT is 4, so five readings at one status is the shape that reaches `VERDICT_WORD`.
    const file = doctored((data) => {
      data.recordedSurfaces = {
        source: "/tmp/batch.json",
        records: 5,
        readings: Array.from({ length: 5 }, (_, i) => ({
          path: [`p${i}`],
          status: "enumerated-partial",
          nonFlagKeys: [],
          summary: `something at p${i}`,
        })),
        recordedBy: ["a-newer-kit"],
        identity: null,
      };
    });
    const r = run(["report", file, "--format", "text"]);
    const line = r.stdout
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("5 paths:"));
    expect(line).toBeDefined();
    expect(line).not.toContain("undefined");
    expect(line).toContain("not recorded by this kit");
    expect(line).toContain("enumerated-partial");
    rmSync(dirname(file), { recursive: true, force: true });
  });
});

// THE SECOND PUBLISHING BOUNDARY. `acc compare` refuses a stored surface carrying `flags` on a
// non-`enumerated` status, because `flags` is absent-never-empty by its own contract and a
// violation reaching a rendered comparison would pass silently. `acc report` republishes the same
// artifact — `--json` re-emits the stored payload verbatim, which is the most literal way a
// malformed surface reaches a published document — and it did so at exit 0. Same input, same
// fault, same classification: `usage`, not `internal`, because the surface came out of a report
// FILE the caller named and can edit.
describe("acc report — a stored report carrying `flags` on a non-enumerated surface", () => {
  test("is refused as usage, with the same reason `acc compare` gives", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-malformed-"));
    const file = join(dir, "flags-on-not-enumerated.json");
    const envelope = structuredClone(brokenReport());
    envelope.data.surface = {
      status: "not-enumerated",
      evidence: [],
      probesRead: 7,
      flags: ["--format"],
    };
    writeFileSync(file, JSON.stringify(envelope));

    const r = run(["report", file, "--json"]);
    // 2 is `ExitCode.Usage`. NOT 1 (`internal`), and not 9 — the stored verdict is never reached.
    expect(r.code).toBe(2);
    const error = (JSON.parse(r.stderr) as { error: Record<string, unknown> }).error;
    expect(error.kind).toBe("usage");
    expect(error.exit_code).toBe(2);
    expect((error.details as { reason?: string }).reason).toBe("flags-on-non-enumerated-surface");
    expect((error.details as { path?: string }).path).toBe(file);
    expect(String(error.message)).toContain("flags must stay absent, not empty");
    // The malformed payload must not have been re-emitted on the way to the refusal.
    expect(r.stdout).not.toContain("--format");
    rmSync(dir, { recursive: true, force: true });
  });

  test("the text rendering refuses it too — the surface line is never printed", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-malformed-"));
    const file = join(dir, "flags-on-not-enumerated.json");
    const envelope = structuredClone(brokenReport());
    envelope.data.surface = {
      status: "not-enumerated",
      evidence: [],
      probesRead: 7,
      flags: ["--format"],
    };
    writeFileSync(file, JSON.stringify(envelope));

    const r = run(["report", file, "--format", "text"]);
    expect(r.code).toBe(2);
    expect(r.stdout).not.toContain("did not enumerate at the root");
    expect(r.stderr).toContain("flags must stay absent, not empty");
    rmSync(dir, { recursive: true, force: true });
  });
});

// THE OTHER HALF OF THE SAME CONTRACT. `SurfaceStatus` says of `enumerated`: "`flags` is present."
// The guard held one direction only, so a stored report claiming `enumerated` with no `flags`
// rendered `enumerated 0 flags at the root: ` at exit 0 — the kit publishing "this tool accepts no
// flags", which is the exact claim `enumerated-none` exists to keep apart from `enumerated`, and
// the one inference this capture may never make. Unreachable from a live check; reachable from the
// stored and foreign reports this boundary was added for, which is the population it guards.
describe("acc report — a stored report claiming `enumerated` with no `flags`", () => {
  test("is refused as usage, with a reason of its own", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-malformed-"));
    const file = join(dir, "enumerated-without-flags.json");
    const envelope = structuredClone(brokenReport());
    envelope.data.surface = { status: "enumerated", evidence: [], probesRead: 7 };
    writeFileSync(file, JSON.stringify(envelope));

    const r = run(["report", file, "--json"]);
    // 2 is `ExitCode.Usage` — the artifact is the caller's, exactly as in the other direction.
    expect(r.code).toBe(2);
    const error = (JSON.parse(r.stderr) as { error: Record<string, unknown> }).error;
    expect(error.kind).toBe("usage");
    expect(error.exit_code).toBe(2);
    // A DIFFERENT reason from the other direction: a wrapper branching on it is told which half
    // of the contract broke, and they are different edits to the file.
    expect((error.details as { reason?: string }).reason).toBe("enumerated-surface-without-flags");
    expect((error.details as { path?: string }).path).toBe(file);
    rmSync(dir, { recursive: true, force: true });
  });

  test("the text rendering refuses it too — `enumerated 0 flags` is never printed", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-report-malformed-"));
    const file = join(dir, "enumerated-without-flags.json");
    const envelope = structuredClone(brokenReport());
    envelope.data.surface = { status: "enumerated", evidence: [], probesRead: 7 };
    writeFileSync(file, JSON.stringify(envelope));

    const r = run(["report", file, "--format", "text"]);
    expect(r.code).toBe(2);
    expect(r.stdout).not.toContain("enumerated 0 flags at the root");
    rmSync(dir, { recursive: true, force: true });
  });
});
