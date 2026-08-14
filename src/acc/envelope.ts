import { AccError } from "./errors.ts";
import { ERROR_KINDS, ExitCode, type ExitCodeValue } from "./exit-codes.ts";

/**
 * The output layer. THIS FILE IS THE ONLY PLACE THAT WRITES TO stdout.
 *
 * That is not a convention, it is the mechanism: because there is exactly one writer, a `data`
 * command physically cannot emit two documents, and the whole-stdout-parses-as-JSON rule (B3)
 * holds by construction rather than by vigilance. Any `console.log` added elsewhere breaks the
 * conformance check immediately — which is the point.
 *
 * Contract: docs/wiki/concepts/machine-mode.md · docs/wiki/concepts/error-envelope.md
 */

export type OutputMode = "text" | "json";

/** A command template with typed placeholders, pre-filled where the ids are already known. */
export interface NextAction {
  command: string;
  when?: string;
}

/**
 * Resolve the output mode.
 *
 * Precedence — and note that an explicit flag wins in BOTH directions. A caller must be able
 * to demand machine mode, and equally to demand text mode when detection would have chosen
 * otherwise. Vercel's agent-mode envelope was discovered through a bug caused by detection
 * with no override; users worked around it by faking a PTY.
 *
 *   1. --format text|json  (or --json, its shorthand)
 *   2. ACC_FORMAT env var
 *   3. inference: an agent harness is announced, or stdout is not a terminal
 */
export function resolveMode(explicit?: string): OutputMode {
  if (explicit === "json" || explicit === "text") return explicit;
  const env = process.env.ACC_FORMAT;
  if (env === "json" || env === "text") return env;
  if (process.env.AI_AGENT) return "json";
  return process.stdout.isTTY ? "text" : "json";
}

/**
 * Colour is gated on the STREAM, not on the mode — so `--format text | cat` still emits no
 * escapes. Rule B2 binds whenever stdout is not a terminal, regardless of what was asked for.
 */
export function useColor(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.TERM === "dumb") return false;
  return Boolean(process.stdout.isTTY);
}

export interface SuccessEnvelope<T> {
  ok: true;
  data: T;
  next?: NextAction[];
  meta: { command: string; durationMs?: number };
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    kind: string;
    exit_code: ExitCodeValue;
    retryable: boolean;
    message: string;
    hint?: string;
    choices?: string[];
    details?: Record<string, unknown>;
  };
  meta: { command: string };
}

/** The single stdout write. One document, one trailing newline. */
function writeOut(line: string): void {
  process.stdout.write(`${line}\n`);
}

export function emit<T>(opts: {
  mode: OutputMode;
  command: string;
  data: T;
  /**
   * Human rendering. Never called in json mode, so it may use colour freely via useColor().
   *
   * The assembled envelope is passed alongside the payload for the one command whose human
   * rendering IS the document — `schema`. Without it, the only way to print an enveloped
   * schema in text mode would be to rebuild the envelope outside this file, and the
   * single-writer property (see the header) is what makes rule B3 hold by construction.
   */
  renderText: (data: T, envelope: SuccessEnvelope<T>) => string;
  next?: NextAction[];
  startedAt?: number;
}): void {
  const envelope: SuccessEnvelope<T> = {
    ok: true,
    data: opts.data,
    meta: { command: opts.command },
  };
  if (opts.next?.length) envelope.next = opts.next;
  if (opts.startedAt !== undefined) {
    envelope.meta.durationMs = Math.round(performance.now() - opts.startedAt);
  }
  if (opts.mode === "text") {
    const text = opts.renderText(opts.data, envelope);
    if (text) writeOut(text);
    return;
  }
  writeOut(JSON.stringify(envelope));
}

/**
 * Failures go to stderr, and stdout stays EMPTY (rule B1).
 *
 * The alternative — writing an empty result to stdout alongside the error — is what makes
 * `docker inspect <missing> --format json` print `[]`, so a consumer reading stdout receives a
 * plausible wrong answer instead of a failure.
 */
export function emitError(opts: { mode: OutputMode; command: string; error: unknown }): number {
  const err =
    opts.error instanceof AccError
      ? opts.error
      : new AccError(
          "internal",
          opts.error instanceof Error ? opts.error.message : String(opts.error),
        );

  if (opts.mode === "text") {
    const parts = [`Error: ${err.message}`];
    if (err.hint) parts.push(`  ${err.hint}`);
    if (err.choices?.length) parts.push(`  Valid: ${err.choices.join(", ")}`);
    process.stderr.write(`${parts.join("\n")}\n`);
    return err.exitCode;
  }

  const envelope: ErrorEnvelope = {
    ok: false,
    error: {
      kind: err.kind,
      exit_code: err.exitCode,
      retryable: ERROR_KINDS[err.kind].retryable,
      message: err.message,
    },
    meta: { command: opts.command },
  };
  if (err.hint) envelope.error.hint = err.hint;
  if (err.choices?.length) envelope.error.choices = err.choices;
  if (err.details) envelope.error.details = err.details;
  process.stderr.write(`${JSON.stringify(envelope)}\n`);
  return err.exitCode;
}

export { ExitCode };
