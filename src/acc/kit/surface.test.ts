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
import { captureSurface, surfaceSummary } from "./surface.ts";
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

  test("the summary says WHERE it did not enumerate, because root is all that was probed", () => {
    // The probes behind this are root-only, so a verb-first CLI that enumerates richly one level
    // down is indistinguishable here from one that never enumerates at all. "did not enumerate"
    // unqualified is a claim about the tool made from evidence that covers only its root.
    const text = surfaceSummary(captureSurface([rejection("error: unknown option '--x'")]));
    expect(text).toContain("did not enumerate at the root — the only path probed");
    expect(text).toContain("1 rejection read");
  });

  test("...and the enumerated sentence names the same scope, for the mirror reason", () => {
    // A root list is not the tool's whole surface, and a reader must not be able to take it for
    // one. Both sentences come from `surfaceSummary`, so `acc check` and `acc compare` cannot
    // disagree about the scope either.
    const text = surfaceSummary(captureSurface([rejection("valid flags: --a")]));
    expect(text).toContain("enumerated 1 flag at the root — the only path probed: --a");
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
      { path: [], surface },
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
    const d = diffDeclaration(declaring(["--help"]), [{ path: [], surface }]);
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
    expect(run.stdout).toContain(
      "enumerated 2 flags at the root — the only path probed: --format --verbose",
    );
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
