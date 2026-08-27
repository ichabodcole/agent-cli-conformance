// The target-identity capture: what the tool said about itself under `--version`, quoted.
//
// The cases that matter here are the ones where a quotation could be mistaken for a verdict — a
// help screen at exit 0, a tool with no `--version` at all, a capture the kit cut at its ceiling —
// because the whole fence this feature rests on is that a quote establishes only that a binary
// answering this way existed. The fixture run at the bottom is what says the path works against a
// real process rather than against hand-written strings.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { captureIdentity, identitySummaryLines } from "./identity.ts";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import { digestOfText } from "./runner.ts";
import type { Observation } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(HERE, "fixtures", name);

/** One recorded `--version` run. Defaults are the ordinary case: a version line, exit 0. */
function versionRun(stdout: string, over: Partial<Observation> = {}): Observation {
  const args = over.invocation?.args ?? ["--version"];
  return {
    id: over.id ?? "id-version",
    invocation: over.invocation ?? { args, inertness: "help-path", purpose: "D1: --version" },
    purposes: ["D1: --version"],
    stdout,
    stderr: over.stderr ?? "",
    stdoutBytes: stdout.length,
    stderrBytes: (over.stderr ?? "").length,
    stdoutDigest: digestOfText(stdout),
    stderrDigest: digestOfText(over.stderr ?? ""),
    stdoutLossy: over.stdoutLossy ?? false,
    stderrLossy: false,
    truncated: over.truncated ?? false,
    exitCode: over.exitCode === undefined ? 0 : over.exitCode,
    signal: over.signal ?? null,
    crashed: over.crashed ?? false,
    timedOut: over.timedOut ?? false,
    spawnFailed: over.spawnFailed ?? false,
    durationMs: 5,
    timeToFirstByteMs: 1,
  };
}

describe("what the capture reads", () => {
  test("the ordinary case: the tool's own bytes, quoted whole", () => {
    const i = captureIdentity([versionRun("acc 0.4.1\n")]);
    expect(i.status).toBe("stated");
    expect(i.said).toBe("acc 0.4.1");
    expect(i.exitCode).toBe(0);
    expect(i.observationId).toBe("id-version");
  });

  test("a NON-ZERO exit that still said something is stated, and carries its exit code", () => {
    // The shape, not any tool's: something on stdout, a non-zero exit, and nothing that looks
    // like a version. The quote is the point; judging it is D1's job and D1 is not consulted
    // here. The string is borrowed from anthill's rejection of an UNKNOWN FLAG (`--nope`, report
    // DT-10) purely for its shape — measured 2026-08-26, both anthill builds answer `--version`
    // itself at exit 0 with a version envelope, so nothing here is a claim about anthill.
    const i = captureIdentity([versionRun("No command specified.\n", { exitCode: 1 })]);
    expect(i.status).toBe("stated");
    expect(i.said).toBe("No command specified.");
    expect(i.exitCode).toBe(1);
  });

  test("nothing on stdout is an ABSENCE, not a missing field, and stderr is not substituted", () => {
    const i = captureIdentity([
      versionRun("", { exitCode: 2, stderr: "unknown flag: --version\n" }),
    ]);
    expect(i.status).toBe("not-stated");
    expect(i.said).toBeUndefined();
    expect(i.exitCode).toBe(2);
    // The observation is still named: something WAS looked at, which is what separates this from
    // `no-evidence`.
    expect(i.observationId).toBe("id-version");
  });

  test("no probe recorded at all is a statement about the RUN", () => {
    expect(captureIdentity([]).status).toBe("no-evidence");
    expect(captureIdentity([]).said).toBeUndefined();
  });

  test("a hang, a crash and a spawn failure each leave no account of the tool", () => {
    for (const over of [{ timedOut: true }, { crashed: true }, { spawnFailed: true }]) {
      const i = captureIdentity([versionRun("partial", { exitCode: null, ...over })]);
      expect(i.status).toBe("no-evidence");
    }
  });

  test("THE HOSTILE-ENV TWIN IS NOT QUOTED", () => {
    // D1 records `["--version"]` twice, and the second run has a deliberately broken HOME. Quoting
    // it as the tool's ordinary account of itself would attribute bytes produced under a
    // sabotaged environment to the tool.
    const hostile = versionRun("nothing here", {
      id: "id-hostile",
      invocation: {
        args: ["--version"],
        env: { HOME: "/nonexistent-acc-probe" },
        inertness: "help-path",
        purpose: "D1: --version with no usable HOME",
      },
    });
    expect(captureIdentity([hostile]).status).toBe("no-evidence");
    expect(captureIdentity([hostile, versionRun("acc 1.0.0")]).said).toBe("acc 1.0.0");
  });
});

