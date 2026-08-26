import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { buildHarness, HarnessError, shQuote, validatePaths, validateSentinel } from "./harness.ts";
import { parseRecordedBatch } from "./recorded.ts";

/**
 * THE SUITE GENERATES THE HARNESS; IT NEVER STORES A COPY.
 *
 * A stored expected-script is a recorded result that a template edit silently invalidates — two
 * artifacts, both accurate, nothing binding them. That is the same shape as help disagreeing with
 * a parser, which is the defect this whole project exists to report, and it is the shape that
 * produced a stale pass during this harness's own review. Every test below builds the script from
 * the current template and then runs it.
 *
 * AND IT RUNS FROM A SUBDIRECTORY AND THROUGH A SYMLINKED PATH. Three of the four defects found in
 * this script were invisible from a repository root on a physical path: the exclusion pathspec was
 * CWD-relative, the dirt check was CWD-scoped, and the path comparison mixed logical with physical.
 * A suite with one topology passes while inert. See
 * `docs/plans/2026-08-26-the-probe-plan-generator.md`.
 */

const BASE = {
  launcher: ["sh", "/bin/echo-nonexistent"],
  sentinel: "--acc-not-a-flag",
  identityArgv: null,
  pathSource: "declaration" as const,
  out: "batch.json",
};

/**
 * EVERY `GIT_*` VARIABLE IS STRIPPED, and that is not hygiene — it is the difference between this
 * file testing a throwaway repository and this file editing the real one.
 *
 * Git sets `GIT_DIR`, `GIT_INDEX_FILE` and `GIT_WORK_TREE` in the environment of a hook. This
 * suite runs inside `bun run check`, which runs from the pre-commit hook, so an inherited
 * environment points every `git` spawned below at the repository being committed to — whatever
 * `cwd` says. `git init` then reinitialises it, `git add -A` stages the fixture's files into its
 * index, and the harness under test reads its HEAD instead of the fixture's.
 *
 * That is not hypothetical. It put fixture filenames into this repository's index and left the
 * checkout unusable, and it was invisible when the suite was run directly because there is no hook
 * environment then — green standalone, destructive under the hook.
 */
const GIT_FREE_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")),
) as Record<string, string>;

function sh(args: string[], cwd: string): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(args, { cwd, stdout: "pipe", stderr: "pipe", env: GIT_FREE_ENV });
  return {
    code: p.exitCode,
    stdout: new TextDecoder().decode(p.stdout),
    stderr: new TextDecoder().decode(p.stderr),
  };
}

/** A throwaway repo holding a toy target that refuses whatever it is given.
 *
 *  THE TOY TARGET IS COMMITTED. An uncommitted one is a genuinely untracked file, so every run
 *  reports real dirt and the suite fails honestly and confusingly — which is exactly what happened
 *  to the adopter who first tried this. */
function makeRepo(nested: boolean): { root: string; workdir: string } {
  // THE PATH CONTAINS A SPACE, DELIBERATELY. The exclusion pathspecs are built as positional
  // arguments rather than joined into a string precisely so a repo path with a space survives —
  // and with every fixture coming from a bare `mkdtemp`, reverting that fix left the whole suite
  // green. The failure it guards is the silent direction: word-split pathspecs match nothing, so
  // the dirt check goes VACUOUS and real dirt stops being reported.
  const root = join(mkdtempSync(join(tmpdir(), "acc-harness-")), "a repo");
  mkdirSync(root, { recursive: true });
  const workdir = nested ? join(root, "sub dir", "deep") : root;
  mkdirSync(workdir, { recursive: true });
  writeFileSync(join(root, "tracked-root.txt"), "root\n");
  writeFileSync(
    join(workdir, "toy.sh"),
    `#!/bin/sh\nif [ "\${1:-}" = "--version" ]; then echo "toy 1.0.0"; exit 0; fi\necho "unknown option '$2'. valid flags: --alpha --beta" >&2\nexit 2\n`,
  );
  sh(["git", "init", "-q", "."], root);
  sh(["git", "add", "-A"], root);
  sh(["git", "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init"], root);
  return { root, workdir };
}

