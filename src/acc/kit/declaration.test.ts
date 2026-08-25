// The declared side, and the set difference against what the target says it accepts.
//
// Two halves, as in surface.test.ts. The synthetic cases are the adversarial ones — a target that
// never enumerated, a document from a major this reader does not know, a document that omits the
// verb producing it — because those are the shapes that manufacture a false agreement. The
// anthill block at the bottom is the ground truth: a real auto-generated manifest, translated
// mechanically, diffed against enumerations the drift trial recorded from the running binary.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Declaration,
  DeclarationError,
  declarationSummary,
  diffDeclaration,
  loadDeclaration,
  type PathSurface,
  parseDeclaration,
} from "./declaration.ts";
import type { Surface } from "./surface.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(HERE, "fixtures", name);
const declarationFixture = (name: string) => join(HERE, "fixtures", "declarations", name);

/** A minimal well-formed document. Overrides are shallow, which is all any case here needs. */
function declaration(over: Partial<Declaration> = {}): Declaration {
  return parseDeclaration("<test>", {
    formatVersion: "0",
    provenance: "modelled",
    selfDescription: null,
    commands: [{ path: [], args: [], positionals: [] }],
    ...over,
  });
}

/** A target that enumerated `flags` at the root, which is the only path the kit can reach. */
function enumerated(flags: string[]): Surface {
  return {
    status: "enumerated",
    flags: [...flags].sort(),
    consistent: true,
    evidence: [
      {
        observationId: "obs-1",
        args: ["--acc-probe-xyzzy-flag"],
        stream: "stderr",
        shape: "prose-marker",
        matched: "Valid flags:",
        flags,
      },
    ],
    probesRead: 1,
  };
}

const rootSurface = (flags: string[]): PathSurface[] => [{ path: [], surface: enumerated(flags) }];

describe("the format refuses what it does not fully understand", () => {
  test("an unknown major refuses the run rather than reading the fields it recognises", () => {
    expect(() =>
      parseDeclaration("<test>", {
        formatVersion: "1",
        provenance: "emitted",
        selfDescription: null,
        commands: [],
      }),
    ).toThrow(/not a major this reader understands/);
  });

  test("the version is checked BEFORE unknown keys, so a future document names the right defect", () => {
    // A document from a later major legitimately carries keys this reader has never heard of.
    // Reporting those instead of the version sends the author to fix the wrong thing.
    let message = "";
    try {
      parseDeclaration("<test>", {
        formatVersion: "2",
        provenance: "emitted",
        selfDescription: null,
        commands: [],
        effects: "read_only",
      });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/not a major/);
    expect(message).not.toMatch(/unknown key/);
  });

  test("an unrecognised key is an error, because it may be the one that bounds a probe", () => {
    expect(() =>
      parseDeclaration("<test>", {
        formatVersion: "0",
        provenance: "emitted",
        selfDescription: null,
        commands: [],
        probeMe: true,
      }),
    ).toThrow(/unknown key "probeMe"/);
  });

  test("provenance is required and has no default", () => {
    expect(() =>
      parseDeclaration("<test>", { formatVersion: "0", selfDescription: null, commands: [] }),
    ).toThrow(/provenance is required/);
  });

  test("selfDescription must be stated, and null is how a tool that emits none says so", () => {
    expect(() =>
      parseDeclaration("<test>", { formatVersion: "0", provenance: "modelled", commands: [] }),
    ).toThrow(/selfDescription is required/);
    expect(declaration({ selfDescription: null, commands: [] }).selfDescription).toBeNull();
  });

  test("an argument with no `status` is refused — the slot DT-2 exists for cannot be dropped", () => {
    expect(() =>
      parseDeclaration("<test>", {
        formatVersion: "0",
        provenance: "emitted",
        selfDescription: null,
        commands: [{ path: [], args: [{ name: "--team", type: "string" }], positionals: [] }],
      }),
    ).toThrow(/status must be "valid" or "refused"/);
  });

  test("an argument name without a leading dash is refused rather than repaired", () => {
    // Silently prefixing `--` is how a positional ends up in the argument container, which is
    // the whole of DT-3. The format has a container for positionals; the error names it.
    expect(() =>
      parseDeclaration("<test>", {
        formatVersion: "0",
        provenance: "emitted",
        selfDescription: null,
        commands: [
          {
            path: [],
            args: [{ name: "handle", type: "string", status: "valid" }],
            positionals: [],
          },
        ],
      }),
    ).toThrow(/positionals have their own container/);
  });

  test("two entries for one command path are refused — a duplicate makes one unreachable", () => {
    expect(() =>
      parseDeclaration("<test>", {
        formatVersion: "0",
        provenance: "emitted",
        selfDescription: null,
        commands: [
          { path: ["info"], args: [], positionals: [] },
          { path: ["info"], args: [], positionals: [] },
        ],
      }),
    ).toThrow(/two entries declare the command path info/);
  });

  test("a named file that does not exist is an error, never an empty declaration", () => {
    expect(() => loadDeclaration(join(HERE, "fixtures", "declarations", "nope.json"))).toThrow(
      DeclarationError,
    );
  });
});

