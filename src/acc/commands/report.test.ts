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