/** The `build …` field the harness stamped into `recordedBy`. */
function buildStringOf(batchJson: string): string {
  const batch = parseRecordedBatch("test", JSON.parse(batchJson));
  const by = batch.records[0]?.recordedBy ?? "";
  return (by.match(/build (\S+?),/) ?? [])[1] ?? "";
}

describe("shQuote", () => {
  test("makes shell metacharacters inert", () => {
    expect(shQuote("plain")).toBe("'plain'");
    expect(shQuote("a b")).toBe("'a b'");
    expect(shQuote("$HOME`x`")).toBe("'$HOME`x`'");
    // The quote is the only character that needs care: it closes the string and is reopened.
    expect(shQuote("it's")).toBe(`'it'\\''s'`);
  });
});

describe("validatePaths", () => {
  test("refuses the root, because the kit probes it and a root record gives one line two observers", () => {
    expect(() => validatePaths([[]])).toThrow(HarnessError);
    expect(() => validatePaths([[]])).toThrow(/probes the root itself/);
  });

  test("refuses a bare -- , after which every token is data rather than a flag", () => {
    expect(() => validatePaths([["--"]])).toThrow(/bare --/);
  });

  test("refuses a flag-shaped token in a path, which would ask a different question", () => {
    expect(() => validatePaths([["send", "--json"]])).toThrow(/flag-shaped/);
  });

  test("refuses an empty plan rather than emitting a harness that captures nothing", () => {
    expect(() => validatePaths([])).toThrow(/no command paths/);
  });

  test("accepts a multi-token path", () => {
    expect(() => validatePaths([["send", "note"]])).not.toThrow();
  });
});

describe("validateSentinel", () => {
  test("requires a flag shape, or the rejection is about a verb rather than about flags", () => {
    expect(() => validateSentinel("acc-not-a-flag")).toThrow(HarnessError);
    expect(() => validateSentinel("-1")).toThrow(HarnessError);
    expect(() => validateSentinel("--acc-not-a-flag")).not.toThrow();
    expect(() => validateSentinel("-x")).not.toThrow();
  });
});

