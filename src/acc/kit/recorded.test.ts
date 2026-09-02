// Surfaces somebody else recorded: the reader, the extraction over them, and the two predictions
// that were pre-registered before any of this code existed.
//
// Two halves, as in surface.test.ts and declaration.test.ts. The synthetic cases are the
// adversarial ones — a batch that both merges and separates, a record that declares its own
// capture lossy, an argv the kit would refuse — because those are the shapes that manufacture a
// false surface. The vendored block at the bottom is the ground truth: two real batches captured
// by an outside implementer against the published spec, before a reader existed to be written to
// fit them. Their provenance and caveats are in `fixtures/recorded-surfaces/PROVENANCE.md`, which
// this file cites rather than restates.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { diffDeclaration, parseDeclaration } from "./declaration.ts";
import {
  identityLines,
  loadRecordedBatch,
  parseRecordedBatch,
  provenanceLabel,
  RecordedSurfacesError,
  readRecordedBatch,
} from "./recorded.ts";
import { captureSurface } from "./surface.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const batchFixture = (name: string) => join(HERE, "fixtures", "recorded-surfaces", name);
const readFixture = (name: string): unknown => JSON.parse(readFileSync(batchFixture(name), "utf8"));

/** One well-formed record. Overrides are shallow, which is all any case here needs. */
const record = (over: Record<string, unknown> = {}) => ({
  path: ["state"],
  argv: ["state", "--acc-not-a-flag"],
  exitCode: 2,
  streams: "separated",
  stdout: "",
  stderr: "Unknown option '--acc-not-a-flag'. Valid flags: --json --limit\n",
  completeness: "complete",
  recordedBy: "ci@test",
  recordedAt: "2026-08-25T09:14:02Z",
  ...over,
});

const batch = (over: Record<string, unknown> = {}) => ({
  formatVersion: "0",
  records: [record()],
  ...over,
});

const parse = (over: Record<string, unknown> = {}) => parseRecordedBatch("<test>", batch(over));

describe("the envelope refuses what it does not fully understand", () => {
  test("the skeleton in the spec is a valid batch", () => {
    const b = parse({
      identity: {
        argv: ["--version"],
        exitCode: 0,
        streams: "separated",
        stdout: "grapevine 0.4.1\n",
        stderr: "",
        completeness: "complete",
        recordedBy: "ci@grapevine",
        recordedAt: "2026-08-25T09:14:02Z",
      },
    });
    expect(b.records).toHaveLength(1);
    expect(b.identity?.stdout).toBe("grapevine 0.4.1\n");
  });

  test("an unknown major refuses the batch rather than reading the records it recognises", () => {
    expect(() => parse({ formatVersion: "1" })).toThrow(/not a major this reader understands/);
  });

  test("the version is checked BEFORE unknown keys, so a future document names the right defect", () => {
    // A batch from a later major legitimately carries keys this reader has never heard of.
    // Reporting those instead of the version sends the author to fix the wrong thing — the same
    // ordering `parseDeclaration` applies, for the same reason.
    let message = "";
    try {
      parseRecordedBatch("<test>", { formatVersion: "9", records: [record()], sessions: [] });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/formatVersion/);
    expect(message).not.toMatch(/unknown key/);
  });

  test("an unknown key anywhere refuses the whole batch", () => {
    expect(() => parse({ session: "abc" })).toThrow(/unknown key "session"/);
    expect(() => parse({ records: [record({ durationMs: 4 })] })).toThrow(
      /unknown key "durationMs"/,
    );
  });

  test("the forbidden fields are forbidden by name, and `truncated` is the trap", () => {
    // The kit's own `Observation.truncated` is its judgement about ITS read hitting the output
    // ceiling. The record's field is `completeness`, and a record spelling it the kit's way is
    // refused rather than silently read as the caller's declaration.
    for (const key of ["inertness", "purposes", "crashed", "timedOut", "truncated", "id"]) {
      expect(() => parse({ records: [record({ [key]: true })] })).toThrow(/unknown key/);
    }
  });

  test("an empty records array is not a batch", () => {
    expect(() => parse({ records: [] })).toThrow(/at least one record/);
  });

  test("the refusal is its own error type, carrying the file it is about", () => {
    // Its own type exactly as `DeclarationError` is: the kit is usable without this CLI's error
    // taxonomy, and the command layer owns the mapping to a usage error.
    let caught: unknown;
    try {
      parseRecordedBatch("/tmp/batch.json", { formatVersion: "0" });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RecordedSurfacesError);
    expect((caught as RecordedSurfacesError).path).toBe("/tmp/batch.json");
  });
});

