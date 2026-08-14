import { advertisesMachineModeChecker } from "./checkers/discoverability/advertises-machine-mode.ts";
import { bareInvocationChecker } from "./checkers/discoverability/bare-invocation.ts";
import { helpDeterministicChecker } from "./checkers/discoverability/help-deterministic.ts";
import { versionFlagChecker } from "./checkers/discoverability/version-flag.ts";
import { deterministicChecker } from "./checkers/exit-codes/deterministic.ts";
import { helpExitsZeroChecker } from "./checkers/exit-codes/help-exits-zero.ts";
import { usageDistinguishableChecker } from "./checkers/exit-codes/usage-distinguishable.ts";
import { neverBlockChecker } from "./checkers/interactivity/never-block.ts";
import { doubleDashTerminatorChecker } from "./checkers/parsing/double-dash-terminator.ts";
import { namesOffendingTokenChecker } from "./checkers/parsing/names-offending-token.ts";
import { noFuzzyCorrectionChecker } from "./checkers/parsing/no-fuzzy-correction.ts";
import { unexpectedPositionalsChecker } from "./checkers/parsing/unexpected-positionals.ts";
import { unknownCommandChecker } from "./checkers/parsing/unknown-command.ts";
import { unknownFlagChecker } from "./checkers/parsing/unknown-flag.ts";
import { firstBytePromptChecker } from "./checkers/safety/first-byte-prompt.ts";
import { noSecretsInHelpChecker } from "./checkers/safety/no-secrets-in-help.ts";
import { machineOutputParseableChecker } from "./checkers/streams/machine-output-parseable.ts";
import { noAnsiWhenPipedChecker } from "./checkers/streams/no-ansi-when-piped.ts";
import { stdoutCarriesOnlyDataChecker } from "./checkers/streams/stdout-carries-only-data.ts";
import type { Checker } from "./types.ts";

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
  stdoutCarriesOnlyDataChecker,
  noAnsiWhenPipedChecker,
  machineOutputParseableChecker,
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
];