describe("the set difference", () => {
  test("a declaration that agrees produces no findings, and says what it compared", () => {
    const d = diffDeclaration(
      declaration({
        commands: [
          {
            path: [],
            args: [{ name: "--format", type: "string", status: "valid" }],
            positionals: [],
          },
        ],
      }),
      rootSurface(["--format"]),
    );
    expect(d.status).toBe("checked");
    expect(d.findings).toEqual([]);
    expect(declarationSummary(d)).toBe(
      "1 of 1 declared command path compared; 0 disagreements (modelled declaration)",
    );
  });

  test("declared valid, not in the tool's own accepted set — DT-2's shape", () => {
    const d = diffDeclaration(
      declaration({
        commands: [
          {
            path: [],
            args: [
              { name: "--team", type: "string", status: "valid" },
              { name: "--format", type: "string", status: "valid" },
            ],
            positionals: [],
          },
        ],
      }),
      rootSurface(["--format"]),
    );
    expect(d.findings.map((f) => [f.kind, f.subject])).toEqual([
      ["declared-not-accepted", "--team"],
    ]);
  });

  test("accepted and never declared — DT-6's shape", () => {
    const d = diffDeclaration(
      declaration({ commands: [{ path: [], args: [], positionals: [] }] }),
      rootSurface(["--format"]),
    );
    expect(d.findings.map((f) => [f.kind, f.subject])).toEqual([
      ["accepted-not-declared", "--format"],
    ]);
  });

  test("declared refused while the parser advertises it as valid", () => {
    const d = diffDeclaration(
      declaration({
        commands: [
          {
            path: [],
            args: [{ name: "--team", type: "string", status: "refused" }],
            positionals: [],
          },
        ],
      }),
      rootSurface(["--team"]),
    );
    expect(d.findings.map((f) => f.kind)).toEqual(["refused-but-enumerated"]);
  });

  test("a declared positional is not expected in the flag set, so its absence is no finding", () => {
    // The container doing its job: this is the same declaration as DT-3's, written the way the
    // format asks for, and it produces nothing.
    const d = diffDeclaration(
      declaration({
        commands: [
          {
            path: [],
            args: [{ name: "--format", type: "string", status: "valid" }],
            positionals: [{ name: "handle", required: true }],
          },
        ],
      }),
      rootSurface(["--format"]),
    );
    expect(d.findings).toEqual([]);
  });

  test("a path with evidence and no declaration is diffed as declaring nothing", () => {
    // DT-1: anthill's manifest has no slot for root flags at all, so the root is absent from the
    // document rather than present and empty. Skipping it would hide the one flag the root takes.
    const d = diffDeclaration(
      declaration({ commands: [{ path: ["info"], args: [], positionals: [] }] }),
      rootSurface(["--format"]),
    );
    expect(d.findings.map((f) => [f.kind, f.subject])).toEqual([
      ["accepted-not-declared", "--format"],
    ]);
    expect(d.checkedCommands).toBe(1);
    expect(d.declaredCommands).toBe(1);
  });

  test("a path the kit cannot reach is reported as not compared, with the kit as the reason", () => {
    const d = diffDeclaration(
      declaration({
        commands: [
          { path: [], args: [], positionals: [] },
          {
            path: ["info", "show"],
            args: [{ name: "--team", type: "string", status: "valid" }],
            positionals: [],
          },
        ],
      }),
      rootSurface([]),
    );
    const nested = d.paths.find((p) => p.path.join(" ") === "info show");
    expect(nested?.checked).toBe(false);
    expect(nested?.reason).toMatch(/the kit probes the root only/);
    // And the flag it declares produced NO finding, because nothing looked at it.
    expect(d.findings.filter((f) => f.subject === "--team")).toEqual([]);
  });
});

