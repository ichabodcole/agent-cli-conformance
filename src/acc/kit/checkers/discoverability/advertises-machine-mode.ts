import { parseHelp } from "../../discovery.ts";
import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import { helpStatesMachineDefault, mentionsMachineDefaultTokens } from "../../machine-mode.ts";
import type { Checker, Finding, History, Invocation, Observation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D3";

const finding = findingFor(RULE_ID);

const PLAIN = "D3: help mentions machine mode";
const FORCED_TEXT = "D3: human help, with machine mode forced off";

/**
 * A `schema` COMMAND, not the word "schema".
 *
 * The old test was `/\bschema\b/` over the whole help text, which matches prose — "validate
 * against a schema", "the schema changed in v2" — and handed a pass to tools advertising no
 * machine-readable path at all. This requires the shape of a command-table row: an indented
 * line whose first token is `schema`, followed either by a description column (two or more
 * spaces) or by nothing. `parseHelp`'s structured parse is consulted first; this is the
 * fallback for help layouts its `Commands:` heuristic does not recognise.
 */
const SCHEMA_COMMAND_ROW = /^[ \t]+schema\b[^\n]*?(?:\s{2,}\S|\s*$)/m;

/** Usable output from a probe: it ran, it finished under its own control, and it said something. */
function textOf(o: Observation | undefined): string {
  if (!o || o.timedOut || o.truncated || o.spawnFailed || o.crashed) return "";
  return `${o.stdout}${o.stderr}`;
}

/**
 * True when the captured help is itself a machine document.
 *
 * This is the whole reason the rule needs a second probe. A CLI that switches to machine mode
 * when stdout is not a terminal — which the kit's runner always is — answers `--help` with its
 * SCHEMA, and a schema necessarily names `--json` and `--format`. Scanning that would make D3
 * test its own machine output rather than the human help surface it is named after, and pass
 * every such tool for free.
 */
function isMachineDocument(text: string): boolean {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/** D3 — docs/wiki/rules/discoverability/help-advertises-machine-mode.md (diagnostic) */
export const advertisesMachineModeChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/help-advertises-machine-mode.md",
  tier: "diagnostic",
  deviation: "design-choice",
  probeLevel: "L0",
  // The rule asks for the flag AND the `schema` command "where one exists"; the verdict below
  // is a disjunction, so a CLI with an unadvertised `schema` command passes on `--json` alone.
  // Black-box, there is no way to know a schema command exists without finding it in the help
  // this rule is testing, so the conjunction is not checkable at L0 — which is the reason for
  // the disjunction, not an excuse for leaving it undeclared.
  //
  // The other two are what a `pass` from a TEXT SCAN can be worth (review R6-5). The first is
  // `extractFlags` in discovery.ts: it scopes its scan to a recognised Options/Flags block and
  // falls back to the WHOLE help text when it recognises none, so for a help layout the
  // heuristic does not parse, a `--json` appearing only inside a piped example satisfies this
  // rule. The second is the boundary of the rule as written — it is satisfied by the word, and
  // nothing here invokes the flag, so help that advertises a machine mode the tool does not
  // implement passes D3 and takes B3 down with it.
  coverage: "partial",
  coverageGaps: [
    "a flagless machine-first tool that adds no schema command or --schema flag cannot reach a pass because a flag or a schema token is all this rule accepts and a prose claim only downgrades the verdict so for that shape the best available outcome is unverified",
    "a machine-first tool with no flag is recognised only by matching a claim in help prose which is a heuristic that misreads contrastive and scoped statements and cannot see a non-English one",
    "help is only required to advertise either the machine-mode flag or a schema command and never both",
    "the flag scan falls back to the whole help text when no options block is recognised so a flag named only in an example can satisfy it",
    "a pass establishes only that help names the flag and never that the flag is accepted",
  ],
  coverageEstablished: [
    "the human root help surface names one of the flags --json or --format or --output or carries a schema command row or a --schema flag — a claim ABOUT the help text rather than a claim that the flag selects anything",
  ],

  probes: (d): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: PLAIN },
    // The fallback, and only for a target that advertises `--format` at all. Asking a CLI with
    // no such flag to force text mode is an invocation it can only reject, and the answer would
    // be evidence about nothing. `--format=text` is one token so the probe stays flag-only; see
    // FORMAT_TOKENS in inert.ts. Whether the fallback is USED is decided in `check`, from the
    // bytes plain `--help` returned — which is not knowable here, before anything has run.
    ...(d.flags.includes("--format")
      ? [
          {
            args: ["--help", "--format=text"],
            inertness: "help-path" as const,
            purpose: FORCED_TEXT,
          },
        ]
      : []),
  ],

  check: (h: History): Finding => {
    if (!h.discovery.helpReadable) {
      return finding("unverified", "help was not readable", []);
    }

    const [plain] = findByPurpose(h, PLAIN);
    if (plain) {
      // A killed help probe yields empty text, and empty text advertises nothing — which would
      // be reported as the FAIL "help names no machine-mode flag", blaming the target for
      // output we never let it produce.
      const hung = hungUnverified(finding, [plain]);
      if (hung) return hung;
      // The scan below is an ABSENCE test over help text, so a prefix cannot settle it in
      // either direction: the machine-mode row may be in the bytes we refused to read.
      const cut = truncatedUnverified(finding, [plain]);
      if (cut) return cut;
      // Same shape as the hang directly above: help that never got written advertises nothing,
      // and reporting that as "help names no machine-mode flag" charges the target for a surface
      // it was killed before presenting.
      const crashed = crashedUnverified(finding, [plain]);
      if (crashed) return crashed;
    }

    // The HUMAN surface is what this rule names, so plain help is preferred and the forced-text
    // probe is consulted only when plain help came back as a machine document.
    const plainText = textOf(plain);
    const [forced] = findByPurpose(h, FORCED_TEXT);
    const forcedText = forced?.exitCode === 0 ? textOf(forced) : "";

    let help = plainText;
    let evidence = plain ? [plain.id] : [];
    // `h.discovery` is parsed from plain `--help`. When the fallback is taken, those results
    // describe the machine document and must not reach the verdict — that is the whole defect
    // being fixed, so the parse is redone over the text actually chosen.
    let surface = h.discovery;
    if (isMachineDocument(plainText)) {
      if (!forcedText || isMachineDocument(forcedText)) {
        return finding(
          "unverified",
          "help answers with a machine document and offers no forced-text form, so the human help surface was never observed",
          [plain?.id, forced?.id].filter((id): id is string => id !== undefined),
        );
      }
      help = forcedText;
      evidence = forced ? [forced.id] : [];
      surface = {
        ...parseHelp(forcedText),
        machineModeDefault: h.discovery.machineModeDefault,
        helpReadable: true,
      };
    }

    // THE RULE'S SECOND CLAUSE, which the checker did not implement until now.
    //
    // "A CLI SHOULD make its structured surface discoverable from the surface a caller reaches
    // first — which is `--help`, not documentation." A machine-first tool has no flag to name
    // and no schema token, so the first clause exempts it ("where one exists") and the second
    // is the whole of what it owes. Saying so in help satisfies the rule; the checker was only
    // ever looking for a token.
    //
    // Reported by the first outside adopter across two rounds: they added an accurate Output
    // block to their help and D3 kept failing them, while a key in `acc.config.json` — which no
    // caller of their CLI can see — made it pass. Their words: the rule's name and its behaviour
    // had come apart.
    //
    // Prose matching, and it is defensible HERE for reasons that would not hold elsewhere. D3 is
    // `diagnostic`, so a false positive costs a reported line and never a build; the fallback is
    // reached only when no flag and no schema token were found, so a tool that advertises
    // normally never touches it; and this rule already declares a loose-scan gap. In a core rule
    // none of that would be enough.
    const advertisesMachineDefault = helpStatesMachineDefault(help);

    const advertisesSchema =
      surface.subcommands.includes("schema") ||
      surface.flags.includes("--schema") ||
      SCHEMA_COMMAND_ROW.test(help);

    if (surface.machineModeFlag !== null || advertisesSchema) {
      return finding(
        "pass",
        `help advertises ${surface.machineModeFlag ?? "a schema command"}`,
        evidence,
      );
    }

    // A CLAIM IN PROSE DOWNGRADES A FAILURE; IT DOES NOT BUY A PASS.
    //
    // The rule asks whether a caller can discover the structured surface. For a tool with no flag
    // to name, the only available evidence is a sentence — and matching a sentence is a guess
    // about meaning, which this kit does not otherwise make. Two independent reviewers broke every
    // version of the matcher with ordinary rephrasings ("Unlike JSON, text is emitted by default",
    // "The JSON parser writes a table by default"), and one put the limit plainly: you are not
    // fixing the detector, you are enumerating negations.
    //
    // So the claim moves the verdict from `fail` to `unverified` and no further. That makes a
    // false positive cost an admission of ignorance rather than an assertion of fact, makes a
    // false PASS structurally impossible, and — the part that matters most — removes the
    // incentive to delete honest documentation: deleting the sentence moves a target from
    // `unverified` to `fail`, which is worse for them, not better.
    // A DECLARING TARGET IS TOLD THE DECLARATION WAS SEEN. It does not answer this rule — the
    // question is what a CALLER can discover from help, and `acc.config.json` is a statement to
    // the kit that no caller of the target can read — but a reader who did exactly what B5 and D1
    // told them to do must not be handed a message about prose matching, which is not what they
    // did and which names no remedy. Reported by the adopter who declared: the string was
    // byte-identical with and without their declaration, so the rule was not declining to credit
    // it, it did not know one existed.
    const declared = h.discovery.machineModeDefault
      ? "; defaultOutput is declared in acc.config.json, which B5 and D1 read but this rule cannot — a caller of your CLI sees your help, not our config file"
      : "";

    if (advertisesMachineDefault) {
      return finding(
        "unverified",
        `no machine-mode flag or schema command was advertised; help appears to CLAIM structured output is the default, which is a claim matched in prose rather than a token this kit can verify${declared}`,
        evidence,
      );
    }

    // A NEAR MISS IS NOT A SILENCE, and the report used to say the same thing for both. An
    // adopter whose help read "machine-readable by default ... structured JSON on stdout" got the
    // line below verbatim — identical to what a tool carrying no such sentence gets — and
    // reasonably concluded prose claims were not implemented at all. They established otherwise
    // by reading this file inside their `node_modules`.
    //
    // This changes NO verdict. The matcher is untouched and the rule stays `fail`: accepting that
    // sentence is a different decision, argued against directly above. What it changes is that
    // the fail now distinguishes "I looked and there was nothing" from "I looked, there was
    // something, and it is not in a shape I can verify" — which is the difference between a
    // reader rewriting one sentence and a reader abandoning the route.
    const nearMiss = mentionsMachineDefaultTokens(help)
      ? "; help DOES carry machine-output and default wording, in an arrangement this rule's prose matcher did not accept — the matcher is narrow by design and only recognises a direct claim about this tool's own stdout, so a rewording may be read where the present one is not"
      : "";

    return finding(
      "fail",
      // NAMES WHAT WAS LOOKED FOR, because "names no machine-mode flag" alone is read as false by
      // an author whose help plainly contains the word `--json`. A flag documented with a value
      // slot — `--json <file>` — is a flag that takes a filename, and cannot be the bare switch a
      // caller flips to change output shape; that is why it is not counted here.
      //
      // The old message also promised a knock-on effect it no longer has: it said B3 "will be
      // unverified as a result", which stopped being true when B3 became an L1 rule reachable
      // only through a declaration. It is unverified for every undeclared target, whatever this
      // rule finds.
      `help names no machine-mode flag a caller could flip and no schema command: --json, --format and --output are looked for as bare switches, and one documented with a value slot is a flag that takes a value rather than one that selects a mode${nearMiss}${declared}`,
      evidence,
    );
  },
};