describe("the cross-field stream rules, which the unknown-key sweep cannot see", () => {
  test("separated with no stdout, or no stderr, refuses the batch", () => {
    expect(() => parse({ records: [record({ stdout: undefined })] })).toThrow(/both required/);
    expect(() => parse({ records: [record({ stderr: undefined })] })).toThrow(/both required/);
  });

  test("separated carrying output refuses the batch — two claims about one capture", () => {
    expect(() => parse({ records: [record({ output: "x" })] })).toThrow(/incompatible claims/);
  });

  test("merged with no output refuses the batch", () => {
    expect(() =>
      parse({ records: [record({ streams: "merged", stdout: undefined, stderr: undefined })] }),
    ).toThrow(/output is required/);
  });

  test("merged carrying stdout or stderr refuses the batch", () => {
    expect(() =>
      parse({ records: [record({ streams: "merged", output: "x", stderr: undefined })] }),
    ).toThrow(/incompatible claims/);
  });
});

describe("the per-record rules", () => {
  test("path must be a prefix of argv, which is what makes a record self-checking", () => {
    expect(() => parse({ records: [record({ path: ["send"] })] })).toThrow(/must be a prefix/);
  });

  test("a `path: []` record refuses the batch, and the message says what to do", () => {
    let message = "";
    try {
      parse({ records: [record({ path: [], argv: ["--acc-not-a-flag"] })] });
    } catch (err) {
      message = (err as Error).message;
    }
    // The kit always probes the root itself, so a recorded root capture would give one census
    // line two observers. Refused rather than dropped: dropping it silently is a caller's claim
    // deleted without a word.
    expect(message).toMatch(/root is the one path the kit reads for itself/);
    expect(message).toMatch(/Resubmit without it/);
  });

  test("completeness is REQUIRED, and its absence refuses the batch", () => {
    // The defect being fixed at the input contract: an absent field used to read as `complete`,
    // so silence strictly dominated honesty. There is no longer a silence to prefer.
    expect(() => parse({ records: [record({ completeness: undefined })] })).toThrow(
      /completeness is required/,
    );
  });

  test("exitCode is required and NULLABLE — a `2>&1 | tee` pipeline loses $?", () => {
    expect(parse({ records: [record({ exitCode: null })] }).records[0]?.exitCode).toBeNull();
    expect(() => parse({ records: [record({ exitCode: undefined })] })).toThrow(/exitCode/);
  });

  test("streams is required: the caller wrote the redirection or did not", () => {
    expect(() => parse({ records: [record({ streams: undefined })] })).toThrow(
      /streams is required/,
    );
  });

  test("recordedBy and recordedAt are required", () => {
    expect(() => parse({ records: [record({ recordedBy: "" })] })).toThrow(/recordedBy/);
    expect(() => parse({ records: [record({ recordedAt: undefined })] })).toThrow(/recordedAt/);
  });
});

