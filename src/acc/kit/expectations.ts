import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const EXPECTATIONS_FILE = ".acc-expectations.json";

export interface Expectations {
  /** Rule ids whose failure is currently accepted, each with a reason. */
  knownFailures: Record<string, string>;
}

/**
 * Known failures live in a per-project file that RATCHETS DOWN — never as edits to the shared
 * checker corpus. Borrowed from Web Platform Tests: it lets a project adopt the kit today
 * without a wall of red, while keeping every outstanding failure named and visible.
 *
 * The file only ever shrinks. Nothing in the kit adds to it automatically.
 */
export function loadExpectations(dir: string): Expectations {
  const path = join(dir, EXPECTATIONS_FILE);
  if (!existsSync(path)) return { knownFailures: {} };
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<Expectations>;
  return { knownFailures: raw.knownFailures ?? {} };
}
