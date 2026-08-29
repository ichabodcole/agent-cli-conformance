// The flag-surface capture: what a target says it accepts, read back from its own rejection.
//
// Two halves, and both are load-bearing. The synthetic cases below are the adversarial ones —
// error text that talks about flags without declaring any, a field echoing our own probe back, a
// truncated capture — because those are the shapes that manufacture a false surface and none of
// them is convenient to produce from a real process. The fixture runs at the bottom are what says
// the whole path works against a program: a matcher that only ever meets hand-written strings is a
// matcher nobody has run.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Declaration, diffDeclaration } from "./declaration.ts";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import { digestOfText } from "./runner.ts";
import {
  advertisedVerbsSummary,
  captureSurface,
  compareAdvertisedVerbs,
  surfaceSummary,
} from "./surface.ts";
import type { Invocation, Observation } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(HERE, "fixtures", name);

/** One recorded rejection. Defaults are the ordinary case: an unknown long flag, refused on stderr. */
function rejection(
  stderr: string,
  over: Partial<Observation> & { args?: string[]; inertness?: Invocation["inertness"] } = {},
): Observation {
  const args = over.args ?? ["--acc-probe-xyzzy-flag"];
  return {
    id: over.id ?? `id-${args.join("_")}-${stderr.length}`,
    invocation: {
      args,
      inertness: over.inertness ?? "sentinel",
      purpose: "A1: an unrecognised flag must be rejected",
    },
    purposes: ["A1: an unrecognised flag must be rejected"],
    stdout: over.stdout ?? "",
    stderr,
    stdoutBytes: (over.stdout ?? "").length,
    stderrBytes: stderr.length,
    stdoutDigest: digestOfText(over.stdout ?? ""),
    stderrDigest: digestOfText(stderr),
    stdoutLossy: false,
    stderrLossy: false,
    truncated: over.truncated ?? false,
    exitCode: over.exitCode ?? 2,
    signal: null,
    crashed: over.crashed ?? false,
    timedOut: over.timedOut ?? false,
    spawnFailed: over.spawnFailed ?? false,
    durationMs: 5,
    timeToFirstByteMs: 1,
  };
}

describe("what the capture recognises", () => {
  test("a marked list in prose, which is the shape anthill ships", () => {
    const s = captureSurface([
      rejection(`{"ok":false,"error":"Unknown option '--nope'. Valid flags: --format"}`),
    ]);
    expect(s.status).toBe("enumerated");
    expect(s.flags).toEqual(["--format"]);
    // The marker is published so a reader can check the match rather than trust it.
    expect(s.evidence[0]?.shape).toBe("prose-marker");
    expect(s.evidence[0]?.matched).toBe("Valid flags:");
  });

  test("a structured field, and it WINS over prose in the same document", () => {
    const s = captureSurface([
      rejection(
        `{"error":{"message":"unknown option --x. Valid flags: --stale","validFlags":["--a","--b"]}}`,
      ),
    ]);
    // A field is a shape the target chose; a sentence is one we are guessing at. When a document
    // carries both, reading the sentence would prefer the guess — and here the two disagree, which
    // is exactly the drift between a maintained string and the parser's own table that this
    // capture exists to make visible.
    expect(s.evidence[0]?.shape).toBe("json-field");
    expect(s.flags).toEqual(["--a", "--b"]);
  });

  test("prose on plain-text stderr, with no JSON anywhere", () => {
    const s = captureSurface([rejection("error: unknown option '--x'\nvalid options: --a, --b\n")]);
    expect(s.flags).toEqual(["--a", "--b"]);
  });

  test("the list stops at the first token that is not a flag", () => {
    const s = captureSurface([rejection("valid flags: --a --b. Run --help for details.")]);
    // Not `--help`: the sentence after the full stop is prose about where to look, and swallowing
    // it would publish a flag the target never listed.
    expect(s.flags).toEqual(["--a", "--b"]);
  });

  test("a list mixing long and short flags, captured WHOLE", () => {
    const s = captureSurface([
      rejection(
        `{"ok":false,"error":"Unknown option '--nope'. Valid flags: --help, -h, --version, -V"}`,
      ),
    ]);
    // The defect this replaces stopped the read at `-h` and published `["--help"]`. Under-capture
    // would be bad enough; what made it urgent is that `declaration.ts` diffs against this set, so
    // the three lost flags came back as findings against flags the tool accepts. `-h` and `-V` are
    // the universal surface STANDARD.md recommends, so any CLI following our own advice trips it.
    expect(s.flags).toEqual(["--help", "--version", "-V", "-h"]);
  });

  test("a short flag in a structured field is an ordinary member too", () => {
    const s = captureSurface([rejection(`{"error":{"validFlags":["-h","--help"]}}`)]);
    // Every member must be flag-shaped, and a short flag IS flag-shaped — a long-only test made
    // this whole field unreadable rather than merely short.
    expect(s.flags).toEqual(["--help", "-h"]);
  });

  test("short and long are INDEPENDENT members, with no aliasing inferred", () => {
    const s = captureSurface([rejection("valid flags: -h --help")]);
    // Nothing in a rejection says `-h` aliases `--help`; they are two tokens in a list. Pairing
    // them would be reading a relationship the target never stated, and would need a model — a
    // canonical spelling, a field to carry it, a diff rule for whether declaring one declares the
    // other. Both are published, and the declaration diff compares spellings as it always has.
    expect(s.flags).toEqual(["--help", "-h"]);
  });

  test("stdout is read when the rejection went there", () => {
    const s = captureSurface([rejection("", { stdout: "valid flags: --a" })]);
    expect(s.evidence[0]?.stream).toBe("stdout");
  });
});