describe("the identity observation", () => {
  const identity = (over: Record<string, unknown> = {}) => ({
    argv: ["--version"],
    exitCode: 0,
    streams: "separated",
    stdout: "mycli 1.2.3\n",
    stderr: "",
    completeness: "complete",
    recordedBy: "ci@test",
    recordedAt: "2026-08-25T09:14:02Z",
    ...over,
  });

  test("it is optional, and its absence is a fact rather than a hole", () => {
    expect(parse().identity).toBeNull();
  });

  test("`path` on it is an unknown key, which is what makes the separation structural", () => {
    expect(() => parse({ identity: identity({ path: [] }) })).toThrow(/unknown key "path"/);
  });

  test("the printed line quotes the record's OWN argv, never the literal --version", () => {
    const lines = identityLines(
      parseRecordedBatch("<test>", batch({ identity: identity({ argv: ["--cli-schema"] }) }))
        .identity as never,
    );
    expect(lines[0]).toContain('["--cli-schema"]');
    expect(lines[0]).toContain('"mycli 1.2.3"');
  });

  test("the parenthesis is required, and it says what D1's own detector does not establish", () => {
    const lines = identityLines(
      parseRecordedBatch("<test>", batch({ identity: identity() })).identity as never,
    );
    expect(lines[1]).toContain("not verified to be a version");
    // And it must never read as the verification it is not: D1's own detector is a non-empty
    // stream standing in for a typed payload, so "the target reported a version" is a claim
    // neither this line nor that rule establishes.
    expect(lines.join(" ")).not.toMatch(/reported (its |a )?version|confirms|is a version/i);
  });

  test("an empty stdout under `separated` says so, and stderr is NOT substituted", () => {
    // Substituting would be the kit inventing D1's answer out of the other stream.
    const lines = identityLines(
      parseRecordedBatch(
        "<test>",
        batch({ identity: identity({ stdout: "", stderr: 'unknown verb "--version"\n' }) }),
      ).identity as never,
    );
    expect(lines[0]).toContain("wrote nothing to stdout");
    expect(lines[0]).not.toContain("unknown verb");
  });

  test("merged names the merge, so a reader knows stderr may be inside the quote", () => {
    const lines = identityLines(
      parseRecordedBatch(
        "<test>",
        batch({
          identity: identity({
            streams: "merged",
            stdout: undefined,
            stderr: undefined,
            output: "mycli 1.2.3\n",
          }),
        }),
      ).identity as never,
    );
    expect(lines[0]).toContain("streams merged");
  });

  test("a non-complete identity is still printed, with its completeness named", () => {
    // A record is read for a SET, where a short list looks whole and fakes an absence. A quotation
    // is read for BYTES, and a cut makes it shorter rather than false.
    for (const [value, phrase] of [
      ["truncated", "recorded a truncated capture of this identity"],
      ["unknown", "could not establish this identity capture was complete"],
    ] as const) {
      const lines = identityLines(
        parseRecordedBatch("<test>", batch({ identity: identity({ completeness: value }) }))
          .identity as never,
      );
      expect(lines[0]).toContain('"mycli 1.2.3"');
      expect(lines.join(" ")).toContain(phrase);
    }
  });
});