describe("the honesty case: a target that did not enumerate", () => {
  const silent: Surface = {
    status: "not-enumerated",
    evidence: [],
    probesRead: 4,
  };

  test("the diff did not run, and an empty finding list is not agreement", () => {
    const d = diffDeclaration(
      declaration({
        commands: [
          {
            path: [],
            args: [{ name: "--nonsense", type: "boolean", status: "valid" }],
            positionals: [],
          },
        ],
      }),
      [{ path: [], surface: silent }],
    );
    expect(d.status).toBe("not-checked");
    expect(d.checkedCommands).toBe(0);
    expect(d.findings).toEqual([]);
    const line = declarationSummary(d);
    expect(line).toMatch(/THE DIFF DID NOT RUN/);
    expect(line).toMatch(/not agreement/);
    // The reason is the surface capture's own sentence, so the two blocks in the report cannot
    // describe one target's silence in two different ways.
    expect(d.reason).toMatch(/did not enumerate/);
  });

  test("a modelling caller is told that no edit to their own file makes this checkable", () => {
    // The reasons name the KIT'S limits and the TARGET'S silence, both correctly. What a modelling
    // caller could not infer from either is that the remedy is not theirs to apply.
    const d = diffDeclaration(
      declaration({
        provenance: "modelled",
        commands: [{ path: ["info"], args: [], positionals: [] }],
      }),
      [{ path: [], surface: silent }],
    );
    const line = declarationSummary(d);
    expect(line).toMatch(/nothing you can write in this file changes this/);
    expect(line).toMatch(/when the target enumerates at the root, or when the kit probes below it/);
  });

  test("an emitted declaration's author is pointed at the tool, which is theirs to change", () => {
    const d = diffDeclaration(
      declaration({
        provenance: "emitted",
        commands: [{ path: ["info"], args: [], positionals: [] }],
      }),
      [{ path: [], surface: silent }],
    );
    const line = declarationSummary(d);
    expect(line).toMatch(/have the target's rejections enumerate the flags it accepts/);
    // And NOT the modelling caller's sentence, which would tell a tool author to give up.
    expect(line).not.toMatch(/nothing you can write in this file/);
  });

  test("no evidence at all is distinguished from a tool that said nothing", () => {
    const d = diffDeclaration(declaration(), [
      { path: [], surface: { status: "no-evidence", evidence: [], probesRead: 0 } },
    ]);
    expect(d.status).toBe("not-checked");
    expect(d.reason).toMatch(/nothing readable was recorded/);
  });

  test("the zero-probe check still fires, and the summary counts it", () => {
    const d = diffDeclaration(
      declaration({
        selfDescription: { args: ["help", "--json"] },
        commands: [{ path: ["info"], args: [], positionals: [] }],
      }),
      [{ path: [], surface: silent }],
    );
    expect(d.status).toBe("not-checked");
    expect(d.findings.map((f) => f.kind)).toEqual(["self-description-not-declared"]);
    expect(declarationSummary(d)).toMatch(/1 disagreement found without probing/);
  });
});

describe("provenance decides what a disagreement means", () => {
  const disagreeing = (provenance: "emitted" | "modelled") =>
    diffDeclaration(
      declaration({
        provenance,
        commands: [
          {
            path: [],
            args: [{ name: "--team", type: "string", status: "valid" }],
            positionals: [],
          },
        ],
      }),
      rootSurface(["--format"]),
    );

  test("an emitted document puts the tool's self-contradiction first", () => {
    const [first, second] = disagreeing("emitted").findings[0]?.readings ?? ["", ""];
    expect(first).toMatch(/one process, both statements/);
    expect(second).toMatch(/the declaration claims/);
  });

  test("a modelled document puts the model's error first — and never drops the other reading", () => {
    const [first, second] = disagreeing("modelled").findings[0]?.readings ?? ["", ""];
    expect(first).toMatch(/the declaration claims/);
    expect(second).toMatch(/one process, both statements/);
  });

  test("both readings are always present, whichever way round", () => {
    for (const p of ["emitted", "modelled"] as const) {
      for (const f of disagreeing(p).findings) {
        expect(f.readings).toHaveLength(2);
        expect(f.readings[0]).not.toBe(f.readings[1]);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
// GROUND TRUTH — anthill v2.3.0, the subject of the first drift trial.
//
// `fixtures/declarations/anthill-2.3.0-manifest.json` is the manifest `anthill help --json`
// emits, re-encoded into this format by one mechanical rule: **every member of a command's
// `flags` array becomes an argument**. That is the reading the container asks for, the reading
// `anthill <cmd> --help --format json` hands an agent verbatim, and the reading the trial says a
// consumer takes — "a consumer that reads flags[] as 'the flags', which is what the field is
// called". Nothing was added, and `status` is `valid` on every argument because the source
// manifest has no slot in which to say otherwise, which is DT-2's mechanism exactly.
//
// The sibling `-positionals-split` document is the same manifest under the OTHER available
// reading: members carrying `type: "positional"` go to the positionals container. One manifest,
// two defensible readings, opposite consequences for seven commands — which is DT-3 stated as a
// pair of documents rather than as prose.
//
// The enumerations below came from the running binary — the eight in DT-2 quoted from the trial
// report and re-measured against v2.3.0 on 2026-08-24 (they matched exactly), the seven in DT-3
// measured, because the trial named five of those commands without recording their valid sets.
// One sentinel flag per command, which is the parse-time rejection the trial established as
// inert. Nothing in THIS BLOCK spawns anything; the recorded sets are data.
// ---------------------------------------------------------------------------------------------
describe("anthill v2.3.0 against its own manifest", () => {
  const manifest = () => loadDeclaration(declarationFixture("anthill-2.3.0-manifest.json"));
  const split = () =>
    loadDeclaration(declarationFixture("anthill-2.3.0-manifest-positionals-split.json"));

  test("the fixture is the whole manifest, and it declares no root", () => {
    const d = manifest();
    expect(d.commands).toHaveLength(25);
    expect(d.commands.some((c) => c.path.length === 0)).toBe(false);
  });

  test("DT-6 at the root: --format is accepted and the manifest cannot mention it", () => {
    // `anthill --nope` → "Unknown option '--nope'. Valid flags: --format", reproduced live.
    const d = diffDeclaration(manifest(), rootSurface(["--format"]));
    expect(d.findings.filter((f) => f.kind === "accepted-not-declared")).toEqual([
      expect.objectContaining({ subject: "--format", path: [] }),
    ]);
  });

  test("DT-6's headline, with no probe: the manifest omits `help`, the verb that emits it", () => {
    const d = diffDeclaration(manifest(), rootSurface(["--format"]));
    const self = d.findings.filter((f) => f.kind === "self-description-not-declared");
    expect(self.map((f) => f.subject)).toEqual(["help"]);
  });

  test("the honest denominator: 1 of 25 paths compared, and the other 24 say why", () => {
    const d = diffDeclaration(manifest(), rootSurface(["--format"]));
    expect(d.declaredCommands).toBe(25);
    // 26 results: the 25 declared paths, plus the root, which the manifest has no entry for.
    expect(d.paths).toHaveLength(26);
    expect(d.checkedCommands).toBe(1);
    expect(declarationSummary(d)).toMatch(/1 of 25 declared command paths compared/);
  });

  test("DT-2: eight refused flags, each published as valid and absent from the accepted set", () => {
    // The trial's full census — command, the flag the manifest publishes, and the valid set the
    // tool's own parser names when it rejects an unknown flag there. Re-measured before being
    // written down here, and identical to the report's table on all eight rows.
    const census: Array<[path: string[], refused: string, accepted: string[]]> = [
      [["info", "show"], "--team", ["--format"]],
      [["info", "env"], "--team", ["--file", "--format", "--show-values"]],
      [["comms", "read"], "--as", ["--channel", "--format", "--id", "--last", "--since", "--team"]],
      [["comms", "positions"], "--as", ["--channel", "--format", "--team"]],
      [["scan"], "--team", ["--format", "--root"]],
      [["feedback"], "--team", ["--category", "--format", "--skill", "--submit"]],
      [["field-notes"], "--team", ["--format"]],
      [["migrate"], "--team", ["--dry-run", "--format", "--keep-paths"]],
    ];
    const evidence: PathSurface[] = census.map(([path, , accepted]) => ({
      path,
      surface: enumerated(accepted),
    }));
    const d = diffDeclaration(manifest(), evidence);
    const reported = d.findings
      .filter((f) => f.kind === "declared-not-accepted")
      .map((f) => `${f.path.join(" ")} ${f.subject}`);
    // Every one of the eight, at its own command — and NINE lines, because `feedback` also
    // publishes the positional `message` inside the same container. DT-2 and DT-3 land on one
    // command, which is what a set difference sees and a reader of the manifest cannot.
    expect(reported).toEqual([
      "info show --team",
      "info env --team",
      "comms read --as",
      "comms positions --as",
      "scan --team",
      "feedback --message",
      "feedback --team",
      "field-notes --team",
      "migrate --team",
    ]);
    expect(
      census.every(([path, refused]) => reported.includes(`${path.join(" ")} ${refused}`)),
    ).toBe(true);
    expect(d.checkedCommands).toBe(8);
  });

  test("DT-3: all seven positionals spelled as flags, every one absent from the accepted set", () => {
    // All seven, not the five the trial quotes — the other two were named without their valid
    // sets there, so the sets below were MEASURED rather than transcribed: one sentinel flag per
    // command against anthill v2.3.0, 2026-08-24, the same parse-time rejection the trial
    // established as inert. The eight DT-2 sets above were re-measured the same way and matched
    // the trial's census exactly, which is what licenses reading these seven off the same probe.
    const census: Array<[path: string[], asFlag: string, accepted: string[]]> = [
      [["join"], "--handle", ["--channel", "--format", "--team"]],
      [
        ["comms", "send"],
        "--text",
        ["--anyway", "--as", "--as-of", "--channel", "--dry-run", "--format", "--stdin", "--team"],
      ],
      [["comms", "follow"], "--channel", ["--as", "--format", "--team"]],
      [["spawn"], "--handles", ["--attach", "--cwd", "--force", "--format", "--session", "--team"]],
      [["team", "use"], "--name", ["--force", "--format"]],
      [["commit"], "--paths", ["--as", "--file", "--format", "--message", "--stdin", "--team"]],
      [["feedback"], "--message", ["--category", "--format", "--skill", "--submit"]],
    ];
    const evidence: PathSurface[] = census.map(([path, , accepted]) => ({
      path,
      surface: enumerated(accepted),
    }));
    const d = diffDeclaration(manifest(), evidence);
    for (const [path, asFlag] of census) {
      expect(
        d.findings.some(
          (f) =>
            f.kind === "declared-not-accepted" &&
            f.subject === asFlag &&
            f.path.join(" ") === path.join(" "),
        ),
      ).toBe(true);
    }
    expect(d.checkedCommands).toBe(7);
    // `comms follow --channel` is the row that shows why the CONTAINER is the finding rather
    // than the spelling: `--channel` is a real flag on `comms send` and a positional on `comms
    // follow`, so no rule about the name could separate them.
    expect(
      d.findings.some((f) => f.subject === "--channel" && f.path.join(" ") === "comms send"),
    ).toBe(false);
  });

  test("DT-3 stated as the pair: the other reading of the same manifest reports none of them", () => {
    // THE CONTAINER IS THE FIX. Read by `type` instead of by container, the same seven entries
    // land in `positionals`, and a positional is never expected in a flag set — so every DT-3
    // finding disappears while every other finding stays. That difference is the disagreement:
    // one document, two readings, and nothing in the source saying which one a consumer owes.
    const accepted = rootSurfaceFor(["join"], ["--channel", "--format", "--team"]);
    const asFlags = diffDeclaration(manifest(), accepted);
    const asPositionals = diffDeclaration(split(), accepted);
    expect(
      asFlags.findings.some((f) => f.subject === "--handle" && f.kind === "declared-not-accepted"),
    ).toBe(true);
    expect(asPositionals.findings.some((f) => f.subject === "--handle")).toBe(false);
  });
});

/** Evidence for one non-root command path. Named apart from `rootSurface` so a reader cannot
 *  mistake a per-command enumeration for something the kit produced. */
function rootSurfaceFor(path: string[], flags: string[]): PathSurface[] {
  return [{ path, surface: enumerated(flags) }];
}

describe("the fixture declarations parse", () => {
  test("every shipped declaration is valid under the reader that reads it", () => {
    for (const name of [
      "anthill-2.3.0-manifest.json",
      "anthill-2.3.0-manifest-positionals-split.json",
    ]) {
      const raw: unknown = JSON.parse(readFileSync(declarationFixture(name), "utf8"));
      expect(() => parseDeclaration(name, raw)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------------------------
// END TO END, against a real process. A reader that has only ever met hand-built objects is a
// reader nobody has run: these spawn `acc check --declaration` against fixtures whose parsers
// really do — and really do not — name their accepted set.
// ---------------------------------------------------------------------------------------------
describe("acc check --declaration, against a program", () => {
  const acc = join(HERE, "..", "cli.ts");
  const tmp = mkdtempSync(join(tmpdir(), "acc-declaration-"));

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  /** Write a declaration to disk and return its path. Written raw rather than through the
   *  parser, so a malformed document can be handed to the CLI exactly as an author would. */
  const write = (name: string, body: unknown): string => {
    const path = join(tmp, name);
    writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`);
    return path;
  };

  const rootDeclaration = (args: unknown[]) => ({
    formatVersion: "0",
    provenance: "modelled",
    selfDescription: null,
    commands: [{ path: [], args, positionals: [] }],
  });

  test("a declaration that agrees with the target reports a comparison and no disagreement", () => {
    const path = write(
      "agrees.json",
      rootDeclaration([
        { name: "--format", type: "string", status: "valid" },
        { name: "--verbose", type: "boolean", status: "valid" },
      ]),
    );
    const run = spawnSync(
      "bun",
      [
        acc,
        "check",
        fixture("enumerates-flags-in-prose.ts"),
        "--declaration",
        path,
        "--format",
        "text",
      ],
      { encoding: "utf8" },
    );
    expect(run.stdout).toContain("DECLARED vs ACCEPTED");
    expect(run.stdout).toContain("1 of 1 declared command path compared; 0 disagreements");
  }, 120_000);

  test("a declaration that disagrees in both directions names both, and both readings", () => {
    const path = write(
      "disagrees.json",
      rootDeclaration([
        { name: "--format", type: "string", status: "valid" },
        // Declared valid, and the fixture's parser does not list it.
        { name: "--team", type: "string", status: "valid" },
        // Declared refused, and the fixture's parser advertises it.
        { name: "--verbose", type: "boolean", status: "refused" },
      ]),
    );
    const run = spawnSync(
      "bun",
      [
        acc,
        "check",
        fixture("enumerates-flags-in-prose.ts"),
        "--declaration",
        path,
        "--format",
        "text",
      ],
      { encoding: "utf8" },
    );
    expect(run.stdout).toContain("declared-not-accepted  --team");
    expect(run.stdout).toContain("refused-but-enumerated  --verbose");
    expect(run.stdout).toContain("      either ");
    expect(run.stdout).toContain("      or     ");
    // Not a rule: the verdict line must be untouched by anything in that block.
    expect(run.stdout).toContain("Evidence, not a rule");
  }, 120_000);

  // -------------------------------------------------------------------------------------------
  // THE HEADLINE. The census is evidence and never a verdict — and a report whose headline says
  // nothing at all about a disagreement is how four deliberately broken variants of one tool all
  // printed `CONFORMANT (L0)` on the line most readers stop at. The clause below is a POINTER
  // into the block; the guard that matters is that it moves no number and no exit code.
  // -------------------------------------------------------------------------------------------
  const enumerating = fixture("enumerates-flags-in-prose.ts");
  const runCheck = (args: string[]) =>
    spawnSync("bun", [acc, "check", enumerating, "--format", "text", ...args], {
      encoding: "utf8",
    });
  const disagreeingArgs = [
    { name: "--format", type: "string", status: "valid" },
    { name: "--team", type: "string", status: "valid" },
    { name: "--verbose", type: "boolean", status: "refused" },
  ];

  test("a modelled disagreement is named on the headline as a disagreement", () => {
    const path = write("headline-modelled.json", rootDeclaration(disagreeingArgs));
    const headline = runCheck(["--declaration", path]).stdout.split("\n")[0] ?? "";
    expect(headline).toMatch(/but see 2 declaration disagreements \(modelled\)/);
  }, 120_000);

  test("an emitted disagreement is named as a self-contradiction — one process, both statements", () => {
    const path = write("headline-emitted.json", {
      ...rootDeclaration(disagreeingArgs),
      provenance: "emitted",
    });
    const headline = runCheck(["--declaration", path]).stdout.split("\n")[0] ?? "";
    expect(headline).toMatch(/but see 2 declaration self-contradictions \(emitted\)/);
  }, 120_000);

  test("THE GUARD: the counts, the verdict and the EXIT CODE are what they were without one", () => {
    const path = write("headline-guard.json", rootDeclaration(disagreeingArgs));
    const without = runCheck([]);
    const withDeclaration = runCheck(["--declaration", path]);
    // Same exit code, and it is the one signal a harness that never parses stdout still sees.
    expect(withDeclaration.status).toBe(without.status);
    // Same headline, up to the clause that was added — verdict, level and every count identical.
    const head = (out: string) => out.split("\n")[0] ?? "";
    expect(head(withDeclaration.stdout).replace(/ · but see [^·]*?\(modelled\)/, "")).toBe(
      head(without.stdout),
    );
    // And the summary line, which carries `unverified` across every tier, is untouched.
    const summary = (out: string) => out.split("\n").find((l) => l.startsWith("  core ")) ?? "";
    expect(summary(withDeclaration.stdout)).toBe(summary(without.stdout));
  }, 240_000);

  test("a clean declaration adds nothing to the headline", () => {
    const path = write(
      "headline-clean.json",
      rootDeclaration([
        { name: "--format", type: "string", status: "valid" },
        { name: "--verbose", type: "boolean", status: "valid" },
      ]),
    );
    expect(runCheck(["--declaration", path]).stdout.split("\n")[0] ?? "").not.toContain("but see");
  }, 120_000);

  test("THE HONESTY CASE: a target that never enumerated says the diff did not run", () => {
    const path = write(
      "against-a-silent-target.json",
      rootDeclaration([{ name: "--nonsense", type: "boolean", status: "valid" }]),
    );
    const run = spawnSync(
      "bun",
      [
        acc,
        "check",
        fixture("mentions-flags-without-enumerating.ts"),
        "--declaration",
        path,
        "--format",
        "text",
      ],
      { encoding: "utf8" },
    );
    expect(run.stdout).toContain("THE DIFF DID NOT RUN");
    expect(run.stdout).toContain("this is not agreement: nothing was compared");
    // The flag the declaration got wrong is NOT reported, because nothing looked at it — and
    // "0 disagreements" never appears, which is the sentence this case exists to prevent.
    expect(run.stdout).not.toContain("--nonsense");
    expect(run.stdout).not.toContain("0 disagreements");
  }, 120_000);

  test("an unknown format major refuses the run before the target is executed", () => {
    const path = write("future.json", { ...rootDeclaration([]), formatVersion: "9" });
    const run = spawnSync(
      "bun",
      [acc, "check", fixture("enumerates-flags-in-prose.ts"), "--declaration", path, "--json"],
      { encoding: "utf8" },
    );
    expect(run.status).not.toBe(0);
    // The error envelope leaves on stderr, where B1 puts everything that is not data.
    const body = JSON.parse(run.stderr) as { ok: boolean; error: { message: string } };
    expect(body.ok).toBe(false);
    expect(body.error.message).toMatch(/not a major this reader understands/);
    // No report at all: a document this reader cannot read must not license eighteen spawns of
    // a stranger's binary and a verdict derived from fields it half-understood.
    expect(run.stdout).toBe("");
  }, 120_000);

  test("no declaration means no block, not an empty one", () => {
    const run = spawnSync(
      "bun",
      [acc, "check", fixture("enumerates-flags-in-prose.ts"), "--format", "text"],
      { encoding: "utf8" },
    );
    expect(run.stdout).toContain("SELF-DECLARED FLAGS");
    expect(run.stdout).not.toContain("DECLARED vs ACCEPTED");
  }, 120_000);
});
