import { unknownFlagChecker } from "./checkers/parsing/unknown-flag.ts";
import type { Checker } from "./types.ts";

/**
 * Every checker, in rule-id order.
 *
 * The wiki lint cross-checks this against the rule pages in both directions: a checker with no
 * rule page is an undocumented rule, and an `implemented` rule page with no checker file is a
 * promise the kit does not keep.
 */
export const CHECKERS: Checker[] = [unknownFlagChecker];
