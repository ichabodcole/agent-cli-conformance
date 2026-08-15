import type { Invocation } from "./types.ts";

/**
 * A token no real CLI has a flag or verb for. Probes that need a guaranteed-invalid argument
 * build it from this.
 *
 * That makes the token guaranteed-INVALID, which is not the same as guaranteed-HARMLESS. It is
 * unmatched by any flag table and any command table; it is not unmatched by a CLI that takes
 * free-form text as its root positional. See `classifyInertness` below.
 */
export const SENTINEL = "acc-probe-xyzzy";

const HELP_TOKENS = new Set(["--help", "-h", "help", "--version", "-V", "-v"]);

/**
 * Output-format selectors. They change how a command RENDERS its result, never what work it
 * does — so combined with a help token they are still inert, and B3 needs exactly that pairing
 * to check machine-mode help (`--help --json`).
 *
 * D3 needs the OPPOSITE pairing — format forced back to text — to read the human help of a CLI
 * that switches to machine mode when stdout is a pipe, which the runner's stdout always is.
 * Written with an attached `=` on purpose: `--format text` would mean whitelisting the bare
 * word `text`, and a bare word in a probe is a positional on any CLI whose root argument is
 * free-form. Every token here still starts with a dash, which is the property that makes the
 * help-path class provably safe.
 */
const FORMAT_TOKENS = new Set(["--json", "--format=text", "--format=json"]);

/**
 * Env keys a probe may set. Anything else could change what the target DOES, not just how it
 * reports — and the gate's job is to bound the blast radius, not just the argv. This is every
 * env the plan actually uses: D1's `HOME`/`XDG_CONFIG_HOME`, F2's `ACC_PROBE_TIMING`, and
 * machine-mode's `AI_AGENT`, plus the general escape hatches (`ACC_*`, `NO_COLOR`, `TERM`) a
 * probe might reasonably need. D4's `ACC_PROBE_NONCE` was here too until it stopped existing:
 * a probe identity does not belong in the environment at all, and `Invocation.repeat` carries
 * it in the recorder instead.
 */
const ALLOWED_ENV = /^(ACC_[A-Z0-9_]+|AI_AGENT|HOME|XDG_CONFIG_HOME|NO_COLOR|TERM)$/;

/**
 * Prove an invocation is inert, or refuse it.
 *
 * The kit runs against binaries it knows nothing about, some of which spawn daemons, call live
 * APIs, or delete things. This gate FAILS CLOSED: a checker's own claim about its probe is
 * treated as a hypothesis and verified against the args, never trusted. A mislabelled probe is
 * a bug in a checker; the cost of trusting it is damage to someone's project.
 *
 * ## What this gate actually buys
 *
 * It classifies ARGV, and what it establishes is a NEGATIVE about the tokens: `acc-probe-xyzzy-verb`
 * names no verb any CLI declares and `--acc-probe-xyzzy-flag` names no flag. Against a
 * **verb-dispatching** CLI — one whose first positional selects a command from a fixed table —
 * that is enough to keep the probe off every declared code path, which covers the great majority
 * of CLIs and every tool in the case-study survey.
 *
 * It is NOT enough to say no work is performed, and this comment used to say exactly that one
 * paragraph above the list that contradicts it. A REDUCTION IN RISK is the whole claim, and the
 * difference is the reason this comment is long: "the probe names nothing declared" is a
 * statement about the arguments, while "running L0 is safe" would be a statement about the
 * target, and nothing here can make it.
 *
 * ## What it does NOT buy
 *
 * The classes themselves leave work reachable, even on a well-behaved verb-dispatching CLI:
 *
 * - `bare` passes no arguments at all, and a CLI that does real work on a bare invocation does
 *   that work. (It is still the least dangerous class, and D2/E1 cannot be probed without it.)
 * - a fixed-verb CLI may IGNORE the unknown flag in a `no-verb` or `sentinel` probe and execute
 *   a default root action — which is the exact A1 violation the probe exists to find, so the
 *   targets most worth probing are the ones where this fires.
 * - `--version` and `--help` are requests, not guarantees: a CLI may ignore them, or handle
 *   them only after global initialisation has already connected, migrated, or written.
 *
 * And it is **not** inert at all against a CLI whose root positional is FREE-FORM DATA. For
 * `claude "…"`, `llm "…"`, `aider "…"` — the dominant shape of the agent CLIs this kit exists
 * to check — `<cli> acc-probe-xyzzy-verb` is not an unknown verb, it is a PROMPT. Running it
 * spends money and can take actions. A6's `-- <sentinel>` is worse: after a terminator the
 * sentinel is guaranteed to land as a positional, whatever the parser would otherwise have done
 * with it.
 *
 * There is no reliable way to detect that shape from outside — help text does not declare it,
 * and a wrong guess is worse than a documented limit, because it would license the kit to run
 * probes it cannot justify. So the limit is documented and not guessed at: the rule pages for
 * A2 and A6 say it, and `acc check --help` says it.
 *
 * ## What the runner adds, and what it still does not
 *
 * Probes run with stdin closed and under a deadline, so nothing waits for an answer forever;
 * each runs in a fresh temporary working directory (see runner.ts); and output is capped.
 *
 * The temporary cwd redirects RELATIVE paths only. It does not stop a write through `HOME`, an
 * XDG path, an absolute path, a platform config directory, or a subprocess — and the child
 * inherits the caller's whole environment, credentials included. Nothing denies the filesystem
 * outside that directory and nothing denies the network. A per-run temporary `HOME`/XDG,
 * credential stripping, and a real OS sandbox are planned; none of them exist yet, so no
 * sentence anywhere in this repo may describe L0 as safe against an arbitrary binary.
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