describe("which records the kit reads, and what it says about the ones it does not", () => {
  const read = (over: Record<string, unknown>) =>
    readRecordedBatch(parse({ records: [record(over)] })).surfaces[0];

  test("a well-formed rejection enumerates, and the evidence is labelled as the caller's", () => {
    const s = read({});
    expect(s?.surface.status).toBe("enumerated");
    expect(s?.surface.flags).toEqual(["--json", "--limit"]);
    expect(s?.surfaceProvenance).toBe("recorded-by-caller");
    expect(s?.surface.evidence[0]?.observationId).toBe("recorded:0");
    expect(s?.surface.evidence[0]?.stream).toBe("stderr");
  });

  test("a `--` anywhere in the argv is not read, and the line says which rule it missed", () => {
    const s = read({ argv: ["state", "--", "--acc-not-a-flag"] });
    expect(s?.surface.status).toBe("no-evidence");
    expect(s?.notes?.[0]).toContain("bare --");
  });

  test("a bare path is an invocation, not a rejection of anything", () => {
    const s = read({ argv: ["state"] });
    expect(s?.surface.status).toBe("no-evidence");
    expect(s?.notes?.[0]).toContain("no token after its path");
  });

  test("a token that is not flag-shaped is about a verb or a positional, not this path", () => {
    for (const token of ["notacommand", "-1", "-abc"]) {
      const s = read({ argv: ["state", token] });
      expect(s?.surface.status).toBe("no-evidence");
      expect(s?.notes?.[0]).toContain("not flag-shaped");
    }
  });

  test("a record that is not `complete` is excluded, and the line names the VALUE", () => {
    // A different fix from a shape miss — one recaptures without the `head`, the other recaptures
    // with a different argv — so the two sentences must not blur together.
    expect(read({ completeness: "truncated" })?.notes?.[0]).toBe(
      "the caller recorded a truncated capture at this path, so it was not read",
    );
    expect(read({ completeness: "unknown" })?.notes?.[0]).toBe(
      "the caller could not establish this capture was complete, so it was not read",
    );
    expect(read({ completeness: "truncated" })?.surface.status).toBe("no-evidence");
  });

  test("merged bytes are attributed `merged`, never to a stream nobody observed them on", () => {
    const s = read({
      streams: "merged",
      stdout: undefined,
      stderr: undefined,
      output: "Unknown option '--acc-not-a-flag'. Valid flags: --json\n",
    });
    expect(s?.surface.status).toBe("enumerated");
    expect(s?.surface.evidence[0]?.stream).toBe("merged");
  });

  test("a set echoing the sentinel back erases the read, and lands `not-enumerated`", () => {
    // The record passes the shape test and IS read; `readStream` yields nothing from it. That is
    // `not-enumerated` on a path that was looked at, not `no-evidence`.
    const s = read({ stderr: "Unknown option. Valid flags: --acc-not-a-flag --json\n" });
    expect(s?.surface.status).toBe("not-enumerated");
    expect(s?.surface.probesRead).toBe(1);
  });

  test("a surface that enumerated nothing carries NO `flags` key, in either non-enumerated state", () => {
    // "Enumerated zero flags" is the one output a `Surface` minter must never produce: an empty
    // array is indistinguishable from a tool with no flags, and from a serializer that dropped the
    // list. `captureSurface` is guarded for exactly this (surface.test.ts, "a signpost to help is
    // not a list" and "an empty set declares nothing"); `readRecordedBatch` is the SECOND place in
    // the tree that mints a `Surface`, and it was not — inserting `flags: []` into its
    // non-enumerated branch passed the whole suite.
    const echoed = read({ stderr: "Unknown option. Valid flags: --acc-not-a-flag\n" });
    expect(echoed?.surface.status).toBe("not-enumerated");
    expect(echoed?.surface.flags).toBeUndefined();
    // An explicit `flags: undefined` would satisfy the line above and still serialize the key, so
    // the absence is asserted as absence.
    expect(Object.hasOwn(echoed?.surface ?? {}, "flags")).toBe(false);

    const unread = read({ argv: ["state"] });
    expect(unread?.surface.status).toBe("no-evidence");
    expect(unread?.surface.flags).toBeUndefined();
    expect(Object.hasOwn(unread?.surface ?? {}, "flags")).toBe(false);
  });

  test("several records at one path union, and disagreement publishes `consistent: false`", () => {
    const reading = readRecordedBatch(
      parse({
        records: [
          record({ stderr: "Valid flags: --json\n" }),
          record({ argv: ["state", "--acc-other"], stderr: "Valid flags: --json --limit\n" }),
        ],
      }),
    );
    expect(reading.surfaces).toHaveLength(1);
    expect(reading.surfaces[0]?.surface.flags).toEqual(["--json", "--limit"]);
    expect(reading.surfaces[0]?.surface.consistent).toBe(false);
    expect(reading.surfaces[0]?.surface.probesRead).toBe(2);
  });

  test("one excluded record beside one complete record is NOT no-evidence", () => {
    // A path falls to `no-evidence` only when nothing at it survived to be read. The complete one
    // is read; the excluded one is named on the line.
    const reading = readRecordedBatch(
      parse({ records: [record({ completeness: "truncated" }), record()] }),
    );
    const s = reading.surfaces[0];
    expect(s?.surface.status).toBe("enumerated");
    expect(s?.notes).toHaveLength(1);
  });
});

describe("the two no-evidence reasons, and there are two", () => {
  const declaration = parseDeclaration("<test>", {
    formatVersion: "0",
    provenance: "modelled",
    selfDescription: null,
    commands: [
      { path: [], args: [], positionals: [] },
      { path: ["state"], args: [], positionals: [] },
    ],
  });
  const rootProbed = {
    path: [] as string[],
    surface: { status: "no-evidence" as const, evidence: [], probesRead: 0 },
    surfaceProvenance: "probed-by-kit" as const,
  };

  test("with no batch, a path the kit could not reach is `unreachable`", () => {
    const d = diffDeclaration(declaration, [rootProbed]);
    const state = d.paths.find((p) => p.path[0] === "state");
    expect(state?.noEvidenceReason).toBe("unreachable");
    expect(state?.reason).toBe("the kit probes the root only, so nothing reached this path");
  });

  test("with a batch that says nothing about it, the same path is `not-recorded`", () => {
    const d = diffDeclaration(declaration, [rootProbed], true);
    const state = d.paths.find((p) => p.path[0] === "state");
    expect(state?.noEvidenceReason).toBe("not-recorded");
    expect(state?.reason).toBe(
      "the caller supplied recorded surfaces and recorded nothing at this path",
    );
  });

  test("`no-warrant` is withdrawn and must not be emitted anywhere", () => {
    const d = diffDeclaration(declaration, [rootProbed], true);
    expect(d.paths.every((p) => p.noEvidenceReason !== ("no-warrant" as never))).toBe(true);
    expect(JSON.stringify(d)).not.toContain("warrant");
  });

  test("an EXCLUDED record is no-evidence under recorded-by-caller, never `not-recorded`", () => {
    // The caller recorded there. What the line owes them is that the recording was set aside, not
    // that it was absent — those are different facts and different next actions.
    const reading = readRecordedBatch(parse({ records: [record({ completeness: "unknown" })] }));
    const d = diffDeclaration(declaration, [rootProbed, ...reading.surfaces], true);
    const state = d.paths.find((p) => p.path[0] === "state");
    expect(state?.noEvidenceReason).toBeUndefined();
    expect(state?.surfaceProvenance).toBe("recorded-by-caller");
    expect(state?.reason).toContain("could not establish this capture was complete");
  });

  test("the non-enumeration sentence names the PATH, not the root", () => {
    // `surfaceSummary`'s literal `at the root — the only path probed` printed for `state` would be
    // a false scope claim in the one place scope matters most.
    const reading = readRecordedBatch(parse({ records: [record({ stderr: "no idea\n" })] }));
    const d = diffDeclaration(declaration, [rootProbed, ...reading.surfaces], true);
    const state = d.paths.find((p) => p.path[0] === "state");
    expect(state?.reason).toContain("did not enumerate at state");
    expect(state?.reason).not.toContain("root");
  });

  test("the provenance label carries the batch's unstated identity to the line", () => {
    expect(provenanceLabel("probed-by-kit", false)).toBe("probed-by-kit");
    expect(provenanceLabel("recorded-by-caller", true)).toBe("recorded-by-caller");
    expect(provenanceLabel("recorded-by-caller", false)).toBe(
      "recorded-by-caller (identity unstated)",
    );
  });
});