describe("truncation", () => {
  test("a cut quote SURVIVES, flagged — a quote is bytes, not a set", () => {
    const i = captureIdentity([versionRun("acc 0.4.1 and then a floo", { truncated: true })]);
    expect(i.status).toBe("stated");
    expect(i.truncated).toBe(true);
    expect(identitySummaryLines(i).join("\n")).toContain("output ceiling");
  });

  test("a cut capture with nothing yet on stdout cannot establish an ABSENCE", () => {
    // The one place truncation changes the status rather than annotating it: a prefix can prove
    // what it contains and can never prove what is missing.
    const i = captureIdentity([versionRun("", { truncated: true, exitCode: null })]);
    expect(i.status).toBe("no-evidence");
  });

  test("a lossy decode is declared beside the quote", () => {
    const i = captureIdentity([versionRun("acc �", { stdoutLossy: true })]);
    expect(i.lossy).toBe(true);
    expect(identitySummaryLines(i).join("\n")).toContain("losslessly");
  });
});

describe("the rendered lines", () => {
  test("every stated line says the quote is not a verified version", () => {
    const lines = identitySummaryLines(captureIdentity([versionRun("acc 0.4.1")]));
    expect(lines[0]).toBe(
      `identity: the kit ran ["--version"] and the target answered with "acc 0.4.1" (exit 0)`,
    );
    expect(lines[1]).toContain("not verified to be a version");
  });

  test("an absent identity is not rendered as a D1 verdict", () => {
    const lines = identitySummaryLines(captureIdentity([versionRun("", { exitCode: 2 })]));
    expect(lines.join("\n")).toContain("an absence, not a verdict");
    expect(lines.join("\n")).toContain("stderr is not substituted");
  });

  test("a multi-line answer is clipped in the LINE and whole in the data", () => {
    // A `--version` that prints a help screen exits 0 with a stream on stdout, so it is `stated`,
    // and rendering the whole thing would displace the report it is a footnote in.
    const i = captureIdentity([versionRun("usage: tool\n  -h  help\n  -v  version\n")]);
    expect(i.said).toBe("usage: tool\n  -h  help\n  -v  version");
    const line = identitySummaryLines(i)[0] as string;
    expect(line).toContain(`"usage: tool"`);
    expect(line).toContain("+2 more lines");
  });

  // THE OTHER AXIS. The line clip bounds how many LINES are rendered and says nothing about how
  // long one line may be, and the only thing above a single line is the runner's stream ceiling
  // (MAX_STREAM_BYTES, 4 MiB). A machine-mode-default CLI answering `--version` with one line of
  // JSON is the ordinary shape, so this is not an exotic input.
  test("a single unbounded line is capped in the LINE and kept whole in the record", () => {
    // Measured before the byte cap existed: this quote rendered as 94% of the text report.
    const flood = `{"version":"${"9".repeat(200_000)}"}`;
    const i = captureIdentity([versionRun(flood)]);
    // The record costs nothing the field claims — every byte the target wrote is still here.
    expect(i.said).toBe(flood);
    const line = identitySummaryLines(i)[0] as string;
    expect(line.length).toBeLessThan(400);
    expect(line).toContain("more bytes on this line");
  });

  test("an ordinary answer is not clipped, and says nothing about bytes it did not cut", () => {
    // anthill's real `--version` answer, at 152 bytes on one line — the shape the cap must leave
    // alone, which is why the cap is not D1's 40.
    const answer =
      '{"ok":true,"data":{"version":"2.3.0","source":"/x/anthill/cli.ts"},"meta":{"command":"version"}}';
    const line = identitySummaryLines(captureIdentity([versionRun(answer)]))[0] as string;
    expect(line).toContain(JSON.stringify(answer));
    expect(line).not.toContain("more bytes");
  });

  test("the byte cut lands on a code-point boundary, so the head is a real prefix", () => {
    // A cut inside a surrogate pair would put a character the RENDERER invented into a quote
    // whose entire value is that the target wrote it.
    const wide = "é".repeat(500);
    const line = identitySummaryLines(captureIdentity([versionRun(wide)]))[0] as string;
    const quoted = /answered with ("(?:[^"\\]|\\.)*")/.exec(line)?.[1] as string;
    expect(wide.startsWith(JSON.parse(quoted))).toBe(true);
    expect(line).not.toContain("�");
  });

  test("no evidence reads as a statement about the run, not about the tool", () => {
    expect(identitySummaryLines(captureIdentity([])).join("\n")).toContain(
      "not a statement about the tool",
    );
  });
});

