import { doubleDashTerminatorChecker } from "./checkers/parsing/double-dash-terminator.ts";
import { namesOffendingTokenChecker } from "./checkers/parsing/names-offending-token.ts";
import { noFuzzyCorrectionChecker } from "./checkers/parsing/no-fuzzy-correction.ts";
import { unexpectedPositionalsChecker } from "./checkers/parsing/unexpected-positionals.ts";
import { unknownCommandChecker } from "./checkers/parsing/unknown-command.ts";
import { unknownFlagChecker } from "./checkers/parsing/unknown-flag.ts";
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
];
