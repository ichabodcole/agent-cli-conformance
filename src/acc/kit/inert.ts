import type { Invocation } from "./types.ts";

/**
 * A token no real CLI has a flag or verb for. Probes that need a guaranteed-invalid argument
 * build it from this, which is also what makes them provably inert.
 */
export const SENTINEL = "acc-probe-xyzzy";

const HELP_TOKENS = new Set(["--help", "-h", "help", "--version", "-V", "-v"]);

/**
 * Output-format selectors. They change how a command RENDERS its result, never what work it
 * does — so combined with a help token they are still inert, and B3 needs exactly that pairing
 * to check machine-mode help (`--help --json`).
 */
const FORMAT_TOKENS = new Set(["--json"]);

/**
 * Env keys a probe may set. Anything else could change what the target DOES, not just how it
 * reports — and the gate's job is to bound the blast radius, not just the argv. This is every
 * env the plan actually uses: D1's `HOME`/`XDG_CONFIG_HOME`, D4's `ACC_PROBE_NONCE`, F2's
 * `ACC_PROBE_TIMING`, and machine-mode's `AI_AGENT`, plus the general escape hatches
 * (`ACC_*`, `NO_COLOR`, `TERM`) a probe might reasonably need.
 */
const ALLOWED_ENV = /^(ACC_[A-Z0-9_]+|AI_AGENT|HOME|XDG_CONFIG_HOME|NO_COLOR|TERM)$/;

/**
 * Prove an invocation is inert, or refuse it.
 *
 * The kit runs against binaries it knows nothing about, some of which spawn daemons, call live
 * APIs, or delete things. L0's guarantee is that it only ever runs help paths and
 * deliberately-invalid invocations — commands that a conforming CLI performs no work for.
 *
 * This gate FAILS CLOSED: a checker's own claim about its probe is treated as a hypothesis and
 * verified against the args, never trusted. A mislabelled probe is a bug in a checker; the cost
 * of trusting it is damage to someone's project.
 */
export function classifyInertness(inv: Invocation): Invocation["inertness"] | null {
  // Checked before the switch because it bounds every class alike: an env var can change what
  // the target DOES regardless of how innocent the argv looks.
  if (inv.env && Object.keys(inv.env).some((k) => !ALLOWED_ENV.test(k))) return null;

  const hasSentinel = inv.args.some((a) => a.includes(SENTINEL));
  const looksLikeFlag = (a: string) => a.startsWith("-");

  switch (inv.inertness) {
    case "help-path": {
      // Every argument must be a help/version token OR a format selector, AND at least one
      // must be an actual help token. The second clause is what stops a bare `["--json"]` from
      // classifying as a help path — `--json` alone asks for real output, not help — while
      // still letting `["--help", "--json"]` through for B3. Without the length check on top,
      // an empty args array — a `bare` invocation — would satisfy `.every()` vacuously.
      const recognized = (a: string) => HELP_TOKENS.has(a) || FORMAT_TOKENS.has(a);
      return inv.args.length > 0 &&
        inv.args.every(recognized) &&
        inv.args.some((a) => HELP_TOKENS.has(a))
        ? "help-path"
        : null;
    }
    case "sentinel":
      // Every non-flag token must itself be a sentinel. Checking only that the sentinel
      // appears SOMEWHERE lets a real verb ride alongside it — a lenient parser rejects the
      // unknown flag and executes the verb anyway.
      return hasSentinel && inv.args.every((a) => looksLikeFlag(a) || a.includes(SENTINEL))
        ? "sentinel"
        : null;
    case "no-verb":
      // Every argument must look like a flag, AND there must be at least one — same vacuous-
      // empty-array trap as `help-path` above. A bare token after a flag (`--frmat json`) is
      // indistinguishable from a verb (`--dry-run deploy`) without knowing that flag's arity,
      // which we never know for a binary we didn't write — so we refuse the whole shape rather
      // than guess. A probe that needs a flag WITH a value uses `sentinel` instead: that's
      // provably invalid regardless of arity.
      return inv.args.length > 0 && inv.args.every(looksLikeFlag) ? "no-verb" : null;
    case "bare":
      // No arguments at all — the least dangerous possible invocation, and the only way to
      // probe D2/E1 (bare-invocation behaviour). A CLI that does real work on a bare
      // invocation is itself the finding; a wizard that blocks on stdin is caught by the
      // runner's deadline, not by this gate.
      return inv.args.length === 0 ? "bare" : null;
    default:
      return null;
  }
}

export function assertInert(inv: Invocation): void {
  if (classifyInertness(inv) === null) {
    throw new Error(
      `refusing to run: invocation is not inert (claimed "${inv.inertness}"): ${inv.args.join(" ")}`,
    );
  }
}