describe("what the capture refuses, which is the half that keeps it honest", () => {
  test("a signpost to help is not a list", () => {
    const s = captureSurface([
      rejection("error: unknown option '--x' — run --help to see the valid flags"),
    ]);
    expect(s.status).toBe("not-enumerated");
    expect(s.flags).toBeUndefined();
  });

  test("the marker phrase without the colon that makes it a declaration", () => {
    const s = captureSurface([
      rejection("error: unknown option '--x'; for valid options --help lists them all"),
    ]);
    // Only the punctuation separates a declaration from a sentence that mentions the same words,
    // and this sentence is followed by a real flag — so a matcher that shrugged at the colon would
    // publish `--help` as this tool's entire accepted set. Fabricating a surface out of a signpost
    // is worse than reporting nothing, because nothing is honest.
    expect(s.status).toBe("not-enumerated");
  });

  test("a marker followed by words rather than flags", () => {
    const s = captureSurface([rejection("unknown option; valid flags: see the manual")]);
    expect(s.status).toBe("not-enumerated");
  });

  test("a single dash and MORE than one letter is not a short flag", () => {
    // `-abc` is a bundle of three on one parser and one old-style long name on another, and
    // nothing in a rejection says which. Choosing would be working out what one of the target's
    // words MEANS, which is the line this file does not cross — so the list stops there.
    expect(captureSurface([rejection("valid flags: -abc")]).status).toBe("not-enumerated");
    expect(captureSurface([rejection("valid flags: --a -abc --b")]).flags).toEqual(["--a"]);
  });

  test("a lone dash, a digit and a bare `--` open nothing", () => {
    // Ordinary error prose is full of these. `-1` in particular is a number in a sentence far more
    // often than it is a flag, and widening to short flags must not turn one into the other.
    for (const text of ["valid flags: -", "valid flags: -1 --a", "valid flags: -- --a"]) {
      expect(captureSurface([rejection(text)]).status).toBe("not-enumerated");
    }
  });

  test("a closed set of SUBCOMMANDS under `choices`, which is acc's own envelope", () => {
    const s = captureSurface([
      rejection(`{"error":{"message":"unknown option","choices":["rules","show","check"]}}`),
    ]);
    // Every member must be flag-shaped. Without that clause the kit's own reference
    // implementation reports a flag surface made entirely of its command names.
    expect(s.status).toBe("not-enumerated");
  });

  test("our own probe echoed back is not an accepted set", () => {
    const s = captureSurface([
      rejection(`{"error":{"validFlags":["--acc-probe-xyzzy-flag","--real"]}}`),
    ]);
    // An accepted set cannot contain the flag the target has just refused. This costs no inference
    // about the target at all — the token came from us.
    expect(s.status).toBe("not-enumerated");
  });

  test("an unqualified key is a field, not a declaration", () => {
    const s = captureSurface([rejection(`{"error":{"flags":["--a","--b"]}}`)]);
    expect(s.status).toBe("not-enumerated");
  });

  test("an empty set declares nothing", () => {
    const s = captureSurface([rejection(`{"error":{"validFlags":[]}}`)]);
    // "Enumerated zero flags" is the one output this capture must never produce: it is
    // indistinguishable from a tool with no flags, and from a serializer that dropped the list.
    expect(s.status).toBe("not-enumerated");
    expect(s.flags).toBeUndefined();
  });

  test("a truncated capture, whose list may be short by an unknowable number of flags", () => {
    const s = captureSurface([rejection("valid flags: --a --b", { truncated: true })]);
    expect(s.status).toBe("no-evidence");
  });

  test("a hung, crashed or unspawnable probe establishes nothing", () => {
    for (const over of [{ timedOut: true }, { crashed: true }, { spawnFailed: true }]) {
      expect(captureSurface([rejection("valid flags: --a", over)]).status).toBe("no-evidence");
    }
  });

  test("help output, however marked, is never read", () => {
    const s = captureSurface([
      rejection("", {
        args: ["--help"],
        inertness: "help-path",
        stdout: "usage: t\n\nvalid flags: --a --b\n",
        exitCode: 0,
      }),
    ]);
    // A help screen is hand-maintained, and the whole argument for this capture is that a runtime
    // rejection is not. Reading one would put the drift straight back in.
    expect(s.status).toBe("no-evidence");
    expect(s.probesRead).toBe(0);
  });

  test("a probe carrying a verb would name a SUBCOMMAND's set, not the root's", () => {
    const s = captureSurface([
      rejection("valid flags: --a", { args: ["acc-probe-xyzzy-verb"], id: "verb" }),
    ]);
    expect(s.status).toBe("no-evidence");
  });

  test("everything after `--` is data, so that rejection is about a positional", () => {
    const s = captureSurface([
      rejection("valid flags: --a", { args: ["--", "--acc-probe-xyzzy-value"], id: "dd" }),
    ]);
    expect(s.status).toBe("no-evidence");
  });
});

