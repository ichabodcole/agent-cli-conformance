import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * NO SOURCE FILE MAY CONTAIN A RAW NUL BYTE — because one makes the whole file invisible to
 * `grep`, silently and with no error.
 *
 * `grep` classifies a file holding a NUL as binary and, with no `-a`, prints nothing and exits 1.
 * That is indistinguishable from "the string is not there", which is the failure mode this
 * project keeps meeting from the other side: a search that returns nothing read as evidence of
 * absence. Two files carried one between them — `declaration.ts` and `recorded.ts`, from
 * `path.join("\0")` written as a literal byte rather than the escape — and `grep -c formatVersion
 * src/acc/kit/declaration.ts` printed nothing while the string was present seven times.
 *
 * The NUL separator itself is right and stays: joining path segments on a byte no segment can
 * contain is what stops `["a b"]` and `["a", "b"]` colliding. `"\0"` is the same character to the
 * runtime and an ordinary two-character sequence to every tool that reads the file.
 *
 * Scoped to `.ts` under `src` rather than the whole tree: a fixture that deliberately holds
 * arbitrary bytes is a legitimate thing to have, and this rule is about SOURCE being searchable.
 */

const SRC = resolve(import.meta.dir, "..", "..", "..", "src");

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsFiles(p);
    return e.isFile() && e.name.endsWith(".ts") ? [p] : [];
  });
}

describe("source files stay searchable", () => {
  test("no .ts file under src contains a raw NUL byte", () => {
    const files = tsFiles(SRC);
    // Guard the guard: a walker that found nothing would pass this vacuously, which is the same
    // silent-empty-result defect the rule itself is about.
    expect(files.length).toBeGreaterThan(50);
    const offenders = files
      .filter((f) => readFileSync(f).includes(0))
      .map((f) => f.slice(SRC.length - 3));
    expect(offenders).toEqual([]);
  });

  test("the escape and the raw byte are the same character, so the fix costs nothing", () => {
    // Stated as an executable fact rather than a comment, because the whole repair rests on it:
    // if these differed, rewriting the literal would have changed the dedup key's behaviour.
    expect(["a", "b"].join("\0")).toEqual(`a${String.fromCharCode(0)}b`);
    // And the property the separator exists for survives it.
    expect(["a b"].join("\0")).not.toEqual(["a", "b"].join("\0"));
  });
});