describe("buildHarness — the emitted script", () => {
  test("defines the launcher as a FUNCTION, not an assignment", () => {
    // REGRESSION. `LAUNCHER='bun' '/abs/cli.ts'` parses as an environment assignment followed by a
    // COMMAND, so the shell executed the target at line one instead of defining anything.
    const script = buildHarness({ ...BASE, paths: [["a"]] });
    expect(script).toContain("run_target()");
    expect(script).not.toMatch(/^LAUNCHER=/m);
  });

  test("emits recordedAt as an unexpanded expression, never a value", () => {
    // A generator that pre-fills it writes the time the PLAN was made into a field meaning the
    // time the CAPTURE happened, and nothing in the batch can detect it afterwards.
    const script = buildHarness({ ...BASE, paths: [["a"]] });
    expect(script).toContain("date -u +%Y-%m-%dT%H:%M:%SZ");
    expect(script).not.toMatch(/"recordedAt": "\d{4}-/);
  });

  test("never puts the launcher into a recorded argv", () => {
    const script = buildHarness({
      ...BASE,
      launcher: ["bun", "/abs/cli.ts"],
      paths: [["state"]],
    });
    // The launcher appears once, in the function that invokes it — not in the PATHS block.
    const pathsBlock = script.slice(script.indexOf("ACC_PATHS_EOF"));
    expect(pathsBlock).not.toContain("/abs/cli.ts");
  });

  test("is valid POSIX sh", () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-shn-"));
    const file = join(dir, "capture.sh");
    writeFileSync(file, buildHarness({ ...BASE, paths: [["a"], ["b", "c"]] }));
    expect(sh(["sh", "-n", file], dir).code).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  test("asks for no identity by leaving the CONFIG value empty", () => {
    // The identity block is always EMITTED and gated at run time on `IDENTITY_ARGV`, so that an
    // adopter can turn it on by editing config rather than by writing shell. Asking the script
    // whether it mentions identity is therefore the wrong question; what matters is the value it
    // ships with, and what the run produces — asserted by running it further down this file.
    const script = buildHarness({ ...BASE, paths: [["a"]], identityArgv: null });
    expect(script).toContain('IDENTITY_ARGV=""');
  });

  test("names the path source in recordedBy, in prose nothing parses", () => {
    expect(buildHarness({ ...BASE, paths: [["a"]], pathSource: "declaration" })).toContain(
      "paths derived from the declaration",
    );
    expect(buildHarness({ ...BASE, paths: [["a"]], pathSource: "caller-supplied" })).toContain(
      "paths supplied by the caller",
    );
  });
});

describe("buildHarness — running it produces a batch the reader accepts", () => {
  test("captures every path, and the kit's own parser reads the result", () => {
    const { root, workdir } = makeRepo(false);
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", join(workdir, "toy.sh")],
        // A nested path, a token containing a space, and a token containing a quote — the three
        // shapes that a naive word-split or a string-joined argv silently corrupts.
        paths: [["state"], ["send", "note"], ["a b"], ["it's"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: ["--version"],
        pathSource: "declaration",
        out: "batch.json",
      }),
    );
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);

    const batch = parseRecordedBatch(
      "test",
      JSON.parse(readFileSync(join(workdir, "batch.json"), "utf8")),
    );
    expect(batch.records.length).toBe(4);
    expect(batch.records.map((r) => r.path)).toEqual([
      ["state"],
      ["send", "note"],
      ["a b"],
      ["it's"],
    ]);
    // `path` must be a prefix of `argv`; the reader enforces it, so a pass here is the reader
    // agreeing rather than this test restating the rule.
    for (const record of batch.records) {
      expect(record.argv.slice(0, record.path.length)).toEqual(record.path);
      expect(record.argv[record.argv.length - 1]).toBe("--acc-not-a-flag");
      // Derived, not attested — the harness redirects to files, so it can demonstrate both.
      expect(record.completeness).toBe("complete");
      expect(record.streams).toBe("separated");
    }
    // `path` is FORBIDDEN on the identity observation, and it is captured by default.
    expect(batch.identity?.argv).toEqual(["--version"]);
    rmSync(root, { recursive: true, force: true });
  });

  test("writes the batch in one move, so a partial capture leaves no short batch behind", () => {
    // The redirect this avoids truncates its target before the first capture runs. A failure
    // part-way would otherwise leave three paths of seventeen, every field true, nothing marking
    // the absence — the same defect as a `head` in the capture, arriving through the writer.
    const script = buildHarness({ ...BASE, paths: [["a"]] });
    expect(script).toContain('mv "$TMP/batch" "$OUT"');
    expect(script).not.toMatch(/\}\s*>\s*"\$OUT"/);
  });
});