describe("what the capture says about a target that did not enumerate", () => {
  test("`not-enumerated` carries its denominator and no flags field", () => {
    const s = captureSurface([rejection("error: unknown option '--x'"), rejection("nope", {})]);
    expect(s.status).toBe("not-enumerated");
    expect(s.probesRead).toBe(2);
    expect("flags" in s).toBe(false);
  });

  test("`no-evidence` is a different claim from `not-enumerated`", () => {
    // Nothing was read, so nothing about the target's error text was established. Collapsing the
    // two would make the capture unable to say whether it looked.
    expect(captureSurface([]).status).toBe("no-evidence");
  });

  test("the summary never reads as `accepts no flags`", () => {
    const text = surfaceSummary(captureSurface([rejection("error: unknown option '--x'")]));
    expect(text).toContain("did not enumerate");
    expect(text).toContain("NOT a tool with no flags");
  });

  test("the summary says WHERE it did not enumerate, and takes the where from the data", () => {
    // A verb-first CLI that enumerates richly one level down is indistinguishable, from one
    // path's evidence, from one that never enumerates at all. "did not enumerate" unqualified is
    // a claim about the tool made from evidence that covers one path.
    const text = surfaceSummary(captureSurface([rejection("error: unknown option '--x'")]));
    expect(text).toContain("did not enumerate at the root");
    expect(text).toContain("1 rejection read");
  });

  test("the scope is the PATH, and the literal `the only path probed` is gone", () => {
    // `diffDeclaration` reuses this sentence verbatim for every non-enumerated path, so the
    // literal printed "at the root — the only path probed" ABOUT `state` for the first caller who
    // recorded a `state` surface: a false scope claim, produced by the wording `SG-2` added to
    // stop one. The scope survives — the path is named — and the coverage claim moves to the
    // census header, where the set of paths is actually held.
    const s = captureSurface([rejection("error: unknown option '--x'")]);
    expect(surfaceSummary(s, ["state"])).toContain("did not enumerate at state");
    expect(surfaceSummary(s, ["state"])).not.toContain("root");
    expect(surfaceSummary(s)).not.toContain("the only path probed");
  });

  test("...and the enumerated sentence names the same scope, for the mirror reason", () => {
    // A path's list is not the tool's whole surface, and a reader must not be able to take it for
    // one. Both sentences come from `surfaceSummary`, so `acc check` and `acc compare` cannot
    // disagree about the scope either.
    const text = surfaceSummary(captureSurface([rejection("valid flags: --a")]));
    expect(text).toContain("enumerated 1 flag at the root: --a");
    expect(surfaceSummary(captureSurface([rejection("valid flags: --a")]), ["send"])).toContain(
      "enumerated 1 flag at send: --a",
    );
  });

  test("a report predating the capture says so rather than reading as silence", () => {
    expect(surfaceSummary(undefined)).toContain("not recorded");
  });
});

