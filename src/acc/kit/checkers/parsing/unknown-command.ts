import { findingFor } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "A2";
const ROOT = [`${SENTINEL}-verb`];

const finding = findingFor(RULE_ID);

/**
 * A2 — docs/wiki/rules/parsing/unknown-command-exits-nonzero.md
 *
 * Root verb only. An earlier design also nested a probe under the first discovered subcommand
 * (`[sub, "<sentinel>-verb"]`) to catch parsers — cobra among them — that validate only the
 * root. That probe is NOT L0-safe: `inert.ts`'s "sentinel" class requires every non-flag token
 * to itself contain the sentinel, and `sub` is a real, executable verb discovered from help.
 * A CLI that treats an unrecognised nested token as an ordinary extra positional — rather than
 * rejecting it as an unknown command — runs `sub` for real. That is exactly the A4 danger (a
 * real verb riding alongside extras that a lenient parser ignores) one level down, and
 * `Discovery` carries no way to tell a leaf command from a command group, so there is no way to
 * build the nested probe safely from what's known at L0. `classifyInertness` correctly refuses
 * it and `assertInert` throws, so the nested case is dropped rather than run unsafely.
 */
export const unknownCommandChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/unknown-command-exits-nonzero.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: ROOT, inertness: "sentinel", purpose: "A2: unknown root verb" },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, ROOT);
    if (!o) return finding("unverified", "probe was not recorded", []);

    const problems: string[] = [];
    if (o.exitCode === 0) problems.push("unknown root verb exited 0");
    if (o.stdout !== "") problems.push("unknown root verb wrote to stdout");

    // Scoped explicitly rather than a bare "rejected": this checker only ever probes the root,
    // so the pass detail must say so — the rule itself requires rejection at every level of
    // nesting, and a reader of the Finding alone (not this file) has no other way to know the
    // nested case was never exercised.
    return problems.length
      ? finding("fail", problems.join("; "), [o.id])
      : finding(
          "pass",
          `root verb rejected with exit ${o.exitCode}; nested case not probed at L0`,
          [o.id],
        );
  },
};