describe("the -dirty flag, across the topologies that can falsify it", () => {
  // `-dirty` warns that uncommitted changes may be inside the measurement. The harness writes two
  // untracked files into the tree it measures, so an unfiltered check fires on every run forever —
  // and a flag that always fires carries no warning when a genuinely dirty tree needs it to.
  function run(nested: boolean, viaSymlink: boolean) {
    const { root, workdir } = makeRepo(nested);
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", join(workdir, "toy.sh")],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: null,
        pathSource: "declaration",
        out: "batch.json",
      }),
    );

    // THE SYMLINKED CASE HAS TO BE BUILT, NOT ASSUMED.
    //
    // Passing a logical path as a spawn `cwd` does NOT produce one: the runtime resolves it
    // before the child starts, so the child sees the physical path and the test is inert. An
    // earlier version of this file did exactly that and kept passing with the fix removed. The
    // divergence has to be created with a real symlink and entered by the SHELL, whose `cd`
    // preserves the logical path — and then asserted, so that an environment which cannot produce
    // the divergence fails here rather than passing vacuously.
    let cwd = workdir;
    let linkRoot: string | null = null;
    if (viaSymlink) {
      linkRoot = `${mkdtempSync(join(tmpdir(), "acc-link-"))}-link`;
      symlinkSync(root, linkRoot);
      // Derived from the fixture rather than restated: the two drifted apart the moment the
      // fixture path gained a space, and the divergence assertion below is what caught it.
      cwd = join(linkRoot, relative(root, workdir));
      const logical = sh(["sh", "-c", `cd '${cwd}' && pwd`], workdir).stdout.trim();
      const physical = sh(["sh", "-c", `cd '${cwd}' && pwd -P`], workdir).stdout.trim();
      expect(logical).not.toBe(physical);
    }

    const read = () => {
      // Entered with the shell's own `cd`, so `pwd` stays logical inside the harness.
      const r = sh(["sh", "-c", `cd '${cwd}' && sh capture.sh`], workdir);
      expect(r.code).toBe(0);
      return buildStringOf(readFileSync(join(workdir, "batch.json"), "utf8"));
    };
    const clean = read();
    writeFileSync(join(root, "tracked-root.txt"), "modified\n");
    const dirty = read();
    rmSync(root, { recursive: true, force: true });
    if (linkRoot) rmSync(linkRoot, { force: true });
    return { clean, dirty };
  }

  test("a clean tree is not reported dirty by the harness's own artifacts — at the root", () => {
    const { clean, dirty } = run(false, false);
    expect(clean).not.toContain("-dirty");
    expect(dirty).toContain("-dirty");
  });

  test("nor from a SUBDIRECTORY, where a CWD-relative pathspec excludes nothing", () => {
    // Under `:(exclude)` without `,top` the exclusion silently matched nothing here, and under a
    // `-- .` pathspec the dirt check never looked outside the subdirectory — so the
    // over-exclusion case below could not fail. A root-only suite cannot tell a working exclusion
    // from an inert one.
    const { clean, dirty } = run(true, false);
    expect(clean).not.toContain("-dirty");
    expect(dirty).toContain("-dirty");
  });

  test("nor through a SYMLINKED path, where the toplevel is physical and $0 is not", () => {
    const { clean, dirty } = run(true, true);
    expect(clean).not.toContain("-dirty");
    expect(dirty).toContain("-dirty");
  });

  test("real dirt is still reported — the exclusion is by path, not by basename", () => {
    // Excluding by name would drop a genuinely dirty file that merely shares one, which is a real
    // change silently missing from a provenance check.
    const { root, workdir } = makeRepo(true);
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", join(workdir, "toy.sh")],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: null,
        pathSource: "declaration",
        out: "batch.json",
      }),
    );
    mkdirSync(join(root, "elsewhere"), { recursive: true });
    writeFileSync(join(root, "elsewhere", "batch.json"), "{}\n");
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);
    const build = buildStringOf(readFileSync(join(workdir, "batch.json"), "utf8"));
    rmSync(root, { recursive: true, force: true });
    expect(build).toContain("-dirty");
  });
});