// ---------------------------------------------------------------------------------------------
// THE VENDORED BATCHES, and the two predictions registered before this code existed.
//
// Captured by `trellis` against the published spec at `80104df` and vendored verbatim — see
// `fixtures/recorded-surfaces/PROVENANCE.md` for attribution, the sha256 of each file, and the
// four caveats that attach to them. Nothing here may be tuned to make a number land: both
// predictions were fixed in advance, and a miss is a result.
// ---------------------------------------------------------------------------------------------
describe("the vendored batches, read with the kit's own extraction", () => {
  const load = (name: string) => readRecordedBatch(loadRecordedBatch(batchFixture(name)));
  const declaration = (name: string) => parseDeclaration(name, readFixture(name));

  test("both batches load unmodified under the reader written from the spec", () => {
    expect(() => load("grapevine.recorded-surfaces.json")).not.toThrow();
    expect(() => load("bounty.recorded-surfaces.json")).not.toThrow();
  });

  test("SG-8, pre-registered: ~18 of 22 accepted-not-declared at bounty's `state`", () => {
    // Registered at Spellbook `5c98726`; the denominator was corrected from 21 to 22 by `trellis`
    // at `d45def2`, BEFORE any diff existed to run. The falsifiable claim is the pair of counts
    // below, and the inverse direction — 0 `declared-not-accepted` — is the half that says the
    // modelled declaration is a SUBSET of the parser's registry rather than a contradiction of it.
    const reading = load("bounty.recorded-surfaces.json");
    const state = reading.surfaces.find((s) => s.path[0] === "state");
    expect(state?.surface.status).toBe("enumerated");
    expect(state?.surface.flags).toHaveLength(22);

    const d = diffDeclaration(
      declaration("bounty.modelled.declaration.json"),
      reading.surfaces,
      true,
    );
    const at = (kind: string) =>
      d.findings.filter((f) => f.kind === kind && f.path[0] === "state").length;
    expect(at("accepted-not-declared")).toBe(18);
    expect(at("declared-not-accepted")).toBe(0);
    // And the census that carries them names who observed it.
    expect(d.paths.find((p) => p.path[0] === "state")?.surfaceProvenance).toBe(
      "recorded-by-caller",
    );
  });

  test("bounty's identity is a FAILED --version, and the batch keeps it", () => {
    // The third option the spec's own "why optional" argument did not name: a tool with no
    // `--version` need neither fabricate a reading nor drop the capture. Exit 2, empty stdout, the
    // absence in the tool's own words on stderr.
    const identity = load("bounty.recorded-surfaces.json").identity;
    expect(identity?.exitCode).toBe(2);
    expect(identity?.stdout).toBe("");
    const lines = identityLines(identity as never);
    expect(lines[0]).toContain("wrote nothing to stdout");
    expect(lines[0]).not.toContain("unknown verb");
  });

  test("grapevine, pre-registered: 32 of 33 declared paths compared on recorded surfaces", () => {
    // Registered by `trellis` at Spellbook `d45def2` and pinned in the parent plan on 2026-08-25,
    // before any ingestion code existed. 33 declared paths, 32 records, and the two sets differ by
    // the root alone — which is the kit's own and is deliberately absent from the batch. A result
    // of 31 or fewer would be a finding about THIS READER, most likely a path that failed a
    // readable-rejection rule and landed `no-evidence`.
    const reading = load("grapevine.recorded-surfaces.json");
    expect(reading.records).toBe(32);
    expect(reading.surfaces).toHaveLength(32);
    expect(reading.surfaces.every((s) => s.surface.status === "enumerated")).toBe(true);

    // THE ROOT IS PREPENDED HERE BECAUSE `report.ts` ALWAYS PREPENDS IT. `pathSurfaces` puts
    // `{ path: [], surfaceProvenance: "probed-by-kit" }` in front of every recorded surface, so a
    // run in which the root has no `PathSurface` at all is a state the product cannot reach — and
    // asserting `noEvidenceReason: "not-recorded"` for the root pinned exactly that, telling the
    // caller to record a path `path: []` refuses. `captureSurface([])` is the honest root for this
    // fixture: the kit probed and read nothing, which is why the count is 32 and not 33.
    const d = diffDeclaration(
      declaration("grapevine.declaration.json"),
      [
        { path: [], surface: captureSurface([]), surfaceProvenance: "probed-by-kit" },
        ...reading.surfaces,
      ],
      true,
    );
    expect(d.declaredCommands).toBe(33);
    expect(d.checkedCommands).toBe(32);
    // The 33rd is the root, and it is the KIT's path rather than the batch's: the root surface is
    // present and says nothing, so there is no `noEvidenceReason` to give — the sentence a real run
    // prints is the one `surfaceSummary` writes for an empty root capture, over `probed-by-kit`.
    const root = d.paths.find((p) => p.path.length === 0);
    expect(root?.checked).toBe(false);
    expect(root?.surfaceProvenance).toBe("probed-by-kit");
    expect(root?.noEvidenceReason).toBeUndefined();
    expect(root?.reason).toBe(
      "nothing readable was recorded at the root, so nothing was read (not a statement about the tool)",
    );
  });

  test("grapevine's identity is present, and the census still refuses to call it a version", () => {
    const identity = load("grapevine.recorded-surfaces.json").identity;
    expect(identity?.exitCode).toBe(0);
    const lines = identityLines(identity as never);
    // Quoted through `JSON.stringify`, so the bytes survive escaping rather than being tidied:
    // the quote is a quotation, and a helpfully cleaned one is a different capture.
    expect(lines[0]).toContain(JSON.stringify('{"name":"grapevine","version":"2.2.0"}'));
    expect(lines[1]).toContain("not verified to be a version");
  });
});

