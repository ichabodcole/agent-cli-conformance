/**
 * Exit codes are an API.
 *
 * A caller cannot read prose — it reads the exit status. These values are a published
 * contract: changing one is a breaking change for every script and agent that branches on it.
 * ADD, NEVER RENUMBER.
 *
 * Everything from 124 up is RESERVED and never allocated here, so a delegating CLI can pass a
 * child's exit code through verbatim without collision. 124 is `timeout`'s "time limit reached"
 * and 125 is its (and Docker's) "the wrapper itself failed"; 126, 127 and "greater than 128" are
 * POSIX. A code another convention has already claimed is not ours to allocate, however
 * unassigned it looks from inside this table. See:
 *   docs/wiki/concepts/exit-codes.md
 *   docs/wiki/decisions/exit-codes-below-125.md
 */
export const ExitCode = {
  /** The command did what was asked. */
  Success: 0,
  /** Anything unexpected — a bug, an unhandled shape. The safe default for an unclassified fault. */
  Internal: 1,
  /** The invocation itself was wrong: bad flags, unknown command, bare invocation. */
  Usage: 2,
  /** No usable credential, or one that was rejected. */
  Auth: 3,
  /** Authenticated, but not permitted. */
  Permission: 4,
  /** The named thing does not exist — or exists outside the caller's scope, deliberately
   *  indistinguishable so existence cannot be probed. */
  NotFound: 5,
  /** A precondition failed; the request conflicts with current state. */
  Conflict: 6,
  /** Rate limited. Retryable. */
  RateLimited: 7,
  /** A decision is required that the invocation did not supply. */
  ConfirmationRequired: 8,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * OUTCOME codes — deliberately NOT errors, and deliberately not in ERROR_KINDS.
 *
 * An error means the invocation failed. An outcome means the invocation SUCCEEDED and the
 * answer was negative. `acc check` on a non-conformant target did its job perfectly; the
 * report is accurate, well-formed data and stays on stdout as `ok: true`. But it must still
 * exit non-zero, because non-zero-ness is what makes a finding visible to a harness that does
 * not parse JSON — the argument this catalogue makes for every CLI it checks.
 *
 * The bands: 1-8 = why the INVOCATION failed. 9-123 = what the SUBJECT turned out to be.
 * 124+ = what a CHILD PROCESS did, or what the shell did on our behalf.
 */
export const Outcome = {
  /** The check ran successfully; the target does not conform. */
  NonConformant: 9,
  /**
   * `version --check` ran successfully; the installed kit is behind the newest release.
   *
   * An OUTCOME rather than an error, by this file's own rule: the invocation did its job and the
   * answer was negative. It is non-zero for the reason stated above — non-zero-ness is what makes
   * a finding visible to a harness that does not parse JSON — which is the whole argument for a
   * CI step that fails when the kit doing the checking is stale.
   *
   * ⚠ ADDITIVE TO A STABLE SURFACE. The README promises `0` conformant, `9` not, `1`-`8` the kit
   * failing. This adds a code in the documented 9-123 outcome band rather than reinterpreting an
   * existing one, so nothing that branches on 0/9/1-8 changes meaning. Flagged for review because
   * it touches a published promise at all.
   */
  Stale: 10,
} as const;

export type OutcomeValue = (typeof Outcome)[keyof typeof Outcome];

/** Stable machine identifiers, paired 1:1 with the codes above. The `kind` is the contract; the
 *  message is presentation. */
export const ErrorKind = {
  Internal: "internal",
  Usage: "usage",
  Auth: "auth",
  Permission: "permission",
  NotFound: "not_found",
  Conflict: "conflict",
  RateLimited: "rate_limit",
  ConfirmationRequired: "confirmation_required",
} as const;

export type ErrorKindValue = (typeof ErrorKind)[keyof typeof ErrorKind];

interface KindSpec {
  exit_code: ExitCodeValue;
  retryable: boolean;
  description: string;
}

/** The declared mapping. `acc schema` publishes this, and a conformance check verifies that
 *  provoking each kind actually produces the code promised here. */
export const ERROR_KINDS: Record<ErrorKindValue, KindSpec> = {
  [ErrorKind.Internal]: {
    exit_code: ExitCode.Internal,
    retryable: false,
    description: "An unexpected fault. Not caused by the invocation.",
  },
  [ErrorKind.Usage]: {
    exit_code: ExitCode.Usage,
    retryable: false,
    description: "The invocation was malformed. Retrying it unchanged will fail identically.",
  },
  [ErrorKind.Auth]: {
    exit_code: ExitCode.Auth,
    retryable: false,
    description: "No usable credential, or one that was rejected.",
  },
  [ErrorKind.Permission]: {
    exit_code: ExitCode.Permission,
    retryable: false,
    description: "Authenticated, but this operation is not permitted.",
  },
  [ErrorKind.NotFound]: {
    exit_code: ExitCode.NotFound,
    retryable: false,
    description: "The named resource does not exist.",
  },
  [ErrorKind.Conflict]: {
    exit_code: ExitCode.Conflict,
    retryable: false,
    description: "A precondition failed; the request conflicts with current state.",
  },
  [ErrorKind.RateLimited]: {
    exit_code: ExitCode.RateLimited,
    retryable: true,
    description: "Too many requests. Waiting and retrying is meaningful.",
  },
  [ErrorKind.ConfirmationRequired]: {
    exit_code: ExitCode.ConfirmationRequired,
    retryable: false,
    description: "A decision is required that the invocation did not supply.",
  },
};