describe("the harm the truncation actually did, one level downstream", () => {
  // The lost flags were not merely missing from the report. `declaration.ts` diffs a declaration
  // against this set, so every flag the read dropped came back as `declared-not-accepted` — the
  // kit accusing a tool of publishing flags its own parser refuses, about flags it accepts. That
  // is the defect, and this is the assertion that holds the fix to it.
  const declaring = (names: string[]): Declaration => ({
    formatVersion: "0",
    provenance: "modelled",
    selfDescription: null,
    commands: [
      {
        path: [],
        args: names.map((name) => ({ name, type: "boolean" as const, status: "valid" as const })),
        positionals: [],
      },
    ],
  });

  test("a declaration of all four flags produces NO false `declared-not-accepted`", () => {
    const surface = captureSurface([
      rejection(
        `{"ok":false,"error":"Unknown option '--nope'. Valid flags: --help, -h, --version, -V"}`,
      ),
    ]);
    const d = diffDeclaration(declaring(["--help", "-h", "--version", "-V"]), [
      { path: [], surface, surfaceProvenance: "probed-by-kit" },
    ]);
    // Three of these were reported before the fix, on a target accepting all four.
    expect(d.findings.filter((f) => f.kind === "declared-not-accepted")).toEqual([]);
    // ...and the diff RAN — an empty finding list would otherwise be indistinguishable from a
    // comparison that never happened, which is the distinction `status` exists to draw.
    expect(d.status).toBe("checked");
    expect(d.findings).toEqual([]);
  });

  test("a declaration that names only the long spellings still reports the short ones", () => {
    const surface = captureSurface([rejection(`{"error":{"validFlags":["--help","-h"]}}`)]);
    const d = diffDeclaration(declaring(["--help"]), [
      { path: [], surface, surfaceProvenance: "probed-by-kit" },
    ]);
    // Not an alias the diff can quietly absorb: the document does not name `-h`, and a caller
    // holding only that document cannot reach it. Relating the two spellings would take an
    // aliasing model nothing in a rejection supports — see `flagsAfter`.
    expect(d.findings.map((f) => [f.kind, f.subject])).toEqual([["accepted-not-declared", "-h"]]);
  });
});

describe("disagreement between two rejections", () => {
  test("the sets are unioned and the disagreement is published", () => {
    const s = captureSurface([
      rejection(`{"error":{"validFlags":["--a"]}}`),
      rejection(`{"error":{"validFlags":["--b"]}}`, { args: ["--fomat"], inertness: "no-verb" }),
    ]);
    expect(s.flags).toEqual(["--a", "--b"]);
    expect(s.consistent).toBe(false);
    expect(surfaceSummary(s)).toContain("rejections disagreed");
  });
});

