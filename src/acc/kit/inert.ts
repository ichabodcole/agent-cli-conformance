import type { Invocation } from "./types.ts";

/**
 * A token no real CLI has a flag or verb for. Probes that need a guaranteed-invalid argument
 * build it from this, which is also what makes them provably inert.
 */
export const SENTINEL = "acc-probe-xyzzy";

const HELP_TOKENS = new Set(["--help", "-h", "help", "--version", "-V", "-v"]);

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
  const hasSentinel = inv.args.some((a) => a.includes(SENTINEL));
  const looksLikeFlag = (a: string) => a.startsWith("-");

  switch (inv.inertness) {
    case "help-path":
      // Every argument must be a help/version token. `deploy --help` is NOT a help path: an
      // unknown-subcommand handler could route it anywhere.
      return inv.args.every((a) => HELP_TOKENS.has(a)) ? "help-path" : null;
    case "sentinel":
      return hasSentinel ? "sentinel" : null;
    case "no-verb":
      // Every argument must look like a flag. A bare token after a flag (`--frmat json`) is
      // indistinguishable from a verb (`--dry-run deploy`) without knowing that flag's arity,
      // which we never know for a binary we didn't write — so we refuse the whole shape rather
      // than guess. A probe that needs a flag WITH a value uses `sentinel` instead: that's
      // provably invalid regardless of arity.
      return inv.args.every(looksLikeFlag) ? "no-verb" : null;
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
