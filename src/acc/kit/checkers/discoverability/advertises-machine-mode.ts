import { findingFor, hungUnverified } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D3";

const finding = findingFor(RULE_ID);

/**
 * A `schema` COMMAND, not the word "schema".
 *
 * The old test was `/\bschema\b/` over the whole help text, which matches prose — "validate
 * against a schema", "the schema changed in v2" — and handed a pass to tools advertising no
 * machine-readable path at all. This requires the shape of a command-table row: an indented
 * line whose first token is `schema`, followed either by a description column (two or more
 * spaces) or by nothing. Discovery's own structured parse is consulted first; this is the
 * fallback for help layouts its `Commands:` heuristic does not recognise.
 */
const SCHEMA_COMMAND_ROW = /^[ \t]+schema\b[^\n]*?(?:\s{2,}\S|\s*$)/m;

/** D3 — docs/wiki/rules/discoverability/help-advertises-machine-mode.md (diagnostic) */
export const advertisesMachineModeChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/help-advertises-machine-mode.md",
  tier: "diagnostic",
  probeLevel: "L0",

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "D3: help mentions machine mode" },
  ],

  check: (h: History): Finding => {
    if (!h.discovery.helpReadable) {
      return finding("unverified", "help was not readable", []);
    }

    const [o] = findByPurpose(h, "D3:");
    if (o) {
      // A killed help probe yields empty text, and empty text advertises nothing — which would
      // be reported as the FAIL "help names no machine-mode flag", blaming the target for
      // output we never let it produce.
      const hung = hungUnverified(finding, [o]);
      if (hung) return hung;
    }

    const evidence = o ? [o.id] : [];
    const text = `${o?.stdout ?? ""}${o?.stderr ?? ""}`;
    const advertisesSchema =
      h.discovery.subcommands.includes("schema") ||
      h.discovery.flags.includes("--schema") ||
      SCHEMA_COMMAND_ROW.test(text);

    if (h.discovery.machineModeFlag !== null || advertisesSchema) {
      return finding(
        "pass",
        `help advertises ${h.discovery.machineModeFlag ?? "a schema command"}`,
        evidence,
      );
    }

    return finding(
      "fail",
      // The knock-on effect, not just the fact of the miss: B3 (machine output is parseable)
      // depends on discovery finding a machine-mode flag here, so when this fails B3 also goes
      // unverified — an undiscoverable feature is, to this kit, indistinguishable from an
      // absent one.
      "help names no machine-mode flag or schema command; B3 will be unverified as a result",
      evidence,
    );
  },
};
