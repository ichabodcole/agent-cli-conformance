import { usageError } from "../errors.ts";

/**
 * TWO THINGS EVERY FILE OPTION SHARES, held in one place so no flag answers differently.
 *
 * The case that produced both: `bunx acc check … --declaration <(your-cli schema)` fails with
 * `no such file: /dev/fd/11`. The descriptor process substitution opens does not reach the process
 * `bunx` starts, while the installed bin reads it fine — measured at bun 1.4.0 on macOS, with and
 * without `--bun`, for `--declaration`, `--recorded-surfaces` and `acc report`
 * (`docs/reports/2026-09-07-the-pdocs-adopter-report.md` § `PD-1`). Stdin does reach it, which is
 * what `-` is for.
 */

/** The path a `-` argument stands for. Stdin is a file here, so every reader downstream is unchanged. */
export const STDIN_PATH = "/dev/stdin";

/**
 * `-` names stdin. Resolved at the option boundary rather than inside each reader, so the readers
 * keep seeing an ordinary path and `resolve()`-ing it — `/dev/stdin` resolves to itself.
 *
 * REFUSED WHEN STDIN IS A TERMINAL: a read of `/dev/stdin` with nothing piped waits for a human
 * to type a document, which looks like a hang. `flag` is for the sentence.
 */
export function fileArg(path: string, flag: string): string {
  if (path !== "-") return path;
  if (process.stdin.isTTY)
    throw usageError(`${flag} - reads stdin, and stdin is a terminal`, {
      hint: "Pipe the document to stdin, or pass a path.",
      details: { flag, reason: "stdin-is-a-terminal" },
    });
  return STDIN_PATH;
}

/**
 * Stdin can be read once. Two options both naming `-` would hand the second an empty stream and
 * a parse error that blames the document; refuse before either is read.
 */
export function refuseTwoStdinArgs(named: Array<[flag: string, path: string | undefined]>): void {
  const onStdin = named.filter(([, p]) => p === "-").map(([f]) => f);
  if (onStdin.length > 1)
    throw usageError(`${onStdin.join(" and ")} both read stdin, and stdin can be read once`, {
      hint: "Pass a path for all but one of them.",
      details: { flags: onStdin, reason: "stdin-named-twice" },
    });
}

const DESCRIPTOR_PATH = /^\/dev\/fd\/\d+$/;

/**
 * The hint for a file the caller named and this process cannot see. A `/dev/fd/N` path that does
 * not exist is a descriptor that never arrived, and "create that file" is the wrong instruction
 * for it; anything else gets the caller's own sentence.
 */
export function missingFileHint(path: string, otherwise: string): string {
  return DESCRIPTOR_PATH.test(path)
    ? "That path is a descriptor this process never received — `bunx` does not carry one opened by process substitution. Pipe the document to stdin and pass `-` in place of the path, or run the installed bin directly (`./node_modules/.bin/acc`)."
    : otherwise;
}