// The path end to end, against real processes. `CHECKERS` is passed whole rather than a subset so
// these run the same probes an ordinary `acc check` does — the capture reads what the checkers
// happened to record, and a test that hand-picked the probes would not be testing that.
describe("against real fixtures", () => {
  test("a target enumerating in prose inside a JSON error", async () => {
    const h = await record(
      {
        path: fixture("enumerates-flags-in-prose.ts"),
        argv0: ["bun", fixture("enumerates-flags-in-prose.ts")],
      },
      CHECKERS,
    );
    const s = captureSurface(h.observations);
    expect(s.status).toBe("enumerated");
    expect(s.flags).toEqual(["--format", "--verbose"]);
    expect(s.consistent).toBe(true);
  }, 60_000);

  test("a target whose enumeration mixes long flags with their short aliases", async () => {
    // The universal surface STANDARD.md recommends, in one list. The reference target has no short
    // aliases, so nothing in this tree exercised the mixed list until an outside implementer ran
    // the kit against a CLI that follows our own advice — and got three findings against flags
    // their tool accepts.
    const h = await record(
      {
        path: fixture("enumerates-long-and-short-flags.ts"),
        argv0: ["bun", fixture("enumerates-long-and-short-flags.ts")],
      },
      CHECKERS,
    );
    const s = captureSurface(h.observations);
    expect(s.status).toBe("enumerated");
    expect(s.flags).toEqual(["--format", "--help", "--version", "-V", "-h"]);
    expect(s.consistent).toBe(true);
  }, 60_000);

  test("a target enumerating in a field, whose `choices` names commands", async () => {
    const h = await record(
      {
        path: fixture("enumerates-flags-in-a-field.ts"),
        argv0: ["bun", fixture("enumerates-flags-in-a-field.ts")],
      },
      CHECKERS,
    );
    const s = captureSurface(h.observations);
    expect(s.flags).toEqual(["--dry-run", "--format"]);
    expect(s.evidence.every((e) => e.shape === "json-field")).toBe(true);
  }, 60_000);

  test("a target that talks about flags without naming any", async () => {
    const h = await record(
      {
        path: fixture("mentions-flags-without-enumerating.ts"),
        argv0: ["bun", fixture("mentions-flags-without-enumerating.ts")],
      },
      CHECKERS,
    );
    const s = captureSurface(h.observations);
    // Five separate traps in one error document, and the honest answer to all of them is silence.
    expect(s.status).toBe("not-enumerated");
    expect(s.probesRead).toBeGreaterThan(0);
  }, 60_000);

  test("`acc check` prints the capture, folding the repeated rejections", async () => {
    const acc = join(HERE, "..", "cli.ts");
    const run = spawnSync(
      "bun",
      [acc, "check", fixture("enumerates-flags-in-prose.ts"), "--format", "text"],
      { encoding: "utf8" },
    );
    expect(run.stdout).toContain("SELF-DECLARED FLAGS");
    expect(run.stdout).toContain("enumerated 2 flags at the root: --format --verbose");
    expect(run.stdout).toContain('prose-marker "Valid flags:" on stderr');
    // C3, D4 and F2 record the same unknown-flag argv several times over, so an unfolded list
    // shows one declaration as six and a reader counts six.
    expect(run.stdout).toContain("identical rejections");
  }, 120_000);

  test("...and says plainly when a target named nothing", async () => {
    const acc = join(HERE, "..", "cli.ts");
    const run = spawnSync(
      "bun",
      [acc, "check", fixture("mentions-flags-without-enumerating.ts"), "--format", "text"],
      { encoding: "utf8" },
    );
    expect(run.stdout).toContain("did not enumerate");
    expect(run.stdout).toContain("NOT a tool with no flags");
  }, 120_000);

  test("the kit's own reference implementation, which enumerates its COMMANDS", async () => {
    const acc = join(HERE, "..", "cli.ts");
    const h = await record({ path: acc, argv0: ["bun", acc] }, CHECKERS);
    // acc answers an unknown flag with `choices: [...command names]`. A capture that read the key
    // and not its members would publish a flag surface for acc made of `rules`, `show`, `check`.
    expect(captureSurface(h.observations).status).toBe("not-enumerated");
  }, 120_000);
});

/**
 * "NONE NAMED A SET" NEVER SAID WHICH SET, and a target that named a different one read as a
 * target that named nothing.
 *
 * Round 3's target emitted a `choices` array at 49 of 49 paths. The extractor rejected every one
 * of them — correctly, because their members are verbs rather than flags, and `acc`'s own
 * envelope carries exactly that shape — and the census then printed the same sentence it prints
 * for a target that said nothing at all. The adopter's delta had to rest on the recorded bytes
 * instead of on our line.
 *
 * THE EXTRACTOR IS NOT LOOSENED and no status changes. This is the same repair as D3's near-miss
 * clause: the report distinguishes "I looked and there was nothing" from "I looked, there was
 * something, and it is not the kind of thing this reads".
 */
describe("a list that is not a flag list", () => {
  /** A rejection whose stderr is the JSON document under test. */
  const json = (doc: unknown) => rejection(JSON.stringify(doc));

  test("a choices array of verbs is recorded as seen-and-rejected, not as silence", () => {
    const s = captureSurface([json({ error: { choices: ["rules", "show", "path"] } })]);
    // Unchanged: verbs are not a flag surface and must never be published as one.
    expect(s.status).toBe("not-enumerated");
    expect(s.flags).toBeUndefined();
    // New: the report can now say WHICH set it saw.
    expect(s.nonFlagCandidates?.map((c) => c.key)).toEqual(["choices"]);
    expect(s.nonFlagCandidates?.[0]?.sample).toEqual(["rules", "show", "path"]);
  });

  test("a target that named nothing still records nothing — the two stay distinguishable", () => {
    const s = captureSurface([json({ error: { message: "unknown flag" } })]);
    expect(s.status).toBe("not-enumerated");
    expect(s.nonFlagCandidates ?? []).toEqual([]);
  });

  test("a real flag list is not reported as a near miss", () => {
    const s = captureSurface([json({ error: { choices: ["--json", "--help"] } })]);
    expect(s.status).toBe("enumerated");
    expect(s.nonFlagCandidates ?? []).toEqual([]);
  });

  test("the sample is bounded — a pathological list cannot grow the report without limit", () => {
    const many = Array.from({ length: 200 }, (_, i) => `verb${i}`);
    const s = captureSurface([json({ error: { choices: many } })]);
    const sample = s.nonFlagCandidates?.[0]?.sample ?? [];
    expect(sample.length).toBeLessThanOrEqual(4);
    // And it says how many there were, since a truncated sample that hid the count would make a
    // 200-member list look like a 4-member one.
    expect(s.nonFlagCandidates?.[0]?.count).toBe(200);
  });

  test("the census line names the set it saw", () => {
    const s = captureSurface([json({ error: { choices: ["rules", "show"] } })]);
    const line = surfaceSummary(s, ["state"]);
    expect(line).toContain("set of flags");
    expect(line).toContain("choices");
    // The bytes that would have told the adopter immediately.
    expect(line).toContain("rules");
  });

  test("a silent target's line does not mention a set it never saw", () => {
    const line = surfaceSummary(captureSurface([json({ error: { message: "no" } })]), []);
    expect(line).toContain("set of flags");
    expect(line).not.toContain("choices");
  });
});

