import { findingFor } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D3";

const finding = findingFor(RULE_ID);

/** D3 — docs/wiki/rules/discoverability/help-advertises-machine-mode.md (diagnostic) */
export const advertisesMachineModeChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/help-advertises-machine-mode.md",
  tier: "diagnostic",

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "D3: help mentions machine mode" },
  ],

  check: (h: History): Finding => {
    if (!h.discovery.helpReadable) {
      return finding("unverified", "help was not readable", []);
    }

    const [o] = findByPurpose(h, "D3:");
    const evidence = o ? [o.id] : [];
    const text = `${o?.stdout ?? ""}${o?.stderr ?? ""}`;

    if (h.discovery.machineModeFlag !== null || /\bschema\b/.test(text)) {
      return finding(
        "pass",
        `help advertises ${h.discovery.machineModeFlag ?? "schema"}`,
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
