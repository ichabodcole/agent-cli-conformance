import { ERROR_KINDS, ErrorKind, type ErrorKindValue, type ExitCodeValue } from "./exit-codes.ts";

/**
 * An error that carries everything the envelope needs.
 *
 * The constructor REQUIRES a `kind`, and the exit code is derived from it rather than passed
 * separately — so a described failure cannot exist without a code, and the two can never
 * disagree. That is the tier-1 half of the contract: the violation is unrepresentable, not
 * merely tested for.
 *
 * An escaping error that is NOT an AccError is by definition an unclassified fault, and the
 * boundary in cli.ts reports it as `internal`. Forgetting to classify therefore produces the
 * honest answer rather than a misleading one.
 */
export class AccError extends Error {
  readonly kind: ErrorKindValue;
  readonly exitCode: ExitCodeValue;
  readonly retryable: boolean;
  /** Remediation the caller can act on. */
  readonly hint?: string;
  /** The valid alternatives, when they form a closed set. An error carrying `choices` is a
   *  just-in-time slice of the schema — the caller self-corrects without a second lookup. */
  readonly choices?: string[];
  /** Structured detail for branching, never prose. */
  readonly details?: Record<string, unknown>;

  constructor(
    kind: ErrorKindValue,
    message: string,
    opts: { hint?: string; choices?: string[]; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "AccError";
    this.kind = kind;
    this.exitCode = ERROR_KINDS[kind].exit_code;
    this.retryable = ERROR_KINDS[kind].retryable;
    if (opts.hint !== undefined) this.hint = opts.hint;
    if (opts.choices !== undefined) this.choices = opts.choices;
    if (opts.details !== undefined) this.details = opts.details;
  }
}

/**
 * The invocation was malformed.
 *
 * `details` is accepted here as well as on `notFoundError` because a usage error can be about a
 * FILE the invocation named — a malformed expectations file is the caller's mistake, not an
 * internal fault, and the path belongs in a field rather than only in the prose message.
 */
export function usageError(
  message: string,
  opts: { hint?: string; choices?: string[]; details?: Record<string, unknown> } = {},
): AccError {
  return new AccError(ErrorKind.Usage, message, opts);
}

/**
 * The named thing does not exist.
 *
 * `choices` is deliberately part of the common path here rather than an afterthought: almost
 * every not-found in this tool has a knowable, closed set of valid names, and handing that set
 * back is what lets a caller fix its own mistake in one step.
 */
export function notFoundError(
  message: string,
  opts: { hint?: string; choices?: string[]; details?: Record<string, unknown> } = {},
): AccError {
  return new AccError(ErrorKind.NotFound, message, opts);
}