// ---------------------------------------------------------------------------------------------
// END TO END, against the real CLI: the flag, its refusal to repeat, and what a batch does to a
// report's census.
// ---------------------------------------------------------------------------------------------
describe("acc check --recorded-surfaces", () => {
  const acc = join(HERE, "..", "cli.ts");
  const target = join(HERE, "fixtures", "enumerates-flags-in-prose.ts");
  const tmp = mkdtempSync(join(tmpdir(), "acc-recorded-"));
  const write = (name: string, body: unknown): string => {
    const path = join(tmp, name);
    writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`);
    return path;
  };
  const run = (args: string[]) =>
    spawnSync("bun", [acc, "check", target, "--format", "text", ...args], { encoding: "utf8" });

  test("a second --recorded-surfaces is REFUSED, where commander would take the last", () => {
    // One batch is one session assertion. Merging two would erase the binding the batch exists to
    // assert, and silently keeping one of them is a caller's claim deleted without a word.
    const one = write("a.json", batch());
    const r = spawnSync(
      "bun",
      [acc, "check", target, "--recorded-surfaces", one, "--recorded-surfaces", one],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(2);
    expect(`${r.stdout}${r.stderr}`).toMatch(/at most once/);
    expect(`${r.stdout}${r.stderr}`).toMatch(/one session assertion/);
  });

  test("a malformed batch is a usage error, reported before the target is spawned", () => {
    const bad = write("bad.json", batch({ formatVersion: "7" }));
    const r = run(["--recorded-surfaces", bad]);
    expect(r.status).toBe(2);
    expect(`${r.stdout}${r.stderr}`).toMatch(/not a major this reader understands/);
  });

  test("a named path that does not exist is an error, never an empty census", () => {
    // `not_found`, not `usage`: the invocation was well-formed and the world was not what it
    // assumed. A missing file is created and a malformed one is edited, so the two get different
    // kinds — the same rule `--declaration` and `acc probe-plan` answer with, rather than one each
    // command decides for itself. This assertion used to read `2`, which pinned the older
    // classification without meaning to; what it exists to establish is that the run STOPS rather
    // than continuing with an empty census, and that still holds.
    const r = run(["--recorded-surfaces", join(tmp, "nope.json")]);
    expect(r.status).toBe(5);
    expect(`${r.stdout}${r.stderr}`).toMatch(/no such file/);
  });

  test("a batch prints its own block, and never as a verdict", () => {
    const path = write(
      "good.json",
      batch({
        identity: {
          argv: ["--version"],
          exitCode: 0,
          streams: "separated",
          stdout: "mycli 1.2.3\n",
          stderr: "",
          completeness: "complete",
          recordedBy: "ci@test",
          recordedAt: "2026-08-25T09:14:02Z",
        },
      }),
    );
    const r = run(["--recorded-surfaces", path]);
    expect(r.stdout).toContain("RECORDED SURFACES");
    expect(r.stdout).toContain("Evidence, not a rule");
    expect(r.stdout).toContain("The kit executed nothing below the root.");
    expect(r.stdout).toContain("not verified to be a version");
  });

  test("the census lines say who observed each path, and the batch lifts the ceiling", () => {
    const path = write("state.json", batch());
    const declaration = write("decl.json", {
      formatVersion: "0",
      provenance: "modelled",
      selfDescription: null,
      commands: [
        { path: [], args: [], positionals: [] },
        { path: ["state"], args: [], positionals: [] },
        { path: ["send"], args: [], positionals: [] },
      ],
    });
    const r = run(["--recorded-surfaces", path, "--declaration", declaration]);
    // `state` was compared on the caller's record...
    expect(r.stdout).toContain("accepted-not-declared  --json at state [recorded-by-caller");
    // ...`send` was not recorded at all, and the reason says so rather than blaming the kit...
    expect(r.stdout).toContain("recorded nothing at this path");
    // ...and the batch states no identity, so every line resting on it says so.
    expect(r.stdout).toContain("identity unstated");
    // Nothing here moved the verdict.
    expect(r.stdout).toMatch(/census line(s)? rests? on recorded surfaces/);
  });
});

/**
 * FORTY-EIGHT NEAR-IDENTICAL LINES ARE NOT A CENSUS, THEY ARE A WALL.
 *
 * Round 3 recorded 49 paths. Forty-eight of them produced the same sentence differing only in the
 * path, and the one that differed was the finding — buried in the middle of them. Only visible at
 * a scale no earlier trial reached: with three paths the repetition reads as thoroughness.
 *
 * The rollup states the count and itemises the EXCEPTIONS. Nothing is lost — every path keeps its
 * own entry in `.data.recordedSurfaces.readings`, which is where a consumer reads them anyway.
 */
describe("the census rolls up what repeats and itemises what does not", () => {
  const acc = join(HERE, "..", "cli.ts");
  const target = join(HERE, "fixtures", "enumerates-flags-in-prose.ts");
  const tmp = mkdtempSync(join(tmpdir(), "acc-rollup-"));
  const write = (name: string, body: unknown): string => {
    const path = join(tmp, name);
    writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`);
    return path;
  };
  // Format is passed per case here rather than fixed, because one case reads the JSON to show
  // that rolling up the TEXT loses nothing a consumer depends on.
  const run = (args: string[], format = "text") =>
    spawnSync("bun", [acc, "check", target, "--format", format, ...args], { encoding: "utf8" });

  const at = (path: string[], stderr: string) =>
    record({ path, argv: [...path, "--acc-not-a-flag"], stderr });
  const SILENT = "Error: unknown option\n";
  const NAMES = "Unknown option. Valid flags: --json --limit\n";

  test("many identical outcomes collapse to a count, and the odd one out is printed", () => {
    const many = Array.from({ length: 12 }, (_, i) => at([`verb${i}`], SILENT));
    const path = write("wall.json", batch({ records: [...many, at(["special"], NAMES)] }));
    const r = run(["--recorded-surfaces", path]);

    // The count is stated, with its denominator.
    expect(r.stdout).toMatch(/13 paths/);
    expect(r.stdout).toMatch(/12 did not enumerate/);
    // The exception is itemised in full — it is the finding.
    expect(r.stdout).toContain("special");
    expect(r.stdout).toContain("--json");
    // The twelve repeats are not each printed.
    expect(r.stdout).not.toContain("verb7");
    // And the reader is told where the full list lives rather than left to assume it is gone.
    expect(r.stdout).toMatch(/readings/);
  });

  test("a small census is still itemised in full — the rollup is for scale, not for tidiness", () => {
    const path = write(
      "small.json",
      batch({ records: [at(["one"], SILENT), at(["two"], SILENT)] }),
    );
    const r = run(["--recorded-surfaces", path]);
    expect(r.stdout).toContain("one");
    expect(r.stdout).toContain("two");
  });

  test("when every path differs, nothing is rolled up", () => {
    const path = write(
      "varied.json",
      batch({ records: [at(["a"], NAMES), at(["b"], SILENT), at(["c"], NAMES)] }),
    );
    const r = run(["--recorded-surfaces", path]);
    for (const p of ["a", "b", "c"]) expect(r.stdout).toContain(p);
  });

  test("folding does not delete the non-flag-list fact the same batch exists to surface", () => {
    // THE INTERACTION, AND WHY THESE WERE ONE BRANCH. The per-path sentence names a `choices`
    // list where one was seen; rolling up 48 of those would have deleted, at scale, exactly the
    // fact the same 49-path batch was the reason for adding. Round 3 is both the case that
    // motivated the rollup and the case that would have lost the clause to it.
    const verbs = JSON.stringify({ error: { choices: ["add", "list", "remove"] } });
    const many = Array.from({ length: 12 }, (_, i) => at([`verb${i}`], verbs));
    const path = write("folded-choices.json", batch({ records: many }));
    const r = run(["--recorded-surfaces", path]);
    expect(r.stdout).toMatch(/12 did not enumerate/);
    expect(r.stdout).toMatch(/12 named a non-flag list/);
    expect(r.stdout).toContain("choices");
  });

  test("a recorded batch gets the same reading as the kit's own capture", () => {
    // These were two copies of one construction, which is why the near-miss field first existed
    // on the kit's probes and not on recorded batches — that is, not on the batch that prompted
    // it. One function builds both now; this asserts the batch side actually reaches it.
    const verbs = JSON.stringify({ error: { choices: ["add", "list"] } });
    const path = write("one-choice.json", batch({ records: [at(["solo"], verbs)] }));
    const readings = JSON.parse(run(["--recorded-surfaces", path], "json").stdout).data
      .recordedSurfaces.readings;
    expect(readings[0].nonFlagKeys).toEqual(["choices"]);
    expect(readings[0].summary).toContain("not flag-shaped");
  });

  test("the JSON keeps every path whatever the text does", () => {
    const many = Array.from({ length: 12 }, (_, i) => at([`verb${i}`], SILENT));
    const path = write("wall2.json", batch({ records: many }));
    const r = run(["--recorded-surfaces", path], "json");
    const readings = JSON.parse(r.stdout).data.recordedSurfaces.readings;
    expect(readings.length).toBe(12);
    // `status` travels with each reading so the rollup groups on the field rather than by
    // matching the prose it is about to replace.
    expect(new Set(readings.map((x: { status: string }) => x.status))).toEqual(
      new Set(["not-enumerated"]),
    );
  });

  test("a rolled-up `enumerated-none` group reads as English, not the raw status token", () => {
    // Below the root, an empty `choices` set is the target answering rather than declining —
    // `enumerated-none`. Four paths clear FOLD_AT, so this drives the census through the rollup
    // rather than the itemised list, which is the only place `VERDICT_WORD` is read.
    const emptySet = JSON.stringify({ error: { choices: [] } });
    const many = Array.from({ length: 4 }, (_, i) => at([`verb${i}`], emptySet));
    const path = write("empty-set.json", batch({ records: many }));
    const r = run(["--recorded-surfaces", path]);
    expect(r.stdout).toMatch(/4 paths/);
    // The rollup names the group in English, not the raw enum token — that degradation, via
    // `VERDICT_WORD[status] ?? status`, is the defect this test exists to catch.
    expect(r.stdout).not.toContain("enumerated-none");
    // And it must not read as `not-enumerated`'s noun — that confusion is the whole point of
    // giving this status its own word.
    expect(r.stdout).not.toMatch(/4 did not enumerate/);
  });
});