// THE ADVERTISED VERB SET — what the target says its commands are, and the difference against a
// caller's recorded paths, stated in both directions.
//
// The honesty case comes first here for the same reason it was built first: a parser that reads an
// empty advertised set turns every recorded path into a `recorded but never advertised` finding, so
// a false negative in the reader becomes a wall of false positives about somebody else's tool.
describe("the advertised verb set", () => {
  /** A bare invocation — one of the two root captures the blob may be read from. */
  const bare = (stderr: string, over: Partial<Observation> = {}): Observation =>
    rejection(stderr, { ...over, args: [], inertness: "bare" });

  /** The target's rejection of an unknown verb — the other root capture, and the precedence one. */
  const verbRejection = (stderr: string, over: Partial<Observation> = {}): Observation =>
    rejection(stderr, { ...over, args: ["acc-probe-xyzzy-verb"], inertness: "sentinel" });

  const compare = (observations: Observation[], recorded: string[] | null) =>
    compareAdvertisedVerbs(captureSurface(observations), recorded);

  describe("the honesty case — not-readable is NOT empty", () => {
    test("a help screen with no usage blob asserts nothing, and the comparison did not run", () => {
      // Measured shape: half a real fleet answers an unknown verb with a verb table at exit 0 and
      // no `usage:`-anchored bracket group anywhere. This is the MAIN render for them.
      const c = compare(
        [verbRejection("Commands:\n  open   open a file\n  state  print state\n")],
        ["open", "state", "tail"],
      );
      expect(c.status).toBe("not-asserted");
      expect(c.recordedNotAdvertised).toBeUndefined();
      const line = advertisedVerbsSummary(c).join("\n");
      expect(line).toContain("THE COMPARISON DID NOT RUN");
      expect(line).toContain("NOT a tool that advertises no verbs");
      expect(line).toContain("nothing was compared");
      // The three recorded paths must not appear as findings about the tool.
      expect(line).not.toContain("recorded but never advertised");
    });

    test("no root capture at all says so, and says it is not a statement about the tool", () => {
      const c = compare([rejection("valid flags: --a --b")], ["open"]);
      expect(c.status).toBe("not-asserted");
      expect(c.capturesRead).toBe(0);
      expect(advertisedVerbsSummary(c).join("\n")).toContain("not a statement about the tool");
    });

    test("a truncated root capture is not read — a blob cut mid-list is short by an unknown number", () => {
      const c = compare([verbRejection("usage: cli <open|state|tail>", { truncated: true })], null);
      expect(c.status).toBe("not-asserted");
      expect(c.capturesRead).toBe(0);
    });

    test("a hedged two-member blob renders as a hedge, never as silence", () => {
      const c = compare([verbRejection("usage: cli <name|id>")], ["open", "state"]);
      expect(c.status).toBe("not-asserted");
      const line = advertisedVerbsSummary(c).join("\n");
      expect(line).toContain("seen and not asserted");
      expect(line).toContain("<name|id>");
    });
  });

  describe("provenance — root captures only", () => {
    test("a --help body is never read, however well shaped its usage line is", () => {
      const help = rejection("usage: cli <open|state|tail>", {
        args: ["--help"],
        inertness: "help-path",
      });
      expect(compare([help], null).status).toBe("not-asserted");
    });

    test("an unknown-FLAG rejection is not one of the two either", () => {
      // Its `choices` array is a set the FLAG reader owns; reading it here would be one field
      // answering two different claims.
      const c = compare([rejection(`{"error":{"choices":["open","state","tail"]}}`)], null);
      expect(c.status).toBe("not-asserted");
    });

    test("the bare invocation is read, and so is the unknown-verb rejection", () => {
      expect(compare([bare("usage: cli <open|state|tail>")], null).status).toBe("no-batch");
      expect(compare([verbRejection("usage: cli <open|state|tail>")], null).status).toBe(
        "no-batch",
      );
    });
  });

  describe("the narrowing stack", () => {
    const verbs = (text: string) => compare([verbRejection(text)], null).quoted?.verbs;

    test("only a line anchored at `usage`", () => {
      expect(verbs("error: pick one of <open|state|tail>")).toBeUndefined();
      expect(verbs("usage: cli <open|state|tail>")).toEqual(["open", "state", "tail"]);
    });

    test("only the FIRST bracket group after the program token", () => {
      // `file` is the verb's ARGUMENT, and a reader that swallowed it would publish a verb the
      // target never named.
      expect(verbs("usage: cli <open|state|tail> <file>")).toEqual(["open", "state", "tail"]);
    });

    test("a program token in its own group is skipped rather than read as a verb", () => {
      expect(verbs("usage: <cli> <open|state|tail>")).toEqual(["open", "state", "tail"]);
    });

    test("at least one pipe — this is what kills <file>, <command> and <path>", () => {
      expect(verbs("usage: cli <file>")).toBeUndefined();
      expect(verbs("usage: cli <command>")).toBeUndefined();
      expect(verbs("usage: cli <path>")).toBeUndefined();
    });

    test("every member token-shaped, and one that is not refuses the WHOLE blob", () => {
      expect(verbs("usage: cli <FILE|DIR>")).toBeUndefined();
      expect(verbs("usage: cli <key=value|open>")).toBeUndefined();
    });

    test("<name|id> is refused on shape and needs recorded evidence to assert", () => {
      // Two members, and no lexical rule separates a type union from a two-verb tool.
      expect(compare([verbRejection("usage: cli <name|id>")], null).status).toBe("not-asserted");
      // A majority matching recorded paths is the last discriminator, and it CONFIRMS the blob
      // rather than constructing it: the members still come from the target's own bytes.
      const confirmed = compare([verbRejection("usage: cli <name|id>")], ["name", "id"]);
      expect(confirmed.status).toBe("compared");
      expect(confirmed.union).toEqual(["id", "name"]);
    });

    test("three or more members assert on shape alone, with no batch in hand", () => {
      // Nothing about a larger verb set may depend on how fresh the caller's batch is.
      expect(compare([verbRejection("usage: cli <open|state|tail>")], null).status).toBe(
        "no-batch",
      );
    });

    test("the ellipsis is an OPEN-SET MARKER, not a fifth verb", () => {
      const c = compare([verbRejection("usage: cli.ts <open|state|tail|…>")], ["open", "grow"]);
      expect(c.union).toEqual(["open", "state", "tail"]);
      expect(c.open).toBe(true);
      const line = advertisedVerbsSummary(c).join("\n");
      // The finding hedges rather than flatly accusing: the verb may live in the elided tail.
      expect(line).toContain("marks its list open");
      expect(line).toContain("elided tail");
      expect(line).not.toContain("…|");
    });

    test("the ascii spelling of the ellipsis is the same marker", () => {
      const c = compare([verbRejection("usage: cli <open|state|tail|...>")], null);
      expect(c.union).toEqual(["open", "state", "tail"]);
      expect(c.open).toBe(true);
    });

    test("the retrofitted shape — a choices array on the rejection", () => {
      const c = compare([verbRejection(`{"error":{"choices":["open","state","tail"]}}`)], null);
      expect(c.quoted?.shape).toBe("envelope-choices");
      expect(c.union).toEqual(["open", "state", "tail"]);
    });
  });

  describe("both directions, and neither is the same kind of statement", () => {
    test("recorded but never advertised — the defect direction", () => {
      const c = compare(
        [verbRejection("usage: cli <open|state|tail>")],
        ["open", "state", "tail", "grow"],
      );
      expect(c.recordedNotAdvertised).toEqual(["grow"]);
      expect(c.notCoveredByBatch).toEqual([]);
      expect(advertisedVerbsSummary(c).join("\n")).toContain("recorded but never advertised: grow");
    });

    test("advertised but never recorded is COVERAGE, and never reads as an accusation", () => {
      const c = compare([verbRejection("usage: cli <open|state|tail>")], ["open"]);
      expect(c.notCoveredByBatch).toEqual(["state", "tail"]);
      expect(c.recordedNotAdvertised).toEqual([]);
      const line = advertisedVerbsSummary(c).join("\n");
      expect(line).toContain("not covered by this batch: state tail");
      expect(line).not.toContain("missing");
    });
  });

  describe("the state model", () => {
    test("the defect direction tests the UNION, not the precedence winner alone", () => {
      // Help-shaped drift in miniature: the bare capture names four verbs, the rejection three.
      // Testing against the rejection's three alone manufactures a `recorded but never advertised`
      // finding for the fourth, out of our own choice of source.
      const c = compare(
        [
          verbRejection(`{"error":{"choices":["open","state","tail"]}}`),
          bare("usage: cli <open|state|tail|grow>"),
        ],
        ["open", "state", "tail", "grow"],
      );
      expect(c.union).toEqual(["grow", "open", "state", "tail"]);
      expect(c.recordedNotAdvertised).toEqual([]);
      // Precedence still decides whose words are QUOTED: the parser speaking, not the usage string.
      expect(c.quoted?.from).toBe("unknown-verb-rejection");
      expect(c.disagreement).toEqual(["grow"]);
      expect(advertisedVerbsSummary(c).join("\n")).toContain("disagree on: grow");
    });

    test("a hedged rejection beside an asserted bare capture quotes the bare capture", () => {
      const c = compare(
        [verbRejection("usage: cli <name|id>"), bare("usage: cli <open|state|tail>")],
        null,
      );
      expect(c.quoted?.from).toBe("bare-invocation");
      expect(c.union).toEqual(["open", "state", "tail"]);
      // And the hedge is still on the record rather than deleted.
      expect(c.hedged.map((s) => s.verbs)).toEqual([["name", "id"]]);
    });
  });

  test("the no-batch state is RENDERED, not omitted", () => {
    // Omitting the field when there is no batch makes a missing thing render as an absent thing.
    const c = compare([verbRejection("usage: cli <open|state|tail>")], null);
    expect(c.status).toBe("no-batch");
    const line = advertisedVerbsSummary(c).join("\n");
    expect(line).toContain("advertised set captured (3 verbs, usage-line shape");
    expect(line).toContain("no recorded surfaces in this run, so no comparison was made");
  });

  test("the bound — the full list is in the JSON, only the text line samples", () => {
    const many = Array.from({ length: 200 }, (_, i) => `verb${i}`);
    const c = compare([verbRejection(JSON.stringify({ error: { choices: many } }))], null);
    // The FULL list, because the action on a verb-set disagreement is "go add THESE", and a sample
    // plus a count means re-running the diff by hand.
    expect(c.union?.length).toBe(200);
    const line = advertisedVerbsSummary(c).join("\n");
    // The line is bounded, and it says how many there were, so a cut cannot pass for the whole.
    expect(line).toContain("(200 in all; the full list is in the JSON)");
    expect(line.split("\n")[0]?.length).toBeLessThan(600);
    // And the diagnostic field's own bound is untouched — this did not repurpose `SAMPLE`.
    expect(c.union?.length).toBeGreaterThan(4);
  });

  test("the fixture that advertises its verbs reaches the ASSERTED path end to end", async () => {
    // THE ONLY FIXTURE IN THIS REPO THAT DOES. Every other one renders THE COMPARISON DID NOT RUN,
    // which is correct for them and is the majority render on real targets — so without this the
    // feature's positive path would ship with unit coverage and no end-to-end evidence, which is
    // the defect class this project files against other people.
    const p = Bun.spawnSync(
      ["bun", "src/acc/cli.ts", "check", "src/acc/kit/fixtures/advertises-its-verbs.ts", "--json"],
      { stdout: "pipe", stderr: "pipe" },
    );
    const report = JSON.parse(new TextDecoder().decode(p.stdout)) as {
      data: { advertisedVerbs?: { status: string; quoted?: { verbs: string[]; shape: string } } };
    };
    const a = report.data.advertisedVerbs;
    expect(a?.status).toBe("no-batch");
    expect(a?.quoted?.verbs).toEqual(["open", "state", "tail"]);
    expect(a?.quoted?.shape).toBe("usage-line");
    // `<file>` is a SECOND bracket group on that usage line. Only the first contributes, and this is
    // the assertion that would fail if that rule were ever loosened.
    expect(a?.quoted?.verbs).not.toContain("file");
  });
});
