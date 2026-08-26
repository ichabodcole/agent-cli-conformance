import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

function sh(args: string[], cwd: string): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(args, { cwd, stdout: "pipe", stderr: "pipe" });
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
  const root = mkdtempSync(join(tmpdir(), "acc-harness-"));
  const workdir = nested ? join(root, "sub", "deep") : root;
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

  test("omits the identity key entirely when none was asked for", () => {
    const script = buildHarness({ ...BASE, paths: [["a"]], identityArgv: null });
    expect(script).not.toContain('"identity"');
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
      linkRoot = mkdtempSync(join(tmpdir(), "acc-link-")) + "-link";
      symlinkSync(root, linkRoot);
      cwd = nested ? join(linkRoot, "sub", "deep") : linkRoot;
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