// The whole path, against a program. A capture that has only ever met hand-written observations is
// a capture nobody has run.
test("against a real target, the identity is read from the probe D1 already sends", async () => {
  const h = await record(
    {
      path: fixture("conforming.ts"),
      argv0: ["bun", fixture("conforming.ts")],
    },
    CHECKERS,
  );
  const i = captureIdentity(h.observations);
  expect(i.status).toBe("stated");
  expect(i.said).not.toBe("");
  // No probe was added for it: the observation it reads is one D1 declared.
  expect(h.observations.find((o) => o.id === i.observationId)?.purposes.join(" ")).toContain("D1");
}, 60_000);

// THE RENDERED SECTION IN `acc check`, which is where a reader actually meets this. Everything
// above tests the model behind it; until these existed the `TARGET IDENTITY` block could have
// vanished, inverted, or rendered an absence as a verdict with the whole gate green.
describe("what a reader sees under TARGET IDENTITY", () => {
  const ACC = join(HERE, "..", "cli.ts");
  const check = (target: string) =>
    spawnSync("bun", [ACC, "check", target, "--format", "text"], { encoding: "utf8" }).stdout;

  test("a target that answers is quoted, above the flag surface and labelled evidence", () => {
    const out = check(fixture("conforming.ts"));
    expect(out).toContain("TARGET IDENTITY");
    expect(out).toContain('the kit ran ["--version"] and the target answered with');
    expect(out).toContain("not verified to be a version");
    // Ordering is the claim: the two sections are the same kind of thing — the target's own
    // words, captured and not judged — and identity is the coordinate the surface hangs off.
    const identity = out.indexOf("TARGET IDENTITY");
    const flags = out.indexOf("SELF-DECLARED FLAGS");
    expect(identity).toBeGreaterThan(-1);
    expect(flags).toBeGreaterThan(identity);
  }, 120_000);

  // The section prints on EVERY report, including the ones where the target said nothing —
  // otherwise its presence would itself be the finding, and a reader could not tell "this tool
  // has no --version" from "the block is only shown when there is something to show".
  test("a target with no --version at all still gets the section, as an absence", () => {
    const out = check(fixture("population/exits-2-no-version.ts"));
    expect(out).toContain("TARGET IDENTITY");
    expect(out).toContain("wrote nothing to stdout");
    expect(out).toContain("stderr is not substituted");
    // ...and it is not dressed as D1's verdict, which is the one misreading this block invites.
    expect(out).toContain("an absence, not a verdict");
  }, 120_000);
});