describe("the identity capture", () => {
  test("its argv actually reaches the record", () => {
    // REGRESSION, and it was live. Moving the identity call behind an `eval` lost the escaping on
    // its empty first argument, so the emitted line CONCATENATED instead of passing one — the
    // capture ran with no argv at all and recorded `argv: []` at exit 2. The script stayed valid
    // sh and the batch stayed valid JSON, so nothing but running it and reading the argv catches
    // this.
    const { root, workdir } = makeRepo(false);
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", join(workdir, "toy.sh")],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: ["--version"],
        pathSource: "declaration",
        out: "batch.json",
      }),
    );
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);
    const batch = parseRecordedBatch(
      "test",
      JSON.parse(readFileSync(join(workdir, "batch.json"), "utf8")),
    );
    rmSync(root, { recursive: true, force: true });
    expect(batch.identity?.argv).toEqual(["--version"]);
    expect(batch.identity?.exitCode).toBe(0);
    expect(batch.identity?.stdout).toContain("toy 1.0.0");
  });

  test("is exposed in the CONFIG block, above the line telling you not to edit the capture", () => {
    // An adopter whose tool names itself some other way has to be able to ask for that. The value
    // was baked in below the do-not-edit boundary, so the only way to change it was to edit the
    // part the header forbids editing.
    const script = buildHarness({ ...BASE, paths: [["a"]], identityArgv: ["--version"] });
    const config = script.indexOf("IDENTITY_ARGV=");
    const doNotEdit = script.indexOf("DO NOT EDIT THE CAPTURE");
    expect(config).toBeGreaterThan(doNotEdit);
    expect(script).toContain(`IDENTITY_ARGV="'--version'"`);
    // And it is readable rather than doubly-quoted: this value is edited by hand.
    expect(script).not.toContain(`IDENTITY_ARGV=''`);
  });

  test("emptying it in the emitted script skips the identity entirely", () => {
    const { root, workdir } = makeRepo(false);
    const script = buildHarness({
      launcher: ["sh", join(workdir, "toy.sh")],
      paths: [["state"]],
      sentinel: "--acc-not-a-flag",
      identityArgv: ["--version"],
      pathSource: "declaration",
      out: "batch.json",
    }).replace(/^IDENTITY_ARGV=.*$/m, 'IDENTITY_ARGV=""');
    writeFileSync(join(workdir, "capture.sh"), script);
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);
    const raw = JSON.parse(readFileSync(join(workdir, "batch.json"), "utf8"));
    rmSync(root, { recursive: true, force: true });
    expect(raw.identity).toBeUndefined();
    expect(parseRecordedBatch("test", raw).records.length).toBe(1);
  });
});

describe("files the workflow told the adopter to create", () => {
  test("are excluded from the dirt check, or -dirty fires on every documented run", () => {
    // Found on a cold run against a third tool. The harness excluded itself and its batch but not
    // the `--paths` file the instructions tell you to write, which lands untracked in the same
    // directory — so the documented workflow reported a dirty tree from a clean checkout, every
    // time. Same inversion as before, through an artifact created after the fix.
    const { root, workdir } = makeRepo(true);
    const pathsFile = join(workdir, "paths.json");
    writeFileSync(pathsFile, JSON.stringify([["state"]]));
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", join(workdir, "toy.sh")],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: null,
        pathSource: "caller-supplied",
        out: "batch.json",
        sourceFiles: [pathsFile],
      }),
    );
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);
    const build = buildStringOf(readFileSync(join(workdir, "batch.json"), "utf8"));
    rmSync(root, { recursive: true, force: true });
    expect(build).not.toContain("-dirty");
  });

  test("but an unexcluded file in the repo is still real dirt", () => {
    const { root, workdir } = makeRepo(true);
    writeFileSync(join(workdir, "paths.json"), JSON.stringify([["state"]]));
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", join(workdir, "toy.sh")],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: null,
        pathSource: "caller-supplied",
        out: "batch.json",
        // Deliberately NOT declared, so the exclusion cannot be a blanket one.
      }),
    );
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);
    const build = buildStringOf(readFileSync(join(workdir, "batch.json"), "utf8"));
    rmSync(root, { recursive: true, force: true });
    expect(build).toContain("-dirty");
  });
});

