import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * `acc probe-plan` AT THE COMMAND BOUNDARY — the half `harness.test.ts` does not reach.
 *
 * That file tests the script this command emits. This one tests the command: which invocations it
 * refuses, and with which error kind. The two matter separately because `acc` is the positive
 * control for its own standard, and `exit-codes.ts` states the obligation plainly — a declared
 * error kind that nothing provokes is a promise no run has kept. `conflict` and `permission` are
 * both new here and both reachable only through this command, so before this file existed the
 * catalogue had grown two codes that no test had ever seen produced.
 */

const CLI = join(dirname(import.meta.dir), "cli.ts");
const CONFORMING = join(dirname(import.meta.dir), "kit/fixtures/conforming.ts");

function acc(args: string[], cwd?: string): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(["bun", CLI, ...args], {
    cwd: cwd ?? dirname(dirname(import.meta.dir)),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ACC_FORMAT: "json" },
  });
  return {
    code: p.exitCode,
    stdout: new TextDecoder().decode(p.stdout),
    stderr: new TextDecoder().decode(p.stderr),
  };
}

/** The error envelope a failed run puts on STDERR — where a rejection belongs (rule B1), and not
 *  where this helper first looked for it. */
function errorOf(r: { stderr: string }): { kind: string; exit_code: number; message: string } {
  return JSON.parse(r.stderr).error;
}

function scratch(): string {
  return mkdtempSync(join(tmpdir(), "acc-probe-plan-"));
}

describe("choosing a source of command paths", () => {
  test("neither source is a usage error, because there is no third source to fall back on", () => {
    // Guessing paths out of help text is refused outright rather than attempted: discovery's verb
    // extraction is a heuristic tuned for the root, and a wrong path list produces records at
    // paths that do not exist.
    const r = acc(["probe-plan", CONFORMING]);
    expect(r.code).toBe(2);
    expect(errorOf(r).kind).toBe("usage");
  });

  test("both sources is a usage error rather than one silently winning", () => {
    const dir = scratch();
    writeFileSync(join(dir, "p.json"), JSON.stringify([["state"]]));
    const r = acc([
      "probe-plan",
      CONFORMING,
      "--paths",
      join(dir, "p.json"),
      "--declaration",
      join(dir, "p.json"),
    ]);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(2);
    expect(errorOf(r).kind).toBe("usage");
  });

  test("a missing file answers not_found whichever flag named it", () => {
    // The same mistake used to answer differently depending on the flag — `--paths` said
    // not_found and `--declaration` said usage — which also made this command's own declared
    // error list false, and a declaration that disagrees with the code is the worse half.
    for (const flag of ["--paths", "--declaration"]) {
      const r = acc(["probe-plan", CONFORMING, flag, "/nonexistent/missing.json"]);
      expect({ flag, code: r.code, kind: errorOf(r).kind }).toEqual({
        flag,
        code: 5,
        kind: "not_found",
      });
    }
  });

  test("a declaration's root entry is dropped rather than refused", () => {
    // The kit probes the root itself on every run, so a batch carrying a root record would give
    // one census line two observers — and the reader refuses the whole batch for it. A
    // declaration normally declares the root, so silently omitting the one path the caller could
    // not have used is the right reading of their file.
    const dir = scratch();
    const decl = join(dir, "d.json");
    writeFileSync(
      decl,
      JSON.stringify({
        formatVersion: "0",
        provenance: "modelled",
        selfDescription: null,
        commands: [
          { path: [], args: [], positionals: [] },
          { path: ["state"], args: [], positionals: [] },
        ],
      }),
    );
    const r = acc(["probe-plan", CONFORMING, "--declaration", decl]);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).data.paths).toEqual([["state"]]);
  });

  test("a declaration with nothing below the root is refused, not answered with an empty plan", () => {
    const dir = scratch();
    const decl = join(dir, "d.json");
    writeFileSync(
      decl,
      JSON.stringify({
        formatVersion: "0",
        provenance: "modelled",
        selfDescription: null,
        commands: [{ path: [], args: [], positionals: [] }],
      }),
    );
    const r = acc(["probe-plan", CONFORMING, "--declaration", decl]);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(2);
    expect(errorOf(r).message).toMatch(/no command paths/);
  });
});

describe("the target", () => {
  test("a file that nothing could spawn is refused before a harness is written", () => {
    // Without this the harness runs and captures its OWN shell's "Permission denied" at every
    // path — honestly, completely, verbatim — and the census then reports what the target accepts
    // on the strength of an error the target never emitted. Every field in that batch is true and
    // every conclusion drawn from it is about the wrong program.
    const dir = scratch();
    const target = join(dir, "mycli.sh");
    writeFileSync(target, "#!/bin/sh\necho hi\n");
    chmodSync(target, 0o644);
    writeFileSync(join(dir, "p.json"), JSON.stringify([["state"]]));
    const r = acc(["probe-plan", target, "--paths", join(dir, "p.json")]);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(5);
    expect(errorOf(r).kind).toBe("not_found");
    expect(errorOf(r).message).toMatch(/could not be executed/);
  });

  test("a target that is not there answers not_found", () => {
    const r = acc(["probe-plan", "/nonexistent/mycli", "--paths", "/nonexistent/p.json"]);
    expect(r.code).toBe(5);
  });
});

