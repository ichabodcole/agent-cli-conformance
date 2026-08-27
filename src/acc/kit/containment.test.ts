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
   * WHY THE GUIDE SAYS "NAME THE DIRECTORY FIRST" RATHER THAN "AVOID THESE SHELLS".
   *
   * Whether one assignment in a command prefix sees another is unspecified in POSIX. Both
   * readings conform, and which one you get does not follow from the shell's NAME: measured on
   * one macOS machine, bash 3.2.57 at `/bin/bash` leaked to the real home while bash 5.3.15 at
   * `/opt/homebrew/bin/bash` did not.
   *
   * THIS TEST DELIBERATELY DOES NOT PIN WHICH SHELLS LEAK. An earlier version asserted that
   * `/bin/sh` leaks, which is true here and false anywhere `/bin/sh` is dash — the test would
   * have inherited an unexamined property of the machine that ran it, which is the same defect
   * class as the one it exists to guard. What must hold everywhere is the repair, so that is what
   * is asserted; the one-step form is measured and reported, never required to fail.
   */
  const SHELLS = ["/bin/sh", "/bin/bash", "/opt/homebrew/bin/bash", "/bin/zsh", "/bin/dash"].filter(
    (p) => existsSync(p),
  );

  const xdgUnder = (shell: string, script: string) =>
    shGitFree([shell, "-c", script], base, { ...GIT_FREE_ENV, HOME: realHome }).stdout;

  const READ_BACK = `/bin/sh -c 'printf %s "${"$"}XDG_CONFIG_HOME"'`;
  const ONE_STEP = `HOME="${"$"}(mktemp -d)" XDG_CONFIG_HOME="${"$"}HOME/.config" ${READ_BACK}`;
  const TWO_STEP = `d=$(mktemp -d); HOME="$d" XDG_CONFIG_HOME="$d/.config" ${READ_BACK}`;

  test("the two-step form contains under every shell on this machine", () => {
    // Guard the guard: an empty shell list would satisfy the loop vacuously.
    expect(SHELLS.length).toBeGreaterThan(1);
    const leaked = SHELLS.filter((sh) => xdgUnder(sh, TWO_STEP).startsWith(realHome));
    expect(leaked).toEqual([]);
  }, 60_000);

  test("the one-step form is not dependable — at least one shell here disagrees with another", () => {
    // The claim is DIVERGENCE, not a verdict on any named shell. On a machine where every
    // available shell happened to agree, this would report that rather than fail, because "we
    // could not reproduce it here" is a result and "this shell is unsafe" is the sentence the
    // guide was corrected for making.
    const results = SHELLS.map((sh) => ({
      shell: sh,
      leaks: xdgUnder(sh, ONE_STEP).startsWith(realHome),
    }));
    const kinds = new Set(results.map((r) => r.leaks));
    if (kinds.size === 1) {
      console.log(
        `one-step form agreed across all ${results.length} shells here (leaks=${[...kinds][0]}); the divergence is unspecified behaviour, not a promise it always appears`,
      );
    }
    // What IS asserted: wherever the one-step form leaks, the two-step form does not — which is
    // the only sentence the guide rests on.
    for (const r of results.filter((x) => x.leaks)) {
      expect([r.shell, xdgUnder(r.shell, TWO_STEP).startsWith(realHome)]).toEqual([r.shell, false]);
    }
  }, 60_000);
});
