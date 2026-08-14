import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXPECTATIONS_FILE, loadExpectations } from "./expectations.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "acc-expectations-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadExpectations", () => {
  test("a missing file yields empty knownFailures", () => {
    expect(loadExpectations(dir)).toEqual({ knownFailures: {} });
  });

  test("a present file is parsed", () => {
    writeFileSync(
      join(dir, EXPECTATIONS_FILE),
      JSON.stringify({ knownFailures: { A1: "legacy parser" } }),
    );
    expect(loadExpectations(dir)).toEqual({ knownFailures: { A1: "legacy parser" } });
  });

  test("a file missing knownFailures still yields an empty object rather than undefined", () => {
    writeFileSync(join(dir, EXPECTATIONS_FILE), JSON.stringify({}));
    expect(loadExpectations(dir)).toEqual({ knownFailures: {} });
  });
});
