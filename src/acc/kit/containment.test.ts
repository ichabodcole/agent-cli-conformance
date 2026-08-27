import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { disposableBase, GIT_FREE_ENV, shGitFree } from "./git-fixture-env.ts";

/**
 * THE SAFETY GUIDE'S CONTAINMENT, WITH BOTH ARMS.
 *
 * `how-to-establish-your-target-is-safe-to-check.md` answers "what runs before parsing?" with a
 * scratch `HOME`. That instruction was shipped with only the arm that works. These run both: a
 * target writing through `HOME` (contained) and one re-deriving from its own variable (NOT
 * contained), which is what the third adopter's target did.
 *
 * A safety instruction is the one place a demonstration of success is worth least. What a reader
 * needs is the boundary, and the boundary is only visible from the failing side.
 */

const HERE = import.meta.dir;
const CONTAINMENT = join(HERE, "fixtures", "containment");
/** Both fixtures write only under this, and only when it is set. */
const ARMED = { ACC_CONTAINMENT_FIXTURE: "1" };

let base = "";
let scratchHome = "";
/** Stands in for the reader's REAL home — nothing here may ever touch the actual `$HOME`. */
let realHome = "";

beforeEach(() => {
  base = mkdtempSync(join(disposableBase(), "acc-containment-"));
  scratchHome = join(base, "scratch");
  realHome = join(base, "real");
  mkdirSync(scratchHome, { recursive: true });
  mkdirSync(realHome, { recursive: true });
});

afterEach(() => {
  if (base) rmSync(base, { recursive: true, force: true });
});

const wrote = (home: string) => existsSync(join(home, ".acc-probe", "startup"));

function runTarget(fixture: string, env: Record<string, string>) {
  return shGitFree(["bun", join(CONTAINMENT, fixture), "--help"], base, env);
}

describe("a scratch HOME, on both sides of what it contains", () => {
  test("CONTAINS a target that writes through HOME", () => {
    const r = runTarget("writes-through-home.ts", { ...ARMED, HOME: scratchHome });
    expect(r.code).toBe(0);
    expect({ scratch: wrote(scratchHome), real: wrote(realHome) }).toEqual({
      scratch: true,
      real: false,
    });
  }, 30_000);

  test("DOES NOT CONTAIN a target that re-derives its home from its own variable", () => {
    // The adopter's case: `MIND_MAPPER_HOME` was already in their environment. Moving `HOME`
    // moves nothing, the check runs, the report looks ordinary, and the writes land where the
    // reader believed they had prevented them.
    const r = runTarget("re-derives-its-own-home.ts", {
      ...ARMED,
      HOME: scratchHome,
      ACC_FIXTURE_HOME: realHome,
    });
    expect(r.code).toBe(0);
    expect({ scratch: wrote(scratchHome), real: wrote(realHome) }).toEqual({
      scratch: false,
      real: true,
    });
  }, 30_000);

  test("and IS contained once that variable is redirected too — the guide's new sentence", () => {
    // The repair the adopter proposed, executed rather than described.
    const r = runTarget("re-derives-its-own-home.ts", {
      ...ARMED,
      HOME: scratchHome,
      ACC_FIXTURE_HOME: scratchHome,
    });
    expect(r.code).toBe(0);
    expect({ scratch: wrote(scratchHome), real: wrote(realHome) }).toEqual({
      scratch: true,
      real: false,
    });
  }, 30_000);

  test("the fixtures refuse to run unarmed, so nothing here can write by accident", () => {
    const r = shGitFree(
      ["bun", join(CONTAINMENT, "writes-through-home.ts"), "--help"],
      base,
      // Deliberately no ACC_CONTAINMENT_FIXTURE.
      { HOME: scratchHome },
    );
    expect(r.code).toBe(3);
    expect(wrote(scratchHome)).toBe(false);
  }, 30_000);
});

describe("the command line the guide prints", () => {
  /**
   * THE SECOND DEFECT, IN THE SAME LINE, AND IT IS SHELL-DEPENDENT.
   *
   *     HOME="$(mktemp -d)" XDG_CONFIG_HOME="$HOME/.config" ...
   *
   * POSIX leaves it unspecified whether one assignment in a command prefix sees another. Measured
   * on this machine: `zsh` and `dash` expand `$HOME` to the new scratch directory; `sh` and `bash`
   * expand it to the caller's REAL home, so the variable meant to redirect config reads points at
   * the very directory the line exists to protect. A reader pasting it into a script gets the
   * broken form; the same reader pasting it into an interactive zsh gets the working one.
   */
  test("the two-assignment form aims XDG_CONFIG_HOME at the real home under sh", () => {
    const probe = `HOME="${"$"}(mktemp -d)" XDG_CONFIG_HOME="${"$"}HOME/.config" /bin/sh -c 'printf %s "${"$"}XDG_CONFIG_HOME"'`;
    const r = shGitFree(["/bin/sh", "-c", probe], base, { ...GIT_FREE_ENV, HOME: realHome });
    // Not an assertion that sh is wrong — an assertion that the OUTCOME DIFFERS from the intent,
    // which is what makes the printed line unsafe to hand a reader without qualification.
    expect(r.stdout).toBe(join(realHome, ".config"));
  }, 30_000);

  test("assigning in two steps is unambiguous everywhere", () => {
    // The repair: give the scratch directory a name first, then build both variables from it.
    const probe = `d=$(mktemp -d); HOME="$d" XDG_CONFIG_HOME="$d/.config" /bin/sh -c 'printf %s "${"$"}XDG_CONFIG_HOME"'`;
    for (const shell of ["/bin/sh", "/bin/zsh"]) {
      const r = shGitFree([shell, "-c", probe], base, { ...GIT_FREE_ENV, HOME: realHome });
      expect([shell, r.stdout.startsWith(realHome)]).toEqual([shell, false]);
      expect([shell, r.stdout.endsWith("/.config")]).toEqual([shell, true]);
    }
  }, 30_000);
});
