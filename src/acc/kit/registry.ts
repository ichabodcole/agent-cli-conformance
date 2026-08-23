import { advertisesMachineModeChecker } from "./checkers/discoverability/advertises-machine-mode.ts";
import { bareInvocationChecker } from "./checkers/discoverability/bare-invocation.ts";
import { helpDeterministicChecker } from "./checkers/discoverability/help-deterministic.ts";
import { versionFlagChecker } from "./checkers/discoverability/version-flag.ts";
import { deterministicChecker } from "./checkers/exit-codes/deterministic.ts";
import { helpExitsZeroChecker } from "./checkers/exit-codes/help-exits-zero.ts";
import { usageDistinguishableChecker } from "./checkers/exit-codes/usage-distinguishable.ts";
import { neverBlockChecker } from "./checkers/interactivity/never-block.ts";
import { doesNotCrashChecker } from "./checkers/lifecycle/does-not-crash.ts";
import { advertisedValueSetChecker } from "./checkers/parsing/advertised-value-set.ts";
import { doubleDashTerminatorChecker } from "./checkers/parsing/double-dash-terminator.ts";
import { namesOffendingTokenChecker } from "./checkers/parsing/names-offending-token.ts";
import { noFuzzyCorrectionChecker } from "./checkers/parsing/no-fuzzy-correction.ts";
import { unexpectedPositionalsChecker } from "./checkers/parsing/unexpected-positionals.ts";
import { unknownCommandChecker } from "./checkers/parsing/unknown-command.ts";
import { unknownFlagChecker } from "./checkers/parsing/unknown-flag.ts";
import { firstBytePromptChecker } from "./checkers/safety/first-byte-prompt.ts";
import { noSecretsInHelpChecker } from "./checkers/safety/no-secrets-in-help.ts";
import { machineModeHoldsOnParserErrorChecker } from "./checkers/streams/machine-mode-holds-on-parser-error.ts";
import { machineOutputParseableChecker } from "./checkers/streams/machine-output-parseable.ts";
import { noAnsiWhenPipedChecker } from "./checkers/streams/no-ansi-when-piped.ts";
import { stdoutCarriesOnlyDataChecker } from "./checkers/streams/stdout-carries-only-data.ts";
import type { Checker, UncheckedRule } from "./types.ts";

/**
 * Every checker, in rule-id order.
 *
 * The wiki lint cross-checks this against the rule pages in both directions: a checker with no
 * rule page is an undocumented rule, and an `implemented` rule page with no checker file is a
 * promise the kit does not keep.
 */
export const CHECKERS: Checker[] = [
  unknownFlagChecker,
  unknownCommandChecker,
  namesOffendingTokenChecker,
  unexpectedPositionalsChecker,
  noFuzzyCorrectionChecker,
  doubleDashTerminatorChecker,
  advertisedValueSetChecker,
  stdoutCarriesOnlyDataChecker,
  noAnsiWhenPipedChecker,
  machineOutputParseableChecker,
  machineModeHoldsOnParserErrorChecker,
  helpExitsZeroChecker,
  usageDistinguishableChecker,
  deterministicChecker,
  versionFlagChecker,
  bareInvocationChecker,
  advertisesMachineModeChecker,
  helpDeterministicChecker,
  neverBlockChecker,
  noSecretsInHelpChecker,
  firstBytePromptChecker,
  doesNotCrashChecker,
];

/**
 * Every rule the catalogue declares that NO checker in `CHECKERS` answers to — the other half of
 * the corpus, and the half a report used to leave out entirely. See `UncheckedRule`.
 *
 * This list is not the source of truth for which rules those are; the rule pages are, through
 * their `checker_status`. It is the kit's copy, kept here so `kit/` stays free of the wiki, and
 * `registry.test.ts` fails the gate whenever the two disagree in either direction. That is what
 * makes the disclosure general rather than a fix for `B4`: land a new rule page whose checker is
 * still planned, and the suite goes red until the report can say so.
 */
export const UNCHECKED_RULES: UncheckedRule[] = [
  {
    ruleId: "B4",
    rulePath: "docs/wiki/rules/streams/output-is-delivered-whole.md",
    tier: "core",
    deviation: "defect",
    probeLevel: "L1",
  },
];