describe("--out", () => {
  test("writes the harness, and refuses to replace one rather than overwriting it", () => {
    // A generator that silently replaces a script somebody has edited is the same class of
    // surprise as a JSON envelope in a file named capture.sh.
    const dir = scratch();
    writeFileSync(join(dir, "p.json"), JSON.stringify([["state"]]));
    const out = join(dir, "capture.sh");
    const first = acc(["probe-plan", CONFORMING, "--paths", join(dir, "p.json"), "--out", out]);
    expect(first.code).toBe(0);
    expect(existsSync(out)).toBe(true);

    const second = acc(["probe-plan", CONFORMING, "--paths", join(dir, "p.json"), "--out", out]);
    expect(second.code).toBe(6);
    expect(errorOf(second).kind).toBe("conflict");

    const forced = acc([
      "probe-plan",
      CONFORMING,
      "--paths",
      join(dir, "p.json"),
      "--out",
      out,
      "--force",
    ]);
    rmSync(dir, { recursive: true, force: true });
    expect(forced.code).toBe(0);
  });

  test("a directory that cannot be written answers permission, not a generic failure", () => {
    const dir = scratch();
    writeFileSync(join(dir, "p.json"), JSON.stringify([["state"]]));
    const locked = join(dir, "locked");
    mkdirSync(locked);
    chmodSync(locked, 0o555);
    const r = acc([
      "probe-plan",
      CONFORMING,
      "--paths",
      join(dir, "p.json"),
      "--out",
      join(locked, "capture.sh"),
    ]);
    chmodSync(locked, 0o755);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(4);
    expect(errorOf(r).kind).toBe("permission");
  });

  test("a parent directory that does not exist answers not_found — the caller can create one", () => {
    // Distinct from permission on purpose: a missing parent is something the caller can fix by
    // creating it, and an unwritable one is not. Collapsing the two sends a reader to the wrong
    // repair.
    const dir = scratch();
    writeFileSync(join(dir, "p.json"), JSON.stringify([["state"]]));
    const r = acc([
      "probe-plan",
      CONFORMING,
      "--paths",
      join(dir, "p.json"),
      "--out",
      join(dir, "nope", "capture.sh"),
    ]);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(5);
    expect(errorOf(r).kind).toBe("not_found");
  });
});

describe("the report", () => {
  test("names the limit its path source imposes", () => {
    const dir = scratch();
    writeFileSync(join(dir, "p.json"), JSON.stringify([["state"]]));
    const supplied = JSON.parse(
      acc(["probe-plan", CONFORMING, "--paths", join(dir, "p.json")]).stdout,
    ).data;
    expect(supplied.pathSource).toBe("caller-supplied");
    expect(supplied.limit).toMatch(/does not mean complete/);

    const decl = join(dir, "d.json");
    writeFileSync(
      decl,
      JSON.stringify({
        formatVersion: "0",
        provenance: "modelled",
        selfDescription: null,
        commands: [{ path: ["state"], args: [], positionals: [] }],
      }),
    );
    const derived = JSON.parse(acc(["probe-plan", CONFORMING, "--declaration", decl]).stdout).data;
    rmSync(dir, { recursive: true, force: true });
    expect(derived.pathSource).toBe("declaration");
    expect(derived.limit).toMatch(/was not probed/);
  });

  test("the command it proposes next is one the tool accepts", () => {
    // `next` is a proposal to validate rather than text to run, so this is not a rule violation —
    // but every other `next` in this CLI is runnable, and the bare suggestion dropped the source
    // flag this command requires, so what it proposed was refused at exit 2.
    const dir = scratch();
    const paths = join(dir, "p.json");
    writeFileSync(paths, JSON.stringify([["state"]]));
    const first = JSON.parse(acc(["probe-plan", CONFORMING, "--paths", paths]).stdout);
    const proposed = first.next[0].args as string[];
    expect(proposed).toContain("--paths");

    // Run exactly what it proposed, from a directory where the relative --out resolves.
    const r = acc(proposed, dir);
    const wrote = existsSync(join(dir, "capture.sh"));
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(0);
    expect(wrote).toBe(true);
  });
});

describe("a file the caller named, missing versus malformed", () => {
  // ONE RULE, THREE FLAGS, TWO COMMANDS. Fixing this inside `probe-plan` alone would have removed
  // an asymmetry between its own flags and created one between commands: `acc check --declaration
  // missing.json` answered `usage` while `acc probe-plan --declaration missing.json` answered
  // `not_found`, for the identical mistake. The rule lives in the loaders now — they say whether
  // the file was absent — and every call site maps it the same way.
  const cases: Array<[string, string[]]> = [
    ["check --declaration", ["check", CONFORMING, "--declaration"]],
    ["check --recorded-surfaces", ["check", CONFORMING, "--recorded-surfaces"]],
    ["probe-plan --declaration", ["probe-plan", CONFORMING, "--declaration"]],
    ["probe-plan --paths", ["probe-plan", CONFORMING, "--paths"]],
  ];

  test("a missing file is not_found, whichever flag or command met it", () => {
    for (const [label, argv] of cases) {
      const r = acc([...argv, "/nonexistent/missing.json"]);
      expect({ label, code: r.code, kind: errorOf(r).kind }).toEqual({
        label,
        code: 5,
        kind: "not_found",
      });
    }
  });

  test("a file that exists and cannot be read is usage — a different repair", () => {
    const dir = scratch();
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{ not json");
    for (const [label, argv] of cases) {
      const r = acc([...argv, bad]);
      expect({ label, code: r.code, kind: errorOf(r).kind }).toEqual({
        label,
        code: 2,
        kind: "usage",
      });
    }
    rmSync(dir, { recursive: true, force: true });
  });
});