describe("the byte encoder", () => {
  test("round-trips a multi-byte rejection byte-exact", () => {
    // Covered only incidentally until now: two adopters' captures happened to carry an em dash,
    // but in the IDENTITY record rather than in a rejection, which is luck rather than coverage.
    // This target emits multi-byte bytes on the path the encoder actually exists for.
    const { root, workdir } = makeRepo(false);
    const target = join(workdir, "unicode.sh");
    writeFileSync(
      target,
      // THE BYTES ARE LITERAL, NOT ESCAPED. `\x` hex escapes are not POSIX printf: macOS `/bin/sh`
      // interprets them and dash — which is `/bin/sh` on most Linux — emits them as text. The
      // fixture therefore produced no multi-byte output on CI at all, so the encoder was never
      // asked the question this test exists to ask, and the round-trip assertion still passed
      // because both sides were equally wrong. `%s` takes the argument verbatim, so no shell on
      // any platform gets a say.
      `#!/bin/sh\nprintf '%s\\n' 'unknown option — try: --alpha … café 🔥' >&2\nexit 2\n`,
    );
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", target],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: null,
        pathSource: "declaration",
        out: "batch.json",
      }),
    );
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);
    const batch = parseRecordedBatch(
      "test",
      JSON.parse(readFileSync(join(workdir, "batch.json"), "utf8")),
    );
    // The live bytes, for comparison against what the harness recorded.
    const live = sh(["sh", target, "state", "--acc-not-a-flag"], workdir).stderr;
    rmSync(root, { recursive: true, force: true });
    const captured = batch.records[0]?.stderr ?? "";
    expect(captured).toBe(live);
    // 2-byte, 3-byte and 4-byte sequences all present, so a naive byte-at-a-time encoder that
    // mangled continuation bytes could not pass this.
    expect(captured).toContain("—");
    expect(captured).toContain("café");
    expect(captured).toContain("🔥");
    // ASSERT THE WIDTHS, not just the characters. The comment above claims 2-, 3- and 4-byte
    // sequences; without this the claim rests on the fixture actually having emitted them, which
    // is exactly what silently stopped being true on a platform whose `printf` differs.
    const widths = new Set(
      [...captured].map((c) => Buffer.byteLength(c, "utf8")).filter((n) => n > 1),
    );
    expect([...widths].sort()).toEqual([2, 3, 4]);
  });
});

describe("the harness fails loudly, or not at all", () => {
  test("a signalled target yields completeness unknown, not complete", () => {
    // The derivation's other branch. `_completeness="complete"` unconditionally passed the whole
    // suite, so the signal-detection half was asserted nowhere: a process killed mid-write may
    // have lost bytes, and `unknown` is the format's answer for a capture whose completeness
    // cannot be established.
    const { root, workdir } = makeRepo(false);
    const target = join(workdir, "suicide.sh");
    writeFileSync(target, `#!/bin/sh\nkill -TERM $$\n`);
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", target],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: null,
        pathSource: "declaration",
        out: "batch.json",
      }),
    );
    expect(sh(["sh", "capture.sh"], workdir).code).toBe(0);
    const batch = parseRecordedBatch(
      "test",
      JSON.parse(readFileSync(join(workdir, "batch.json"), "utf8")),
    );
    rmSync(root, { recursive: true, force: true });
    expect(batch.records[0]?.completeness).toBe("unknown");
    expect(batch.records[0]?.exitCode).toBeGreaterThanOrEqual(128);
  });

  test("an unwritable destination exits non-zero and writes nothing", () => {
    // The move was unchecked and the success line unconditional, so this printed mv's error,
    // announced "wrote batch.json", and exited 0 having written no batch — the silent no-op this
    // project reports in other people's tools, in the script it hands them.
    const { root, workdir } = makeRepo(true);
    writeFileSync(
      join(workdir, "capture.sh"),
      buildHarness({
        launcher: ["sh", join(workdir, "toy.sh")],
        paths: [["state"]],
        sentinel: "--acc-not-a-flag",
        identityArgv: null,
        pathSource: "declaration",
        out: "batch.json",
      }),
    );
    sh(["chmod", "555", workdir], workdir);
    const r = sh(["sh", "capture.sh"], workdir);
    sh(["chmod", "755", workdir], workdir);
    const wrote = existsSync(join(workdir, "batch.json"));
    rmSync(root, { recursive: true, force: true });
    expect(r.code).not.toBe(0);
    expect(wrote).toBe(false);
  });
});

describe("validatePaths refuses what the emitted script cannot represent", () => {
  test("a line break in a token, which the line-delimited path block would split", () => {
    // It reached the emitted script, split one path into two lines, failed the eval on an
    // unterminated quote, and still produced a file — one that is not JSON.
    expect(() => validatePaths([["multi\nline"]])).toThrow(/line break/);
    expect(() => validatePaths([["carriage\rreturn"]])).toThrow(/line break/);
  });
});
