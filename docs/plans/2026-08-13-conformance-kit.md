# Conformance Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `acc check <binary>`, which runs the L0 conformance probes against any CLI — in any language, with no cooperation from it — and reports which of the 19 rules it satisfies.

**Architecture:** Two strictly separated phases. **Record** spawns the target and captures structured `Observation`s (argv, both streams, exit code, timing). **Check** runs pure functions over the recorded history and never spawns anything. Checkers declare the invocations they need; the runner deduplicates and executes them once. The payoff is that a new rule becomes a new checker over data already collected, rather than a new test in every project.

**Tech Stack:** Bun 1.3+, TypeScript (strict), `commander` 15 (already present), `bun:test`. No new runtime dependencies.

**Spec:** `docs/wiki/` — the 19 rule pages ARE the specification. Each has a `## The probe` section that this plan implements verbatim. Start at [`docs/wiki/index.md`](../wiki/index.md); read the rule page before writing its checker.

## Global Constraints

- **Bun 1.3+**, TypeScript `strict: true`. Run `bun run check` before every commit — it gates typecheck, biome, docs-lint, and tests.
- **Biome formatting**: 2-space indent, 100-column line width. Run `bun run lint:fix` before committing.
- **No new runtime dependencies.** The kit uses only `node:*` builtins and what `acc` already has.
- **All stdout writes go through `src/acc/envelope.ts`.** Rule B3 holds by construction because there is exactly one writer; adding a second breaks the self-check.
- **Exit codes stay below 125** (`src/acc/exit-codes.ts`). The 125+ band is reserved.
- **Checkers MUST be pure over `History`.** A checker that spawns a process is a plan violation — it breaks dedup, reproducibility, and the ability to re-check a stored history.
- **L0 only.** The runner refuses any invocation it cannot prove inert. `L1`/`L2` are out of scope for this plan.
- **Three verdicts, never two:** `pass`, `fail`, `unverified`. A probe that could not run reports `unverified`. Reporting it as a pass is the same defect as a CLI reporting success for work it did not do.
- **Every checker needs a negative control.** A test proving a checker _detects_ the violation, and a test proving it does _not_ fire on the conforming fixture. A checker only verified against passing input is unverified itself.

---

## File Structure

```
src/acc/kit/
  types.ts          Invocation, Observation, History, Discovery, Finding, Checker, Verdict
  inert.ts          the safety gate — classifies an Invocation as inert or refuses it
  runner.ts         spawn + capture + in-process deadline + time-to-first-byte
  discovery.ts      parse the target's help to find subcommands and flags
  record.ts         collect probe requests from checkers, dedupe, run, build History
  registry.ts       every checker, in one array
  report.ts         aggregate Findings into a Report; apply expectations
  expectations.ts   load/apply .acc-expectations.json (the ratchet)
  checkers/
    parsing/        A1 A2 A3 A4 A5 A6
    streams/        B1 B2 B3
    exit-codes/     C1 C2 C3
    discoverability/ D1 D2 D3 D4
    interactivity/  E1
    safety/         F1 F2
  fixtures/
    conforming.ts   a minimal CLI that satisfies every rule
    broken/         one deliberately-broken CLI per failure class
src/acc/commands/check.ts   the `acc check` command
```

**Why `src/acc/kit/` and not `scripts/checkers/`:** the checkers are part of `acc`, not standalone scripts. Task 1 updates the 19 rule pages' `checker:` frontmatter accordingly.

---

### Task 1: Kit types, the inertness gate, and the checker-status ratchet

The safety gate comes first because every later task depends on it. The runner must be unable to execute something dangerous even if a checker asks it to.

**Files:**

- Create: `src/acc/kit/types.ts`
- Create: `src/acc/kit/inert.ts`
- Create: `src/acc/kit/inert.test.ts`
- Modify: `docs/wiki/lint.ts` (point `CHECKERS_DIR` at the new location, honour `checker_status`)
- Modify: all 19 files under `docs/wiki/rules/**/*.md` (frontmatter only)
- Modify: `docs/wiki/SCHEMA.md` (document `checker_status`)

**Interfaces:**

- Consumes: nothing.
- Produces: `Invocation`, `Observation`, `Discovery`, `History`, `Verdict`, `Finding`, `Checker`, `SENTINEL`, `classifyInertness(inv: Invocation): Inertness`, `assertInert(inv: Invocation): void`.

- [ ] **Step 1: Write `src/acc/kit/types.ts`**

```ts
/** A single planned invocation of the target binary. Built only by probe helpers. */
export interface Invocation {
  /** Arguments after the binary path. */
  args: string[];
  /** Environment overrides layered onto the parent env. */
  env?: Record<string, string>;
  /** Why this invocation is safe to run. The runner refuses anything unclassified. */
  inertness: "help-path" | "sentinel" | "no-verb";
  /** Human-readable reason this probe exists; appears in findings as evidence. */
  purpose: string;
}

/** What actually happened. The unit the whole kit reasons over. */
export interface Observation {
  /** Stable id derived from args + env, so two checkers asking for the same probe share one. */
  id: string;
  invocation: Invocation;
  stdout: string;
  stderr: string;
  /** null when the deadline killed it — a process we killed did not choose its status. */
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  /** null when nothing was ever written. */
  timeToFirstByteMs: number | null;
}

/** What could be learned about the target's surface before probing it. */
export interface Discovery {
  /** Subcommand names parsed from root help. Empty when none could be found. */
  subcommands: string[];
  /** Long flags parsed from root help, including leading dashes. */
  flags: string[];
  /** A machine-mode flag if one was advertised (`--json`, `--format`). */
  machineModeFlag: string | null;
  /** True when root help was readable at all. Everything above is meaningless if false. */
  helpReadable: boolean;
}

export interface TargetInfo {
  /** Path as given by the caller. */
  path: string;
  /** Argv used to launch it, e.g. ["bun", "cli.ts"] or ["/usr/local/bin/gh"]. */
  argv0: string[];
}

export interface History {
  target: TargetInfo;
  discovery: Discovery;
  observations: Observation[];
  /** Lookup by Invocation id. */
  byId: Map<string, Observation>;
}

/**
 * Three outcomes, never two. `unverified` means the probe could not run — the target had no
 * subcommand to nest under, no machine-mode flag to test. A probe that could not run is not a
 * probe that succeeded.
 */
export type Verdict = "pass" | "fail" | "unverified";

export interface Finding {
  ruleId: string;
  verdict: Verdict;
  /** One line. What was observed, in terms a reader can act on. */
  detail: string;
  /** Observation ids backing the verdict, so any finding can be traced to raw evidence. */
  evidence: string[];
}

/**
 * A rule's executable half.
 *
 * `probes` declares what needs recording; `check` is PURE over the resulting history and must
 * never spawn. That separation is what lets two checkers share one recorded invocation, and
 * what lets a stored history be re-checked against new rules later.
 */
export interface Checker {
  ruleId: string;
  /** Wiki path, quoted in output so a failure points at the rule that explains it. */
  rulePath: string;
  tier: "core" | "diagnostic";
  probes: (d: Discovery) => Invocation[];
  check: (h: History) => Finding;
}
```

- [ ] **Step 2: Write the failing test for the inertness gate**

Create `src/acc/kit/inert.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { assertInert, classifyInertness, SENTINEL } from "./inert.ts";
import type { Invocation } from "./types.ts";

const inv = (args: string[], inertness: Invocation["inertness"]): Invocation => ({
  args,
  inertness,
  purpose: "test",
});

describe("classifyInertness", () => {
  test("accepts a pure help path", () => {
    expect(classifyInertness(inv(["--help"], "help-path"))).toBe("help-path");
    expect(classifyInertness(inv(["--version"], "help-path"))).toBe("help-path");
  });

  test("accepts an invocation carrying the sentinel", () => {
    expect(classifyInertness(inv([`--${SENTINEL}-flag`], "sentinel"))).toBe("sentinel");
  });

  test("accepts a flag-only invocation with no verb", () => {
    expect(classifyInertness(inv(["--frmat", "json"], "no-verb"))).toBe("no-verb");
  });

  // THE IMPORTANT ONE. A checker that mislabels a real command as inert must be refused,
  // not trusted. The gate fails closed.
  test("REFUSES a claimed help-path that carries a real verb", () => {
    expect(() => assertInert(inv(["deploy", "--help"], "help-path"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed sentinel invocation with no sentinel in it", () => {
    expect(() => assertInert(inv(["deploy", "--force"], "sentinel"))).toThrow(/not inert/i);
  });

  test("REFUSES a claimed no-verb invocation that has a verb", () => {
    expect(() => assertInert(inv(["deploy", "--frmat"], "no-verb"))).toThrow(/not inert/i);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `bun test src/acc/kit/inert.test.ts`
Expected: FAIL — `Cannot find module './inert.ts'`

- [ ] **Step 4: Write `src/acc/kit/inert.ts`**

```ts
import type { Invocation } from "./types.ts";

/**
 * A token no real CLI has a flag or verb for. Probes that need a guaranteed-invalid argument
 * build it from this, which is also what makes them provably inert.
 */
export const SENTINEL = "acc-probe-xyzzy";

const HELP_TOKENS = new Set(["--help", "-h", "help", "--version", "-V", "-v"]);

/**
 * Prove an invocation is inert, or refuse it.
 *
 * The kit runs against binaries it knows nothing about, some of which spawn daemons, call live
 * APIs, or delete things. L0's guarantee is that it only ever runs help paths and
 * deliberately-invalid invocations — commands that a conforming CLI performs no work for.
 *
 * This gate FAILS CLOSED: a checker's own claim about its probe is treated as a hypothesis and
 * verified against the args, never trusted. A mislabelled probe is a bug in a checker; the cost
 * of trusting it is damage to someone's project.
 */
export function classifyInertness(inv: Invocation): Invocation["inertness"] | null {
  const hasSentinel = inv.args.some((a) => a.includes(SENTINEL));
  const looksLikeFlag = (a: string) => a.startsWith("-");
  const verbs = inv.args.filter((a) => !looksLikeFlag(a));

  switch (inv.inertness) {
    case "help-path":
      // Every argument must be a help/version token. `deploy --help` is NOT a help path: an
      // unknown-subcommand handler could route it anywhere.
      return inv.args.every((a) => HELP_TOKENS.has(a)) ? "help-path" : null;
    case "sentinel":
      return hasSentinel ? "sentinel" : null;
    case "no-verb":
      // No positional at all, so there is no command to execute even if a flag parses.
      return verbs.length === 0 ? "no-verb" : null;
    default:
      return null;
  }
}

export function assertInert(inv: Invocation): void {
  if (classifyInertness(inv) === null) {
    throw new Error(
      `refusing to run: invocation is not inert (claimed "${inv.inertness}"): ${inv.args.join(" ")}`,
    );
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `bun test src/acc/kit/inert.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Add `checker_status` to the wiki contract**

In `docs/wiki/SCHEMA.md`, in the "Rule pages carry extra frontmatter" section, add to the YAML block:

```yaml
checker_status: planned # planned | implemented
```

And add this paragraph directly beneath that block:

```markdown
`checker_status` is the ratchet. A rule may declare its `checker` path before the file exists;
the lint only requires the file once the status is `implemented`. The count of `planned` rules
is the remaining work, and it only ever goes down.
```

- [ ] **Step 7: Point the lint at the new location and honour the status**

In `docs/wiki/lint.ts`, change:

```ts
const CHECKERS_DIR = join(REPO_ROOT, "scripts/checkers");
```

to:

```ts
const CHECKERS_DIR = join(REPO_ROOT, "src/acc/kit/checkers");
```

Then, inside `ruleChecks`, replace the checker-existence block with:

```ts
    const checker = page.fields.get("checker");
    if (!checker) {
      problems.push(`MISSING checker ${page.rel}  (name the file that enforces this rule)`);
      continue;
    }
    const status = page.fields.get("checker_status");
    if (status !== "planned" && status !== "implemented")
      problems.push(`BAD checker_status ${page.rel}: "${status ?? ""}" not in {planned, implemented}`);
    declaredCheckers.add(checker);
    // Only an `implemented` rule owes a file. `planned` is the ratchet: declare the path now,
    // land the checker later, and the count of planned rules is the visible remaining work.
    if (status === "implemented" && !existsSync(join(REPO_ROOT, checker)))
      problems.push(`MISSING CHECKER ${page.rel}: declares "${checker}", which does not exist`);
```

- [ ] **Step 8: Update all 19 rule pages**

For each file under `docs/wiki/rules/`, rewrite the `checker:` line to point at `src/acc/kit/checkers/...` (same category and filename, new prefix) and add `checker_status: planned` immediately after it. Example, in `docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md`:

```yaml
checker: src/acc/kit/checkers/parsing/unknown-flag.ts
checker_status: planned
```

The 19 target paths:

```
parsing/unknown-flag.ts              parsing/unknown-command.ts
parsing/names-offending-token.ts     parsing/unexpected-positionals.ts
parsing/no-fuzzy-correction.ts       parsing/double-dash-terminator.ts
streams/stdout-carries-only-data.ts  streams/no-ansi-when-piped.ts
streams/machine-output-parseable.ts  exit-codes/help-exits-zero.ts
exit-codes/usage-distinguishable.ts  exit-codes/deterministic.ts
discoverability/version-flag.ts      discoverability/bare-invocation.ts
discoverability/advertises-machine-mode.ts  discoverability/help-deterministic.ts
interactivity/never-block.ts         safety/no-secrets-in-help.ts
safety/first-byte-prompt.ts
```

- [ ] **Step 9: Run the full gate**

Run: `bun run lint:fix && bun run format:md && bun run check`
Expected: PASS. The checker directory does not exist yet, so the reverse check stays dormant; every rule is `planned`, so no rule owes a file.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(kit): types, the fail-closed inertness gate, and the checker ratchet

The gate lands before the runner deliberately. The kit runs against
binaries it knows nothing about, so a checker's claim that its probe is
inert is treated as a hypothesis and verified against the args — never
trusted. A mislabelled probe is a bug in a checker; trusting it costs
someone their containers.

checker_status makes the remaining work visible and monotonic: a rule may
declare its checker path before the file exists, and the count of planned
rules only goes down."
```

---

### Task 2: The runner, and the fixtures that prove it works

**Files:**

- Create: `src/acc/kit/runner.ts`
- Create: `src/acc/kit/runner.test.ts`
- Create: `src/acc/kit/fixtures/conforming.ts`
- Create: `src/acc/kit/fixtures/broken/exits-zero-on-unknown-flag.ts`

**Interfaces:**

- Consumes: `Invocation`, `Observation`, `TargetInfo`, `assertInert` (Task 1).
- Produces: `runProbe(target: TargetInfo, inv: Invocation, timeoutMs?: number): Promise<Observation>`, `invocationId(inv: Invocation): string`, and two fixture CLIs invoked as `["bun", "<path>"]`.

- [ ] **Step 1: Write the conforming fixture**

Create `src/acc/kit/fixtures/conforming.ts`:

```ts
#!/usr/bin/env bun
// A minimal CLI that satisfies every L0 rule. The kit's POSITIVE control: any checker firing
// against this is a false positive, which is the failure mode that makes a gate untrustworthy.
const args = process.argv.slice(2);
const HELP = `usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
  --help     Show help.
  --version  Show version.
`;

function fail(message: string): never {
  process.stderr.write(`${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message } })}\n`);
  process.exit(2);
}

if (args.length === 0) fail("no command given");
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.includes("--version")) {
  process.stdout.write("1.0.0\n");
  process.exit(0);
}

const known = new Set(["--json"]);
const flags = args.filter((a) => a.startsWith("-"));
for (const f of flags) if (!known.has(f)) fail(`unknown option '${f}'`);

const verbs = args.filter((a) => !a.startsWith("-"));
if (verbs[0] !== "list") fail(`unknown command '${verbs[0]}'`);
if (verbs.length > 1) fail(`too many arguments: '${verbs[1]}'`);

process.stdout.write(`${JSON.stringify({ ok: true, data: { items: [] }, meta: { command: "list" } })}\n`);
```

- [ ] **Step 2: Write the first broken fixture**

Create `src/acc/kit/fixtures/broken/exits-zero-on-unknown-flag.ts`:

```ts
#!/usr/bin/env bun
// NEGATIVE CONTROL for A1: accepts any flag, exits 0, and silently falls back to text output.
// This is the citty behaviour, reproduced deliberately.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write("usage: broken <command> [--json]\n\nOptions:\n  --json\n  --help\n");
  process.exit(0);
}
if (args.length === 0) {
  process.stdout.write("usage: broken <command>\n");
  process.exit(0); // also violates D2, deliberately
}
process.stdout.write("did the thing\n");
process.exit(0);
```

- [ ] **Step 3: Write the failing test for the runner**

Create `src/acc/kit/runner.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { invocationId, runProbe } from "./runner.ts";
import type { Invocation, TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFORMING: TargetInfo = {
  path: join(HERE, "fixtures/conforming.ts"),
  argv0: ["bun", join(HERE, "fixtures/conforming.ts")],
};

const inv = (args: string[], inertness: Invocation["inertness"]): Invocation => ({
  args,
  inertness,
  purpose: "test",
});

describe("runProbe", () => {
  test("captures stdout, exit code and timing for a help path", async () => {
    const o = await runProbe(CONFORMING, inv(["--help"], "help-path"));
    expect(o.exitCode).toBe(0);
    expect(o.stdout).toContain("usage:");
    expect(o.stderr).toBe("");
    expect(o.timedOut).toBe(false);
    expect(o.timeToFirstByteMs).toBeGreaterThanOrEqual(0);
  });

  test("keeps the two streams separate", async () => {
    const o = await runProbe(CONFORMING, inv(["--acc-probe-xyzzy-flag"], "sentinel"));
    expect(o.exitCode).toBe(2);
    expect(o.stdout).toBe("");
    expect(o.stderr).toContain("acc-probe-xyzzy");
  });

  test("refuses a non-inert invocation rather than running it", async () => {
    await expect(runProbe(CONFORMING, inv(["list", "--help"], "help-path"))).rejects.toThrow(
      /not inert/i,
    );
  });

  test("reports a timeout as exitCode null, never as a signal code", async () => {
    const sleeper: TargetInfo = { path: "sleep", argv0: ["sleep", "30"] };
    const o = await runProbe(sleeper, inv(["--acc-probe-xyzzy"], "sentinel"), 300);
    expect(o.timedOut).toBe(true);
    expect(o.exitCode).toBeNull();
  });

  test("closes stdin so a target waiting on input cannot hang", async () => {
    const o = await runProbe(CONFORMING, inv(["--help"], "help-path"));
    expect(o.timedOut).toBe(false);
  });
});

describe("invocationId", () => {
  test("is stable for identical invocations and differs otherwise", () => {
    expect(invocationId(inv(["--help"], "help-path"))).toBe(
      invocationId(inv(["--help"], "help-path")),
    );
    expect(invocationId(inv(["--help"], "help-path"))).not.toBe(
      invocationId(inv(["--version"], "help-path")),
    );
  });

  test("distinguishes invocations that differ only by env", () => {
    const a: Invocation = { args: ["--help"], inertness: "help-path", purpose: "p" };
    const b: Invocation = { ...a, env: { AI_AGENT: "probe" } };
    expect(invocationId(a)).not.toBe(invocationId(b));
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `bun test src/acc/kit/runner.test.ts`
Expected: FAIL — `Cannot find module './runner.ts'`

- [ ] **Step 5: Write `src/acc/kit/runner.ts`**

```ts
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { assertInert } from "./inert.ts";
import type { Invocation, Observation, TargetInfo } from "./types.ts";

/** Stable id over everything that affects the result, so two checkers asking for the same
 *  probe share one recording. */
export function invocationId(inv: Invocation): string {
  const material = JSON.stringify({ args: inv.args, env: inv.env ?? {} });
  return createHash("sha256").update(material).digest("hex").slice(0, 12);
}

export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Run one probe and record what happened.
 *
 * Deadline is enforced IN-PROCESS. Shelling out to `timeout(1)` is a trap: it is GNU coreutils
 * and absent on stock macOS, where the call yields 127 and the probe silently measures nothing
 * while appearing to pass.
 *
 * stdin is closed immediately, so a target that waits for input hits the deadline instead of
 * hanging forever — which is itself the E1 finding.
 */
export async function runProbe(
  target: TargetInfo,
  inv: Invocation,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Observation> {
  assertInert(inv);

  const [cmd, ...base] = target.argv0;
  if (!cmd) throw new Error("target has an empty argv0");

  return new Promise<Observation>((resolve) => {
    const startedAt = performance.now();
    let firstByteAt: number | null = null;
    const child = spawn(cmd, [...base, ...inv.args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...inv.env },
    });

    let stdout = "";
    let stderr = "";
    const mark = () => {
      if (firstByteAt === null) firstByteAt = performance.now();
    };
    child.stdout.on("data", (d) => {
      mark();
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      mark();
      stderr += d;
    });
    child.stdin.end();

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const finish = (code: number | null) => {
      clearTimeout(timer);
      resolve({
        id: invocationId(inv),
        invocation: inv,
        stdout,
        stderr,
        // A process WE killed did not choose its status. Recording 128+n as the target's exit
        // code would fabricate evidence about a tool that never got to exit.
        exitCode: timedOut ? null : code,
        timedOut,
        durationMs: Math.round(performance.now() - startedAt),
        timeToFirstByteMs: firstByteAt === null ? null : Math.round(firstByteAt - startedAt),
      });
    };

    child.on("close", finish);
    // A target that cannot be spawned at all (ENOENT) is an observation too, not a crash.
    child.on("error", () => finish(127));
  });
}
```

- [ ] **Step 6: Run the tests**

Run: `bun test src/acc/kit/runner.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): the probe runner, plus conforming and broken fixtures

The deadline is enforced in-process rather than via timeout(1), which is
GNU coreutils and absent on macOS — invoking it yields 127 and the probe
silently measures nothing while appearing to pass. A killed process
records exitCode null, because it never chose a status and recording
128+n would fabricate evidence.

The broken fixture is not decoration: a checker verified only against
conforming input is itself unverified."
```

---

### Task 3: Discovery

**Files:**

- Create: `src/acc/kit/discovery.ts`
- Create: `src/acc/kit/discovery.test.ts`

**Interfaces:**

- Consumes: `runProbe` (Task 2), `Discovery`, `TargetInfo`.
- Produces: `discover(target: TargetInfo): Promise<Discovery>`, `parseHelp(text: string): Omit<Discovery, "helpReadable">`.

- [ ] **Step 1: Write the failing test**

Create `src/acc/kit/discovery.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discover, parseHelp } from "./discovery.ts";
import type { TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFORMING: TargetInfo = {
  path: join(HERE, "fixtures/conforming.ts"),
  argv0: ["bun", join(HERE, "fixtures/conforming.ts")],
};

describe("parseHelp", () => {
  test("finds long flags", () => {
    const d = parseHelp("Options:\n  --json     Machine output.\n  --help\n");
    expect(d.flags).toContain("--json");
    expect(d.flags).toContain("--help");
  });

  test("finds subcommands under a Commands heading", () => {
    const d = parseHelp("Commands:\n  list   List things.\n  show   Show one.\n");
    expect(d.subcommands).toEqual(["list", "show"]);
  });

  test("identifies an advertised machine-mode flag", () => {
    expect(parseHelp("  --json  JSON output\n").machineModeFlag).toBe("--json");
    expect(parseHelp("  --format <fmt>\n").machineModeFlag).toBe("--format");
    expect(parseHelp("  --verbose\n").machineModeFlag).toBeNull();
  });

  // Discovery must not invent structure. Finding nothing is a legitimate result, and it is
  // what makes downstream checkers report `unverified` rather than passing vacuously.
  test("returns empty results for help it cannot parse", () => {
    const d = parseHelp("this program does things\n");
    expect(d.subcommands).toEqual([]);
    expect(d.flags).toEqual([]);
  });
});

describe("discover", () => {
  test("reads the conforming fixture's surface", async () => {
    const d = await discover(CONFORMING);
    expect(d.helpReadable).toBe(true);
    expect(d.subcommands).toContain("list");
    expect(d.machineModeFlag).toBe("--json");
  });

  test("reports helpReadable false when the target cannot be run", async () => {
    const d = await discover({ path: "nope", argv0: ["/nonexistent-acc-xyz"] });
    expect(d.helpReadable).toBe(false);
    expect(d.subcommands).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test src/acc/kit/discovery.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/acc/kit/discovery.ts`**

```ts
import { runProbe } from "./runner.ts";
import type { Discovery, Invocation, TargetInfo } from "./types.ts";

const MACHINE_FLAGS = ["--json", "--format", "--output"];

/**
 * Parse a help screen heuristically.
 *
 * Deliberately conservative: finding nothing is a legitimate result. Guessing a subcommand
 * that does not exist would make the kit run an invocation it cannot classify, and guessing a
 * flag that does not exist would produce false findings. Downstream, an empty discovery turns
 * dependent probes into `unverified` — an honest "could not check" rather than a vacuous pass.
 */
export function parseHelp(text: string): Omit<Discovery, "helpReadable"> {
  const flags = [...new Set([...text.matchAll(/(?<![\w-])(--[a-z][a-z0-9-]*)/gi)].map((m) => m[1] as string))];

  const subcommands: string[] = [];
  const lines = text.split("\n");
  let inCommands = false;
  for (const line of lines) {
    if (/^\s*(commands|subcommands|available commands):/i.test(line)) {
      inCommands = true;
      continue;
    }
    // A blank line or a new heading ends the block.
    if (inCommands && (line.trim() === "" || /^[A-Za-z].*:$/.test(line.trim()))) {
      inCommands = false;
      continue;
    }
    if (!inCommands) continue;
    const m = /^\s+([a-z][a-z0-9:_-]*)(\s{2,}|$)/i.exec(line);
    if (m?.[1]) subcommands.push(m[1]);
  }

  const machineModeFlag = MACHINE_FLAGS.find((f) => flags.includes(f)) ?? null;
  return { subcommands, flags, machineModeFlag };
}

export async function discover(target: TargetInfo): Promise<Discovery> {
  const inv: Invocation = {
    args: ["--help"],
    inertness: "help-path",
    purpose: "discover the target's command surface",
  };
  const o = await runProbe(target, inv);
  // Help on stderr still tells us the surface; only an empty or failed run does not.
  const text = o.stdout || o.stderr;
  if (o.timedOut || text.trim() === "") {
    return { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false };
  }
  return { ...parseHelp(text), helpReadable: true };
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test src/acc/kit/discovery.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): heuristic discovery of the target's surface

Conservative by design: finding nothing is a legitimate result. Inventing
a subcommand would make the kit run an invocation it cannot classify as
inert, and inventing a flag produces false findings. An empty discovery
turns dependent probes into 'unverified' — an honest could-not-check
rather than a vacuous pass."
```

---

### Task 4: The record phase

**Files:**

- Create: `src/acc/kit/record.ts`
- Create: `src/acc/kit/record.test.ts`

**Interfaces:**

- Consumes: `discover` (Task 3), `runProbe`/`invocationId` (Task 2), `Checker`, `History`.
- Produces: `record(target: TargetInfo, checkers: Checker[]): Promise<History>`.

- [ ] **Step 1: Write the failing test**

Create `src/acc/kit/record.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "./record.ts";
import type { Checker, Finding, History, Invocation, TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFORMING: TargetInfo = {
  path: join(HERE, "fixtures/conforming.ts"),
  argv0: ["bun", join(HERE, "fixtures/conforming.ts")],
};

const helpProbe: Invocation = {
  args: ["--help"],
  inertness: "help-path",
  purpose: "shared help probe",
};

function stubChecker(ruleId: string, probes: Invocation[]): Checker {
  return {
    ruleId,
    rulePath: `docs/wiki/rules/stub/${ruleId}.md`,
    tier: "core",
    probes: () => probes,
    check: (h: History): Finding => ({
      ruleId,
      verdict: "pass",
      detail: `${h.observations.length} observations`,
      evidence: [],
    }),
  };
}

describe("record", () => {
  test("runs each distinct invocation exactly once, even across checkers", async () => {
    const h = await record(CONFORMING, [
      stubChecker("X1", [helpProbe]),
      stubChecker("X2", [helpProbe]), // same probe — must not run twice
    ]);
    const helpRuns = h.observations.filter((o) => o.invocation.args.join(" ") === "--help");
    expect(helpRuns).toHaveLength(1);
  });

  test("indexes observations by invocation id", async () => {
    const h = await record(CONFORMING, [stubChecker("X1", [helpProbe])]);
    for (const o of h.observations) expect(h.byId.get(o.id)).toBe(o);
  });

  test("passes discovery to each checker's probe builder", async () => {
    let seenSubcommands: string[] = [];
    const spy: Checker = {
      ...stubChecker("X1", []),
      probes: (d) => {
        seenSubcommands = d.subcommands;
        return [];
      },
    };
    await record(CONFORMING, [spy]);
    expect(seenSubcommands).toContain("list");
  });

  test("a checker requesting a non-inert probe fails the RUN, not silently", async () => {
    const rogue = stubChecker("X9", [
      { args: ["list", "--help"], inertness: "help-path", purpose: "mislabelled" },
    ]);
    await expect(record(CONFORMING, [rogue])).rejects.toThrow(/not inert/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test src/acc/kit/record.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/acc/kit/record.ts`**

```ts
import { discover } from "./discovery.ts";
import { invocationId, runProbe } from "./runner.ts";
import type { Checker, History, Invocation, Observation, TargetInfo } from "./types.ts";

/**
 * Phase one: run every probe any checker asked for, exactly once.
 *
 * Checkers declare what they need and never spawn anything themselves. That buys three things:
 * shared probes are recorded once rather than per-checker; a history can be stored and
 * re-checked against rules written later; and `check` stays a pure function, which is the only
 * reason the checker tests can be fast and deterministic.
 */
export async function record(target: TargetInfo, checkers: Checker[]): Promise<History> {
  const discovery = await discover(target);

  const wanted = new Map<string, Invocation>();
  for (const checker of checkers) {
    for (const inv of checker.probes(discovery)) {
      const id = invocationId(inv);
      if (!wanted.has(id)) wanted.set(id, inv);
    }
  }

  // Sequential, not parallel. Concurrent probes against an unknown binary can contend for the
  // same lock, port, or config file, and a flaky observation is worse than a slow one.
  const observations: Observation[] = [];
  for (const inv of wanted.values()) {
    observations.push(await runProbe(target, inv));
  }

  return {
    target,
    discovery,
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test src/acc/kit/record.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): the record phase — declare probes, run each once

Probes run sequentially rather than in parallel: concurrent invocations of
an unknown binary can contend for the same lock, port or config file, and a
flaky observation is worse than a slow one."
```

---

### Task 5: The checker contract, proven end-to-end with A1

This is the pattern every remaining checker follows. Get it right here.

**Files:**

- Create: `src/acc/kit/checkers/parsing/unknown-flag.ts`
- Create: `src/acc/kit/checkers/parsing/unknown-flag.test.ts`
- Create: `src/acc/kit/registry.ts`
- Modify: `docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md` (`checker_status: implemented`)

**Interfaces:**

- Consumes: `Checker`, `Finding`, `History`, `SENTINEL`, `record`.
- Produces: `unknownFlagChecker: Checker`, `CHECKERS: Checker[]`, and the helper `findByArgs(h, args): Observation | undefined` exported from `src/acc/kit/types.ts`.

- [ ] **Step 1: Add the lookup helper to `src/acc/kit/types.ts`**

Append:

```ts
/** Find a recorded observation by the exact args it was run with. */
export function findByArgs(h: History, args: string[]): Observation | undefined {
  const key = args.join("�");
  return h.observations.find((o) => o.invocation.args.join("�") === key);
}
```

- [ ] **Step 2: Write the failing test**

Create `src/acc/kit/checkers/parsing/unknown-flag.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { unknownFlagChecker } from "./unknown-flag.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("A1 — unknown flags must exit non-zero", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.verdict).toBe("pass");
  });

  // The negative control. A checker verified only against passing input has proved nothing
  // about its ability to detect anything.
  test("FAILS a CLI that accepts an unknown flag and exits 0", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exit");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `bun test src/acc/kit/checkers/parsing/unknown-flag.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the checker**

Create `src/acc/kit/checkers/parsing/unknown-flag.ts`:

```ts
import { SENTINEL } from "../../inert.ts";
import { findByArgs } from "../../types.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

const PROBE_ARGS = [`--${SENTINEL}-flag`];

/** A1 — docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md */
export const unknownFlagChecker: Checker = {
  ruleId: "A1",
  rulePath: "docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md",
  tier: "core",

  probes: (): Invocation[] => [
    {
      args: PROBE_ARGS,
      inertness: "sentinel",
      purpose: "A1: an unrecognised flag must be rejected",
    },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, PROBE_ARGS);
    if (!o) {
      return { ruleId: "A1", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    if (o.timedOut) {
      return {
        ruleId: "A1",
        verdict: "fail",
        detail: "hung on an unknown flag instead of rejecting it",
        evidence: [o.id],
      };
    }

    const problems: string[] = [];
    if (o.exitCode === 0) problems.push("exit code was 0");
    if (o.stdout !== "") problems.push(`stdout was not empty (${o.stdout.length} bytes)`);
    if (!o.stderr.includes(SENTINEL)) problems.push("stderr did not name the offending flag");

    return problems.length
      ? { ruleId: "A1", verdict: "fail", detail: problems.join("; "), evidence: [o.id] }
      : {
          ruleId: "A1",
          verdict: "pass",
          detail: `rejected with exit ${o.exitCode}, stdout empty, flag named`,
          evidence: [o.id],
        };
  },
};
```

- [ ] **Step 5: Create the registry**

Create `src/acc/kit/registry.ts`:

```ts
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
```

- [ ] **Step 6: Run the tests**

Run: `bun test src/acc/kit/checkers/`
Expected: PASS, 3 tests.

- [ ] **Step 7: Flip the rule page to implemented**

In `docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md`, change `checker_status: planned` to `checker_status: implemented`.

- [ ] **Step 8: Run the full gate**

Run: `bun run lint:fix && bun run check`
Expected: PASS. The checkers directory now exists, so the reverse check activates — `unknown-flag.ts` is declared by A1, so it is documented; the other 18 rules are still `planned` and owe nothing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(kit): the checker contract, proven end-to-end with A1

Establishes the pattern: probes() declares, check() is pure over History,
and every finding cites the observation ids backing it so any verdict can
be traced to raw evidence.

The negative-control test is the load-bearing one. A checker verified only
against conforming input has proved nothing about its ability to detect
anything — which is how a gate becomes reassuring and useless."
```

---

### Task 6: Remaining parsing checkers (A2–A6)

**Files:**

- Create: `src/acc/kit/checkers/parsing/{unknown-command,names-offending-token,unexpected-positionals,no-fuzzy-correction,double-dash-terminator}.ts` and a `.test.ts` beside each
- Create: `src/acc/kit/fixtures/broken/accepts-extra-positionals.ts`
- Modify: `src/acc/kit/registry.ts`, the five rule pages

**Interfaces:**

- Consumes: everything from Task 5.
- Produces: `unknownCommandChecker`, `namesOffendingTokenChecker`, `unexpectedPositionalsChecker`, `noFuzzyCorrectionChecker`, `doubleDashTerminatorChecker`.

- [ ] **Step 1: Write the second broken fixture**

Create `src/acc/kit/fixtures/broken/accepts-extra-positionals.ts`:

```ts
#!/usr/bin/env bun
// NEGATIVE CONTROL for A4 and A2: rejects unknown FLAGS correctly, but accepts any verb and
// any number of positionals at exit 0. This is the cobra shape.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write("usage: broken2 <command>\n\nCommands:\n  list   List things.\n\nOptions:\n  --json\n  --help\n");
  process.exit(0);
}
if (args.length === 0) {
  process.stderr.write("usage: broken2 <command>\n");
  process.exit(2);
}
for (const a of args) {
  if (a.startsWith("-") && a !== "--json") {
    process.stderr.write(`error: unknown option '${a}'\n`);
    process.exit(2);
  }
}
process.stdout.write("{}\n");
process.exit(0);
```

- [ ] **Step 2: Write A2 — unknown command**

Create `src/acc/kit/checkers/parsing/unknown-command.ts`:

```ts
import { SENTINEL } from "../../inert.ts";
import { findByArgs } from "../../types.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";

const ROOT = [`${SENTINEL}-verb`];
const nested = (sub: string) => [sub, `${SENTINEL}-verb`];

/** A2 — docs/wiki/rules/parsing/unknown-command-exits-nonzero.md */
export const unknownCommandChecker: Checker = {
  ruleId: "A2",
  rulePath: "docs/wiki/rules/parsing/unknown-command-exits-nonzero.md",
  tier: "core",

  probes: (d: Discovery): Invocation[] => {
    const list: Invocation[] = [
      { args: ROOT, inertness: "sentinel", purpose: "A2: unknown root verb" },
    ];
    // The nested case is where parsers actually let one through — cobra validates only the
    // root. Probe it only when a real subcommand was discovered.
    if (d.subcommands[0]) {
      list.push({
        args: nested(d.subcommands[0]),
        inertness: "sentinel",
        purpose: "A2: unknown nested verb",
      });
    }
    return list;
  },

  check: (h: History): Finding => {
    const root = findByArgs(h, ROOT);
    if (!root) {
      return { ruleId: "A2", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    const evidence = [root.id];
    const problems: string[] = [];
    if (root.exitCode === 0) problems.push("unknown root verb exited 0");
    if (root.stdout !== "") problems.push("unknown root verb wrote to stdout");

    const sub = h.discovery.subcommands[0];
    const nestedObs = sub ? findByArgs(h, nested(sub)) : undefined;
    if (nestedObs) {
      evidence.push(nestedObs.id);
      if (nestedObs.exitCode === 0) problems.push(`unknown nested verb under "${sub}" exited 0`);
      if (nestedObs.stdout !== "") problems.push(`unknown nested verb under "${sub}" wrote to stdout`);
    }

    if (problems.length) {
      return { ruleId: "A2", verdict: "fail", detail: problems.join("; "), evidence };
    }
    // A probe that could not run is not a probe that succeeded — say so rather than implying
    // the nested case was checked.
    return nestedObs
      ? { ruleId: "A2", verdict: "pass", detail: "root and nested unknown verbs rejected", evidence }
      : {
          ruleId: "A2",
          verdict: "unverified",
          detail: "root verb rejected; no subcommand discovered, so the nested case is unchecked",
          evidence,
        };
  },
};
```

- [ ] **Step 3: Write A2's test**

Create `src/acc/kit/checkers/parsing/unknown-command.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { unknownCommandChecker } from "./unknown-command.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("A2 — unknown commands must exit non-zero", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [unknownCommandChecker]);
    expect(unknownCommandChecker.check(h).verdict).toBe("pass");
  });

  test("FAILS a CLI that accepts any verb", async () => {
    const h = await record(fixture("broken/accepts-extra-positionals.ts"), [unknownCommandChecker]);
    const f = unknownCommandChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exited 0");
  });
});
```

- [ ] **Step 4: Run A2's tests**

Run: `bun test src/acc/kit/checkers/parsing/unknown-command.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write A3 — errors name the offending token**

Create `src/acc/kit/checkers/parsing/names-offending-token.ts`:

```ts
import { SENTINEL } from "../../inert.ts";
import { findByArgs } from "../../types.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

const FLAG = [`--${SENTINEL}-flag`];
const VERB = [`${SENTINEL}-verb`];

/** A3 — docs/wiki/rules/parsing/errors-name-the-offending-token.md */
export const namesOffendingTokenChecker: Checker = {
  ruleId: "A3",
  rulePath: "docs/wiki/rules/parsing/errors-name-the-offending-token.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: FLAG, inertness: "sentinel", purpose: "A3: the rejection must name the flag" },
    { args: VERB, inertness: "sentinel", purpose: "A3: the rejection must name the verb" },
  ],

  check: (h: History): Finding => {
    const flag = findByArgs(h, FLAG);
    const verb = findByArgs(h, VERB);
    if (!flag || !verb) {
      return { ruleId: "A3", verdict: "unverified", detail: "probes were not recorded", evidence: [] };
    }
    const evidence = [flag.id, verb.id];
    const problems: string[] = [];
    // The sentinel is distinctive enough that a match is evidence the tool echoed it, not
    // coincidence.
    if (!flag.stderr.includes(SENTINEL)) problems.push("flag rejection did not name the flag");
    if (!verb.stderr.includes(SENTINEL)) problems.push("verb rejection did not name the verb");
    return problems.length
      ? { ruleId: "A3", verdict: "fail", detail: problems.join("; "), evidence }
      : { ruleId: "A3", verdict: "pass", detail: "both rejections named the offending token", evidence };
  },
};
```

- [ ] **Step 6: Write A4 — unexpected positionals**

Create `src/acc/kit/checkers/parsing/unexpected-positionals.ts`:

```ts
import { SENTINEL } from "../../inert.ts";
import { findByArgs } from "../../types.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";

const argsFor = (sub: string) => [sub, `${SENTINEL}-extra-one`, `${SENTINEL}-extra-two`];

/** A4 — docs/wiki/rules/parsing/unexpected-positionals-rejected.md */
export const unexpectedPositionalsChecker: Checker = {
  ruleId: "A4",
  rulePath: "docs/wiki/rules/parsing/unexpected-positionals-rejected.md",
  tier: "core",

  probes: (d: Discovery): Invocation[] =>
    d.subcommands[0]
      ? [
          {
            args: argsFor(d.subcommands[0]),
            inertness: "sentinel",
            purpose: "A4: extra positionals must be rejected",
          },
        ]
      : [],

  check: (h: History): Finding => {
    const sub = h.discovery.subcommands[0];
    if (!sub) {
      return {
        ruleId: "A4",
        verdict: "unverified",
        detail: "no subcommand discovered, so arity could not be probed",
        evidence: [],
      };
    }
    const o = findByArgs(h, argsFor(sub));
    if (!o) {
      return { ruleId: "A4", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    const problems: string[] = [];
    if (o.exitCode === 0) problems.push("extra positionals were accepted at exit 0");
    if (o.stdout !== "") problems.push("extra positionals produced stdout");
    return problems.length
      ? { ruleId: "A4", verdict: "fail", detail: problems.join("; "), evidence: [o.id] }
      : { ruleId: "A4", verdict: "pass", detail: `rejected with exit ${o.exitCode}`, evidence: [o.id] };
  },
};
```

- [ ] **Step 7: Write A5 — no fuzzy auto-correction**

Create `src/acc/kit/checkers/parsing/no-fuzzy-correction.ts`:

```ts
import { findByArgs } from "../../types.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";

/** Drop one character — the edit a fuzzy matcher is most likely to "fix". */
function nearMiss(token: string): string {
  const body = token.replace(/^-+/, "");
  const dashes = token.slice(0, token.length - body.length);
  return `${dashes}${body.slice(0, 2)}${body.slice(3)}`;
}

/** A5 — docs/wiki/rules/parsing/no-fuzzy-auto-correction.md */
export const noFuzzyCorrectionChecker: Checker = {
  ruleId: "A5",
  rulePath: "docs/wiki/rules/parsing/no-fuzzy-auto-correction.md",
  tier: "core",

  probes: (d: Discovery): Invocation[] => {
    // Only flags, and only at root with no verb: a near-miss VERB could be corrected into a
    // real command that does real work, which is not inert.
    const flag = d.flags.find((f) => f.length > 5 && f !== "--help" && f !== "--version");
    if (!flag) return [];
    const typo = nearMiss(flag);
    if (d.flags.includes(typo)) return []; // the "typo" is a real flag; not a probe
    return [{ args: [typo], inertness: "no-verb", purpose: `A5: near-miss of ${flag}` }];
  },

  check: (h: History): Finding => {
    const o = h.observations.find((x) => x.invocation.purpose.startsWith("A5:"));
    if (!o) {
      return {
        ruleId: "A5",
        verdict: "unverified",
        detail: "no suitable flag was discovered to build a near-miss from",
        evidence: [],
      };
    }
    return o.exitCode === 0
      ? {
          ruleId: "A5",
          verdict: "fail",
          detail: `a near-miss flag was accepted at exit 0 (${o.invocation.args.join(" ")})`,
          evidence: [o.id],
        }
      : {
          ruleId: "A5",
          verdict: "pass",
          detail: `near-miss rejected with exit ${o.exitCode}`,
          evidence: [o.id],
        };
  },
};
```

- [ ] **Step 8: Write A6 — the `--` terminator**

Create `src/acc/kit/checkers/parsing/double-dash-terminator.ts`:

```ts
import { SENTINEL } from "../../inert.ts";
import { findByArgs } from "../../types.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

const ARGS = ["--", `--${SENTINEL}-value`];

/** A6 — docs/wiki/rules/parsing/double-dash-terminator.md (diagnostic) */
export const doubleDashTerminatorChecker: Checker = {
  ruleId: "A6",
  rulePath: "docs/wiki/rules/parsing/double-dash-terminator.md",
  tier: "diagnostic",

  probes: (): Invocation[] => [
    { args: ARGS, inertness: "sentinel", purpose: "A6: `--` must end option parsing" },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, ARGS);
    if (!o) {
      return { ruleId: "A6", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    // Inverted assertion: after `--`, the token is a VALUE, so it must not be reported as an
    // unknown option. The command may still fail for other reasons (no verb given), which is
    // why the check reads stderr rather than the exit code.
    const treatedAsFlag = /unknown (option|flag)/i.test(o.stderr) && o.stderr.includes(SENTINEL);
    return treatedAsFlag
      ? {
          ruleId: "A6",
          verdict: "fail",
          detail: "a value after `--` was still parsed as an option",
          evidence: [o.id],
        }
      : { ruleId: "A6", verdict: "pass", detail: "`--` ended option parsing", evidence: [o.id] };
  },
};
```

- [ ] **Step 9: Write tests for A3–A6**

For each of A3, A4, A5, A6 create a `.test.ts` beside it following the A2 shape exactly: a `PASSES the conforming fixture` case and a `FAILS` case against `broken/accepts-extra-positionals.ts` (for A4) or `broken/exits-zero-on-unknown-flag.ts` (for A3, A5). For A6 the broken fixtures both pass it, so assert `pass` on conforming and add:

```ts
  test("reports unverified when no probe was recorded", () => {
    const empty = {
      target: { path: "x", argv0: ["x"] },
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
      byId: new Map(),
    };
    expect(doubleDashTerminatorChecker.check(empty).verdict).toBe("unverified");
  });
```

- [ ] **Step 10: Register all five**

In `src/acc/kit/registry.ts`, import and add each checker to `CHECKERS`, ordered by rule id.

- [ ] **Step 11: Run everything, flip the five rule pages, gate, commit**

```bash
bun test src/acc/kit/
# then set checker_status: implemented in the five rule pages
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): parsing checkers A2-A6

A5 probes near-miss FLAGS only, never verbs, and only with no verb present:
a corrected verb could execute real work, which is not inert. A6 inverts
the usual assertion — it asserts the ABSENCE of a rejection — so it reads
stderr rather than the exit code, since the command may legitimately fail
for unrelated reasons."
```

---

### Task 7: Stream checkers (B1–B3)

**Files:**

- Create: `src/acc/kit/checkers/streams/{stdout-carries-only-data,no-ansi-when-piped,machine-output-parseable}.ts` + tests
- Create: `src/acc/kit/fixtures/broken/writes-errors-to-stdout.ts`
- Modify: `src/acc/kit/registry.ts`, three rule pages

**Interfaces:**

- Consumes: Task 5 contract.
- Produces: `stdoutCarriesOnlyDataChecker`, `noAnsiWhenPipedChecker`, `machineOutputParseableChecker`.

- [ ] **Step 1: Write the broken fixture**

Create `src/acc/kit/fixtures/broken/writes-errors-to-stdout.ts`:

```ts
#!/usr/bin/env bun
// NEGATIVE CONTROL for B1 and B2: rejects unknown flags with a non-zero exit (so A1 passes),
// but writes an empty result to STDOUT alongside the error, and colours it. This is the
// `docker inspect <missing> --format json` shape: a plausible wrong answer on the success
// channel.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write("usage: broken3 <command>\n\nCommands:\n  list   List things.\n\nOptions:\n  --json\n  --help\n");
  process.exit(0);
}
if (args.length === 0) {
  process.stderr.write("usage: broken3 <command>\n");
  process.exit(2);
}
for (const a of args) {
  if (a.startsWith("-") && a !== "--json") {
    process.stdout.write("[]\n"); // the defect
    process.stderr.write(`\x1b[31merror: unknown option '${a}'\x1b[0m\n`); // and ANSI
    process.exit(2);
  }
}
process.stdout.write("[]\n");
process.exit(0);
```

- [ ] **Step 2: Write B1**

Create `src/acc/kit/checkers/streams/stdout-carries-only-data.ts`:

```ts
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { SENTINEL } from "../../inert.ts";

/** B1 — docs/wiki/rules/streams/stdout-carries-only-data.md */
export const stdoutCarriesOnlyDataChecker: Checker = {
  ruleId: "B1",
  rulePath: "docs/wiki/rules/streams/stdout-carries-only-data.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "B1: failure via bad flag" },
    { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "B1: failure via bad verb" },
  ],

  check: (h: History): Finding => {
    const failures = h.observations.filter(
      (o) => o.invocation.purpose.startsWith("B1:") && o.exitCode !== 0 && !o.timedOut,
    );
    if (failures.length === 0) {
      return {
        ruleId: "B1",
        verdict: "unverified",
        detail: "no failing invocation was produced, so stdout could not be checked on failure",
        evidence: [],
      };
    }
    const polluted = failures.filter((o) => o.stdout !== "");
    return polluted.length
      ? {
          ruleId: "B1",
          verdict: "fail",
          // The dangerous case: a consumer reading stdout receives an answer, not an error.
          detail: `${polluted.length} failing invocation(s) wrote to stdout, e.g. ${JSON.stringify(polluted[0]?.stdout.slice(0, 40))}`,
          evidence: polluted.map((o) => o.id),
        }
      : {
          ruleId: "B1",
          verdict: "pass",
          detail: `stdout empty across ${failures.length} failing invocation(s)`,
          evidence: failures.map((o) => o.id),
        };
  },
};
```

- [ ] **Step 3: Write B2**

Create `src/acc/kit/checkers/streams/no-ansi-when-piped.ts`:

```ts
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching ESC is the assertion
const ANSI = /\x1b\[/;

/** B2 — docs/wiki/rules/streams/no-ansi-when-piped.md */
export const noAnsiWhenPipedChecker: Checker = {
  ruleId: "B2",
  rulePath: "docs/wiki/rules/streams/no-ansi-when-piped.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "B2: help must be escape-free" },
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "B2: errors must be escape-free" },
  ],

  check: (h: History): Finding => {
    // Every probe here was captured to a pipe, so the target was never writing to a TTY.
    const relevant = h.observations.filter((o) => o.invocation.purpose.startsWith("B2:"));
    if (relevant.length === 0) {
      return { ruleId: "B2", verdict: "unverified", detail: "probes were not recorded", evidence: [] };
    }
    const offenders = relevant.filter((o) => ANSI.test(o.stdout) || ANSI.test(o.stderr));
    return offenders.length
      ? {
          ruleId: "B2",
          verdict: "fail",
          detail: `${offenders.length} invocation(s) emitted ANSI escapes with no terminal attached`,
          evidence: offenders.map((o) => o.id),
        }
      : {
          ruleId: "B2",
          verdict: "pass",
          detail: `no escapes across ${relevant.length} invocation(s)`,
          evidence: relevant.map((o) => o.id),
        };
  },
};
```

- [ ] **Step 4: Write B3**

Create `src/acc/kit/checkers/streams/machine-output-parseable.ts`:

```ts
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";

const parses = (s: string): boolean => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};
const parsesAsNdjson = (s: string): boolean => {
  const lines = s.trim().split("\n").filter(Boolean);
  return lines.length > 0 && lines.every(parses);
};

/** B3 — docs/wiki/rules/streams/machine-output-is-parseable.md */
export const machineOutputParseableChecker: Checker = {
  ruleId: "B3",
  rulePath: "docs/wiki/rules/streams/machine-output-is-parseable.md",
  tier: "core",

  probes: (d: Discovery): Invocation[] =>
    d.machineModeFlag === "--json"
      ? [{ args: ["--help", "--json"], inertness: "help-path", purpose: "B3: machine-mode help" }]
      : [],

  check: (h: History): Finding => {
    if (h.discovery.machineModeFlag === null) {
      return {
        ruleId: "B3",
        verdict: "unverified",
        detail: "no machine-mode flag was advertised in help, so there is nothing to parse",
        evidence: [],
      };
    }
    const o = h.observations.find((x) => x.invocation.purpose.startsWith("B3:"));
    if (!o || o.stdout.trim() === "") {
      return {
        ruleId: "B3",
        verdict: "unverified",
        detail: "machine-mode probe produced no stdout",
        evidence: o ? [o.id] : [],
      };
    }
    if (parses(o.stdout)) {
      return { ruleId: "B3", verdict: "pass", detail: "whole stdout parses as one document", evidence: [o.id] };
    }
    // Nothing was DECLARED, so NDJSON is a plausible legitimate design. Failing it here would
    // punish a tool for a choice it was never asked to state. Hard check arrives at L1.
    if (parsesAsNdjson(o.stdout)) {
      return {
        ruleId: "B3",
        verdict: "unverified",
        detail: "stdout is NDJSON, not one document; no output_kind declared to check against",
        evidence: [o.id],
      };
    }
    return {
      ruleId: "B3",
      verdict: "fail",
      detail: "machine-mode stdout is neither one JSON document nor NDJSON",
      evidence: [o.id],
    };
  },
};
```

- [ ] **Step 5: Write the three tests, register, flip pages, gate, commit**

Each test follows the A2 shape. `writes-errors-to-stdout.ts` is the negative control for both B1 and B2. For B3, assert `unverified` against a fixture whose help advertises no machine flag — add a one-line variant fixture if needed.

```bash
bun test src/acc/kit/
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): stream checkers B1-B3

B1's negative control reproduces the docker inspect shape: a non-zero exit
AND an empty result on stdout, so a consumer reading the success channel
receives a plausible wrong answer rather than a failure.

B3 downgrades NDJSON to unverified rather than failing it. Nothing was
declared, so a stream is a plausible legitimate design; failing a tool for
a choice it was never asked to state is a false positive."
```

---

### Task 8: Exit-code checkers (C1–C3)

**Files:**

- Create: `src/acc/kit/checkers/exit-codes/{help-exits-zero,usage-distinguishable,deterministic}.ts` + tests
- Modify: `src/acc/kit/registry.ts`, three rule pages

**Interfaces:**

- Produces: `helpExitsZeroChecker`, `usageDistinguishableChecker`, `deterministicChecker`.

- [ ] **Step 1: Write C1**

```ts
// src/acc/kit/checkers/exit-codes/help-exits-zero.ts
import { findByArgs } from "../../types.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

/** C1 — docs/wiki/rules/exit-codes/help-exits-zero.md */
export const helpExitsZeroChecker: Checker = {
  ruleId: "C1",
  rulePath: "docs/wiki/rules/exit-codes/help-exits-zero.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "C1: --help" },
    { args: ["-h"], inertness: "help-path", purpose: "C1: -h" },
  ],

  check: (h: History): Finding => {
    const long = findByArgs(h, ["--help"]);
    if (!long) {
      return { ruleId: "C1", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    const problems: string[] = [];
    if (long.exitCode !== 0) problems.push(`--help exited ${long.exitCode}`);
    if (long.stdout.trim() === "") problems.push("--help wrote nothing to stdout");
    return problems.length
      ? { ruleId: "C1", verdict: "fail", detail: problems.join("; "), evidence: [long.id] }
      : { ruleId: "C1", verdict: "pass", detail: "help exits 0 on stdout", evidence: [long.id] };
  },
};
```

- [ ] **Step 2: Write C2**

```ts
// src/acc/kit/checkers/exit-codes/usage-distinguishable.ts
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

/** C2 — docs/wiki/rules/exit-codes/usage-errors-are-distinguishable.md */
export const usageDistinguishableChecker: Checker = {
  ruleId: "C2",
  rulePath: "docs/wiki/rules/exit-codes/usage-errors-are-distinguishable.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "C2: usage error via flag" },
    { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "C2: usage error via verb" },
  ],

  check: (h: History): Finding => {
    const usage = h.observations.filter((o) => o.invocation.purpose.startsWith("C2:") && !o.timedOut);
    if (usage.length < 2) {
      return { ruleId: "C2", verdict: "unverified", detail: "probes were not recorded", evidence: [] };
    }
    const evidence = usage.map((o) => o.id);
    const codes = usage.map((o) => o.exitCode);
    if (codes.some((c) => c === 0)) {
      return { ruleId: "C2", verdict: "fail", detail: `a usage error exited 0 (${codes.join(",")})`, evidence };
    }
    if (new Set(codes).size !== 1) {
      return {
        ruleId: "C2",
        verdict: "fail",
        detail: `the same error class produced different codes (${codes.join(",")})`,
        evidence,
      };
    }
    // Distinguishability from an INTERNAL fault cannot be established black-box: there is no
    // safe general way to provoke one. Say so rather than implying it was checked.
    return codes[0] === 2
      ? {
          ruleId: "C2",
          verdict: "pass",
          detail: "usage errors use exit 2 consistently; internal-fault contrast unverified at L0",
          evidence,
        }
      : {
          ruleId: "C2",
          verdict: "unverified",
          detail: `usage errors are consistent at exit ${codes[0]}, but not the declared 2, and no taxonomy was declared`,
          evidence,
        };
  },
};
```

- [ ] **Step 3: Write C3**

```ts
// src/acc/kit/checkers/exit-codes/deterministic.ts
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

// Three distinct arg vectors that are semantically identical, so the runner's dedup does not
// collapse them into one recording.
const REPEATS = [1, 2, 3].map((n) => [`--${SENTINEL}-repeat-${n}`]);

/** C3 — docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md */
export const deterministicChecker: Checker = {
  ruleId: "C3",
  rulePath: "docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md",
  tier: "core",

  probes: (): Invocation[] =>
    REPEATS.map((args, i) => ({
      args,
      inertness: "sentinel" as const,
      purpose: `C3: repeat ${i + 1}`,
    })),

  check: (h: History): Finding => {
    const runs = h.observations.filter((o) => o.invocation.purpose.startsWith("C3:"));
    if (runs.length < 3) {
      return { ruleId: "C3", verdict: "unverified", detail: "fewer than three runs recorded", evidence: [] };
    }
    const codes = runs.map((o) => o.exitCode);
    const evidence = runs.map((o) => o.id);
    return new Set(codes).size === 1
      ? {
          ruleId: "C3",
          verdict: "pass",
          // Three runs is a smoke test, not proof. Report what was done, not what it implies.
          detail: `three equivalent invocations all exited ${codes[0]}`,
          evidence,
        }
      : { ruleId: "C3", verdict: "fail", detail: `exit codes varied: ${codes.join(",")}`, evidence };
  },
};
```

- [ ] **Step 4: Tests, register, flip pages, gate, commit**

```bash
bun test src/acc/kit/
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): exit-code checkers C1-C3

C2 reports 'unverified' for the half it genuinely cannot establish: there
is no safe general way to provoke an internal fault in an arbitrary binary,
so distinguishability from one is unchecked at L0. Claiming otherwise
would be the same defect the spec exists to prevent."
```

---

### Task 9: Discoverability checkers (D1–D4)

**Files:**

- Create: `src/acc/kit/checkers/discoverability/{version-flag,bare-invocation,advertises-machine-mode,help-deterministic}.ts` + tests
- Modify: `src/acc/kit/registry.ts`, four rule pages

**Interfaces:**

- Produces: `versionFlagChecker`, `bareInvocationChecker`, `advertisesMachineModeChecker`, `helpDeterministicChecker`.

- [ ] **Step 1: Write D1**

```ts
// src/acc/kit/checkers/discoverability/version-flag.ts
import { findByArgs } from "../../types.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

/** D1 — docs/wiki/rules/discoverability/version-flag-exists.md */
export const versionFlagChecker: Checker = {
  ruleId: "D1",
  rulePath: "docs/wiki/rules/discoverability/version-flag-exists.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: ["--version"], inertness: "help-path", purpose: "D1: --version" },
    {
      args: ["--version"],
      // Same args, hostile env: verifies the no-configuration requirement. The runner's id
      // includes env, so this is a distinct recording rather than a dedup collision.
      env: { HOME: "/nonexistent-acc-probe", XDG_CONFIG_HOME: "/nonexistent-acc-probe" },
      inertness: "help-path",
      purpose: "D1: --version with no usable HOME",
    },
  ],

  check: (h: History): Finding => {
    const runs = h.observations.filter((o) => o.invocation.purpose.startsWith("D1:"));
    const plain = runs.find((o) => !o.invocation.env);
    const hostile = runs.find((o) => o.invocation.env);
    if (!plain) {
      return { ruleId: "D1", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    const problems: string[] = [];
    if (plain.exitCode !== 0) problems.push(`--version exited ${plain.exitCode}`);
    if (plain.stdout.trim() === "") problems.push("--version wrote nothing to stdout");
    if (hostile && hostile.exitCode !== 0) {
      problems.push("--version requires configuration (failed with an unusable HOME)");
    }
    const evidence = runs.map((o) => o.id);
    return problems.length
      ? { ruleId: "D1", verdict: "fail", detail: problems.join("; "), evidence }
      : { ruleId: "D1", verdict: "pass", detail: "version reported with no configuration", evidence };
  },
};
```

- [ ] **Step 2: Write D2**

```ts
// src/acc/kit/checkers/discoverability/bare-invocation.ts
import { findByArgs } from "../../types.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

/** D2 — docs/wiki/rules/discoverability/bare-invocation-is-a-usage-error.md */
export const bareInvocationChecker: Checker = {
  ruleId: "D2",
  rulePath: "docs/wiki/rules/discoverability/bare-invocation-is-a-usage-error.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: [], inertness: "no-verb", purpose: "D2: bare invocation" },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, []);
    if (!o) {
      return { ruleId: "D2", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    if (o.timedOut) {
      return { ruleId: "D2", verdict: "fail", detail: "bare invocation hung", evidence: [o.id] };
    }
    const problems: string[] = [];
    // The failure this catches: `mycli $UNSET_VAR` reports success for an operation that never
    // ran, and the help text on stdout looks like output.
    if (o.exitCode === 0) problems.push("bare invocation exited 0");
    if (o.stdout !== "") problems.push(`bare invocation wrote ${o.stdout.length} bytes to stdout`);
    return problems.length
      ? { ruleId: "D2", verdict: "fail", detail: problems.join("; "), evidence: [o.id] }
      : { ruleId: "D2", verdict: "pass", detail: `usage error, exit ${o.exitCode}, stdout empty`, evidence: [o.id] };
  },
};
```

- [ ] **Step 3: Write D3 and D4**

```ts
// src/acc/kit/checkers/discoverability/advertises-machine-mode.ts
import type { Checker, Finding, History, Invocation } from "../../types.ts";

/** D3 — docs/wiki/rules/discoverability/help-advertises-machine-mode.md (diagnostic) */
export const advertisesMachineModeChecker: Checker = {
  ruleId: "D3",
  rulePath: "docs/wiki/rules/discoverability/help-advertises-machine-mode.md",
  tier: "diagnostic",
  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "D3: help mentions machine mode" },
  ],
  check: (h: History): Finding => {
    if (!h.discovery.helpReadable) {
      return { ruleId: "D3", verdict: "unverified", detail: "help was not readable", evidence: [] };
    }
    const o = h.observations.find((x) => x.invocation.purpose.startsWith("D3:"));
    const evidence = o ? [o.id] : [];
    const text = `${o?.stdout ?? ""}${o?.stderr ?? ""}`;
    return h.discovery.machineModeFlag !== null || /\bschema\b/.test(text)
      ? {
          ruleId: "D3",
          verdict: "pass",
          detail: `help advertises ${h.discovery.machineModeFlag ?? "schema"}`,
          evidence,
        }
      : {
          ruleId: "D3",
          verdict: "fail",
          // This also disables B3: an undiscoverable feature is, to the kit, an absent one.
          detail: "help names no machine-mode flag or schema command",
          evidence,
        };
  },
};
```

```ts
// src/acc/kit/checkers/discoverability/help-deterministic.ts
import type { Checker, Finding, History, Invocation } from "../../types.ts";

const VARIANTS = ["--help", "-h"];

/** D4 — docs/wiki/rules/discoverability/help-output-is-deterministic.md */
export const helpDeterministicChecker: Checker = {
  ruleId: "D4",
  rulePath: "docs/wiki/rules/discoverability/help-output-is-deterministic.md",
  tier: "core",

  // Two runs of the SAME invocation would be deduplicated by the runner, so determinism is
  // probed through a distinct env that must not affect help.
  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "D4: help run A" },
    { args: ["--help"], env: { ACC_PROBE_NONCE: "1" }, inertness: "help-path", purpose: "D4: help run B" },
  ],

  check: (h: History): Finding => {
    const runs = h.observations.filter((o) => o.invocation.purpose.startsWith("D4:"));
    if (runs.length < 2) {
      return { ruleId: "D4", verdict: "unverified", detail: "fewer than two runs recorded", evidence: [] };
    }
    const [a, b] = runs;
    const evidence = runs.map((o) => o.id);
    if (a?.stdout === b?.stdout) {
      return { ruleId: "D4", verdict: "pass", detail: "help output identical across runs", evidence };
    }
    const firstDiff = [...(a?.stdout ?? "")].findIndex((c, i) => c !== (b?.stdout ?? "")[i]);
    return {
      ruleId: "D4",
      verdict: "fail",
      // Report the DIFF location, not just the fact: a timestamp is a different problem from
      // wholesale reordering, and the fix differs accordingly.
      detail: `help output differed between runs, first at byte ${firstDiff}`,
      evidence,
    };
  },
};
```

- [ ] **Step 4: Tests, register, flip pages, gate, commit**

```bash
bun test src/acc/kit/
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): discoverability checkers D1-D4

D1's second probe runs --version with an unusable HOME: a version that
needs configuration cannot serve as the safe first call against an unknown
build. D4 probes determinism through a distinct env rather than a repeated
invocation, because the runner deduplicates identical probes by design."
```

---

### Task 10: Interactivity and safety checkers (E1, F1, F2)

**Files:**

- Create: `src/acc/kit/checkers/interactivity/never-block.ts` + test
- Create: `src/acc/kit/checkers/safety/{no-secrets-in-help,first-byte-prompt}.ts` + tests
- Create: `src/acc/kit/fixtures/broken/hangs-waiting-for-input.ts`
- Modify: `src/acc/kit/registry.ts`, three rule pages

**Interfaces:**

- Produces: `neverBlockChecker`, `noSecretsInHelpChecker`, `firstBytePromptChecker`.

- [ ] **Step 1: Write the hanging fixture**

```ts
#!/usr/bin/env bun
// NEGATIVE CONTROL for E1: waits for input that will never come, because stdin is closed.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write("usage: hangs\n\nOptions:\n  --help\n");
  process.exit(0);
}
process.stderr.write("Continue? [y/N] ");
await new Promise(() => {}); // never resolves
```

- [ ] **Step 2: Write E1**

```ts
// src/acc/kit/checkers/interactivity/never-block.ts
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

/** E1 — docs/wiki/rules/interactivity/never-block-without-a-tty.md */
export const neverBlockChecker: Checker = {
  ruleId: "E1",
  rulePath: "docs/wiki/rules/interactivity/never-block-without-a-tty.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: [], inertness: "no-verb", purpose: "E1: bare" },
    { args: ["--help"], inertness: "help-path", purpose: "E1: help" },
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "E1: bad flag" },
  ],

  check: (h: History): Finding => {
    const runs = h.observations.filter((o) => o.invocation.purpose.startsWith("E1:"));
    if (runs.length === 0) {
      return { ruleId: "E1", verdict: "unverified", detail: "probes were not recorded", evidence: [] };
    }
    const hung = runs.filter((o) => o.timedOut);
    return hung.length
      ? {
          ruleId: "E1",
          verdict: "fail",
          detail: `${hung.length} invocation(s) never terminated with stdin closed`,
          evidence: hung.map((o) => o.id),
        }
      : {
          ruleId: "E1",
          verdict: "pass",
          detail: `all ${runs.length} invocation(s) terminated`,
          evidence: runs.map((o) => o.id),
        };
  },
};
```

- [ ] **Step 3: Write F1**

```ts
// src/acc/kit/checkers/safety/no-secrets-in-help.ts
import type { Checker, Finding, History, Invocation } from "../../types.ts";

const PATTERNS: Array<[label: string, re: RegExp]> = [
  ["OpenAI-style key", /\bsk-[A-Za-z0-9]{16,}/],
  ["GitHub token", /\bghp_[A-Za-z0-9]{20,}/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
  ["password in a URL", /[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@/i],
];

/** F1 — docs/wiki/rules/safety/no-secrets-in-help-or-schema.md */
export const noSecretsInHelpChecker: Checker = {
  ruleId: "F1",
  rulePath: "docs/wiki/rules/safety/no-secrets-in-help-or-schema.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "F1: scan help" },
  ],

  check: (h: History): Finding => {
    const o = h.observations.find((x) => x.invocation.purpose.startsWith("F1:"));
    if (!o) {
      return { ruleId: "F1", verdict: "unverified", detail: "probe was not recorded", evidence: [] };
    }
    const text = `${o.stdout}\n${o.stderr}`;
    const hits = PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);
    return hits.length
      ? { ruleId: "F1", verdict: "fail", detail: `credential pattern(s) in help: ${hits.join(", ")}`, evidence: [o.id] }
      : {
          ruleId: "F1",
          verdict: "pass",
          // Honest about scope: a bespoke token format with no telltale prefix passes.
          detail: "no KNOWN credential pattern found (absence of a known pattern, not proof)",
          evidence: [o.id],
        };
  },
};
```

- [ ] **Step 4: Write F2**

```ts
// src/acc/kit/checkers/safety/first-byte-prompt.ts
import type { Checker, Finding, History, Invocation } from "../../types.ts";

const THRESHOLD_MS = 100;
const RUNS = [1, 2, 3];

/** F2 — docs/wiki/rules/safety/first-byte-is-prompt.md (diagnostic) */
export const firstBytePromptChecker: Checker = {
  ruleId: "F2",
  rulePath: "docs/wiki/rules/safety/first-byte-is-prompt.md",
  tier: "diagnostic",

  probes: (): Invocation[] =>
    RUNS.map((n) => ({
      args: ["--version"],
      env: { ACC_PROBE_TIMING: String(n) },
      inertness: "help-path" as const,
      purpose: `F2: timing run ${n}`,
    })),

  check: (h: History): Finding => {
    const runs = h.observations.filter((o) => o.invocation.purpose.startsWith("F2:"));
    const times = runs.map((o) => o.timeToFirstByteMs).filter((t): t is number => t !== null);
    if (times.length === 0) {
      return { ruleId: "F2", verdict: "unverified", detail: "no timing was captured", evidence: [] };
    }
    // Best-of-N, not the mean: the interesting number is the floor, since a slow run usually
    // measures the machine rather than the tool. The spread is reported because high variance
    // is itself a finding.
    const best = Math.min(...times);
    const detail = `first byte in ${best}ms (runs: ${times.join(", ")}ms)`;
    return best <= THRESHOLD_MS
      ? { ruleId: "F2", verdict: "pass", detail, evidence: runs.map((o) => o.id) }
      : { ruleId: "F2", verdict: "fail", detail: `${detail} — above the ${THRESHOLD_MS}ms guideline`, evidence: runs.map((o) => o.id) };
  },
};
```

- [ ] **Step 5: Tests, register, flip pages, gate, commit**

```bash
bun test src/acc/kit/
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): interactivity and safety checkers E1, F1, F2

E1's negative control genuinely hangs, which is the only way to prove the
deadline works. F1 reports 'no KNOWN pattern found' rather than 'no secret
present' — a scanner cannot see a bespoke token format, and a clean result
that overclaims is worse than none."
```

---

### Task 11: Report aggregation and the expectations ratchet

**Files:**

- Create: `src/acc/kit/report.ts`
- Create: `src/acc/kit/report.test.ts`
- Create: `src/acc/kit/expectations.ts`
- Create: `src/acc/kit/expectations.test.ts`

**Interfaces:**

- Consumes: `Finding`, `Checker`, `History`, `CHECKERS`.
- Produces: `runCheckers(h: History, checkers: Checker[]): Finding[]`, `buildReport(h, findings, expectations): Report`, `loadExpectations(dir: string): Expectations`, and the `Report` type.

- [ ] **Step 1: Write `src/acc/kit/expectations.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test for the report**

Create `src/acc/kit/report.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { buildReport } from "./report.ts";
import type { Checker, Finding, History } from "./types.ts";

const H: History = {
  target: { path: "x", argv0: ["x"] },
  discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: true },
  observations: [],
  byId: new Map(),
};

const checker = (ruleId: string, tier: "core" | "diagnostic"): Checker => ({
  ruleId,
  rulePath: `docs/wiki/rules/x/${ruleId}.md`,
  tier,
  probes: () => [],
  check: () => ({ ruleId, verdict: "pass", detail: "", evidence: [] }),
});

const finding = (ruleId: string, verdict: Finding["verdict"]): Finding => ({
  ruleId,
  verdict,
  detail: "d",
  evidence: [],
});

describe("buildReport", () => {
  test("core conformance is BINARY — one core failure fails the run", () => {
    const r = buildReport(H, [finding("A1", "pass"), finding("A2", "fail")], [checker("A1", "core"), checker("A2", "core")], { knownFailures: {} });
    expect(r.conformant).toBe(false);
  });

  test("a diagnostic failure does NOT fail the run", () => {
    const r = buildReport(H, [finding("A1", "pass"), finding("F2", "fail")], [checker("A1", "core"), checker("F2", "diagnostic")], { knownFailures: {} });
    expect(r.conformant).toBe(true);
    expect(r.counts.diagnosticFailures).toBe(1);
  });

  test("an UNVERIFIED core rule does not count as a pass", () => {
    const r = buildReport(H, [finding("A1", "unverified")], [checker("A1", "core")], { knownFailures: {} });
    expect(r.conformant).toBe(false);
    expect(r.counts.unverified).toBe(1);
  });

  test("a known failure is excused but still reported", () => {
    const r = buildReport(H, [finding("A1", "fail")], [checker("A1", "core")], { knownFailures: { A1: "legacy parser" } });
    expect(r.conformant).toBe(true);
    expect(r.knownFailures).toEqual([{ ruleId: "A1", reason: "legacy parser" }]);
  });

  test("a known failure that now PASSES is reported as stale, so the ratchet tightens", () => {
    const r = buildReport(H, [finding("A1", "pass")], [checker("A1", "core")], { knownFailures: { A1: "legacy parser" } });
    expect(r.staleExpectations).toEqual(["A1"]);
  });

  test("every finding carries the rule page path", () => {
    const r = buildReport(H, [finding("A1", "fail")], [checker("A1", "core")], { knownFailures: {} });
    expect(r.findings[0]?.rulePath).toBe("docs/wiki/rules/x/A1.md");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `bun test src/acc/kit/report.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `src/acc/kit/report.ts`**

```ts
import type { Checker, Finding, History, Verdict } from "./types.ts";
import type { Expectations } from "./expectations.ts";

export interface ReportedFinding extends Finding {
  tier: "core" | "diagnostic";
  /** Where to read about the rule. A failure that does not point at its explanation is a chore. */
  rulePath: string;
  /** True when this failure is listed in the project's expectations file. */
  excused: boolean;
}

export interface Report {
  target: string;
  /** Binary. Core rules pass or they do not — a percentage invites gaming the number rather
   *  than fixing the implementation (the Acid3 "Potemkin village" critique). */
  conformant: boolean;
  counts: {
    core: number;
    corePassed: number;
    coreFailures: number;
    diagnosticFailures: number;
    unverified: number;
  };
  findings: ReportedFinding[];
  knownFailures: Array<{ ruleId: string; reason: string }>;
  /** Excused rules that now pass. The ratchet: remove these from the expectations file. */
  staleExpectations: string[];
}

/** Phase two: pure functions over recorded history. Nothing here spawns a process. */
export function runCheckers(h: History, checkers: Checker[]): Finding[] {
  return checkers.map((c) => c.check(h));
}

export function buildReport(
  h: History,
  findings: Finding[],
  checkers: Checker[],
  expectations: Expectations,
): Report {
  const byId = new Map(checkers.map((c) => [c.ruleId, c]));
  const reported: ReportedFinding[] = findings.map((f) => {
    const c = byId.get(f.ruleId);
    return {
      ...f,
      tier: c?.tier ?? "core",
      rulePath: c?.rulePath ?? "",
      excused: f.verdict === "fail" && f.ruleId in expectations.knownFailures,
    };
  });

  const core = reported.filter((f) => f.tier === "core");
  const coreFailures = core.filter((f) => f.verdict === "fail" && !f.excused);
  // An unverified core rule is NOT a pass. Counting it as one is exactly the overclaim this
  // project exists to prevent.
  const unverified = reported.filter((f) => f.verdict === "unverified");
  const unverifiedCore = core.filter((f) => f.verdict === "unverified");

  return {
    target: h.target.path,
    conformant: coreFailures.length === 0 && unverifiedCore.length === 0,
    counts: {
      core: core.length,
      corePassed: core.filter((f) => f.verdict === "pass").length,
      coreFailures: coreFailures.length,
      diagnosticFailures: reported.filter((f) => f.tier === "diagnostic" && f.verdict === "fail").length,
      unverified: unverified.length,
    },
    findings: reported,
    knownFailures: Object.entries(expectations.knownFailures).map(([ruleId, reason]) => ({ ruleId, reason })),
    staleExpectations: Object.keys(expectations.knownFailures).filter(
      (id) => reported.find((f) => f.ruleId === id)?.verdict === "pass",
    ),
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `bun test src/acc/kit/report.test.ts src/acc/kit/expectations.test.ts`
Expected: PASS. (Write `expectations.test.ts` asserting: a missing file yields empty `knownFailures`; a present file is parsed.)

- [ ] **Step 6: Commit**

```bash
bun run lint:fix && bun run check
git add -A
git commit -m "feat(kit): report aggregation and the expectations ratchet

Core conformance is binary rather than a percentage: a score invites gaming
the number instead of fixing the implementation, which is the Acid3
'Potemkin village' critique.

An UNVERIFIED core rule does not count as a pass. Known failures are
excused but still printed, and an excused rule that starts passing is
reported as stale — so the file only ever shrinks."
```

---

### Task 12: `acc check`, and turning the self-check over to the kit

**Files:**

- Create: `src/acc/commands/check.ts`
- Modify: `src/acc/spec.ts` (declare the command)
- Modify: `src/acc/cli.ts` (dispatch it)
- Modify: `src/acc/conformance.test.ts` (drive it through the kit)
- Create: `.acc-expectations.json` — only if `acc` itself has an excused failure; otherwise omit

**Interfaces:**

- Consumes: `record`, `runCheckers`, `buildReport`, `loadExpectations`, `CHECKERS`, `emit`, `usageError`.
- Produces: `checkCommand(targetPath: string, opts, mode, startedAt): Promise<void>`.

- [ ] **Step 1: Declare the command in `src/acc/spec.ts`**

Append to `COMMANDS`:

```ts
  {
    name: "check",
    description: "Run the L0 conformance probes against a CLI binary.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [
      { name: "target", description: "Path to the binary or script to check.", required: true },
    ],
    args: [
      {
        name: "--expectations",
        type: "string",
        description: "Directory holding .acc-expectations.json.",
        valueHint: "dir",
      },
    ],
    errors: [ErrorKind.NotFound, ErrorKind.Usage, ErrorKind.Internal],
    examples: ["acc check ./mycli", "acc check $(which gh) --json"],
  },
```

- [ ] **Step 2: Write `src/acc/commands/check.ts`**

```ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError } from "../errors.ts";
import { loadExpectations } from "../kit/expectations.ts";
import { record } from "../kit/record.ts";
import { CHECKERS } from "../kit/registry.ts";
import { buildReport, runCheckers } from "../kit/report.ts";
import type { TargetInfo } from "../kit/types.ts";

export interface CheckOptions {
  expectations?: string;
}

/** A `.ts` target is run through bun; anything else is executed directly. */
function toTarget(path: string): TargetInfo {
  const abs = resolve(path);
  return { path: abs, argv0: abs.endsWith(".ts") ? ["bun", abs] : [abs] };
}

export async function checkCommand(
  targetPath: string,
  opts: CheckOptions,
  mode: OutputMode,
  startedAt: number,
): Promise<void> {
  const target = toTarget(targetPath);
  if (!existsSync(target.path)) {
    throw notFoundError(`no such file: ${targetPath}`, {
      hint: "Pass a path to an executable or a .ts entry point.",
    });
  }

  const history = await record(target, CHECKERS);
  const findings = runCheckers(history, CHECKERS);
  const report = buildReport(history, findings, CHECKERS, loadExpectations(opts.expectations ?? "."));

  emit({
    mode,
    command: "check",
    startedAt,
    data: report,
    next: report.conformant
      ? []
      : [
          {
            command: `acc show ${report.findings.find((f) => f.verdict === "fail")?.ruleId ?? "A1"}`,
            when: "to read the rule behind the first failure",
          },
        ],
    renderText: (r) => {
      const bold = useColor() ? "\x1b[1m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      const mark = (v: string) => (v === "pass" ? "PASS" : v === "fail" ? "FAIL" : "----");
      const lines = r.findings.map(
        (f) => `  ${mark(f.verdict)}  ${f.ruleId.padEnd(3)} ${f.detail}${f.excused ? " (excused)" : ""}`,
      );
      const verdict = r.conformant ? "CONFORMANT" : "NOT CONFORMANT";
      return [
        `${bold}${verdict}${reset}  ${r.target}`,
        "",
        ...lines,
        "",
        `  core ${r.counts.corePassed}/${r.counts.core} · failures ${r.counts.coreFailures} · unverified ${r.counts.unverified} · diagnostics ${r.counts.diagnosticFailures}`,
        ...(r.staleExpectations.length
          ? [`  stale expectations (now passing, remove them): ${r.staleExpectations.join(", ")}`]
          : []),
      ].join("\n");
    },
  });
}
```

- [ ] **Step 3: Dispatch it in `src/acc/cli.ts`**

The action callback is currently synchronous. Change the `switch` arm set to handle the async case by adding, before `default`:

```ts
      case "check":
        return checkCommand(
          positionals[0] as string,
          { expectations: opts.expectations as string | undefined },
          resolved,
          startedAt,
        );
```

and add the import:

```ts
import { checkCommand } from "./commands/check.ts";
```

Because `checkCommand` returns a promise, the top-level error boundary must await it. Change:

```ts
try {
  program.parse(argv);
} catch (err) {
```

to:

```ts
try {
  await program.parseAsync(argv);
} catch (err) {
```

- [ ] **Step 4: Verify by hand**

Run: `bun src/acc/cli.ts check src/acc/kit/fixtures/conforming.ts --format text`
Expected: `CONFORMANT`, all core rules PASS or `----`.

Run: `bun src/acc/cli.ts check src/acc/kit/fixtures/broken/exits-zero-on-unknown-flag.ts --format text`
Expected: `NOT CONFORMANT`, with A1 and D2 among the FAILs.

Run: `bun src/acc/cli.ts check $(which git) --format text`
Expected: a real report against a real binary; it should not crash, and any rule it cannot probe should read `----`.

- [ ] **Step 5: Turn the self-check over to the kit**

Replace the body of `src/acc/conformance.test.ts` with a suite that drives the kit instead of hand-written probes. Keep the file — its name is what makes the property obvious.

```ts
// acc, checked against the spec it enforces — now through the kit itself.
//
// This is the POSITIVE CONTROL, and it is now self-referential: the checker checks itself. If
// acc ever stops conforming, or a checker breaks in a way that stops detecting, this goes red.
import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadExpectations } from "./kit/expectations.ts";
import { record } from "./kit/record.ts";
import { CHECKERS } from "./kit/registry.ts";
import { buildReport, runCheckers } from "./kit/report.ts";
import type { TargetInfo } from "./kit/types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ACC: TargetInfo = { path: join(HERE, "cli.ts"), argv0: ["bun", join(HERE, "cli.ts")] };

describe("acc checks itself", () => {
  test("is conformant", async () => {
    const h = await record(ACC, CHECKERS);
    const r = buildReport(h, runCheckers(h, CHECKERS), CHECKERS, loadExpectations("."));
    if (!r.conformant) {
      const failed = r.findings.filter((f) => f.verdict !== "pass" && f.tier === "core");
      throw new Error(
        `acc is not conformant:\n${failed.map((f) => `  ${f.ruleId} ${f.verdict}: ${f.detail}`).join("\n")}`,
      );
    }
    expect(r.conformant).toBe(true);
  }, 60_000);

  test("every core rule is verified, not merely unfailed", async () => {
    const h = await record(ACC, CHECKERS);
    const r = buildReport(h, runCheckers(h, CHECKERS), CHECKERS, loadExpectations("."));
    const unverified = r.findings.filter((f) => f.tier === "core" && f.verdict === "unverified");
    expect(unverified.map((f) => `${f.ruleId}: ${f.detail}`)).toEqual([]);
  }, 60_000);

  test("the kit detects a CLI that is NOT conformant", async () => {
    // Without this, a kit that silently stopped checking anything would still pass the test
    // above. The positive control needs a negative control.
    const broken = join(HERE, "kit/fixtures/broken/exits-zero-on-unknown-flag.ts");
    const h = await record({ path: broken, argv0: ["bun", broken] }, CHECKERS);
    const r = buildReport(h, runCheckers(h, CHECKERS), CHECKERS, { knownFailures: {} });
    expect(r.conformant).toBe(false);
    expect(r.findings.find((f) => f.ruleId === "A1")?.verdict).toBe("fail");
  }, 60_000);
});
```

- [ ] **Step 6: Run the full gate**

Run: `bun run lint:fix && bun run format:md && bun run check`
Expected: PASS. If `acc` fails a rule, fix `acc` — do not add it to expectations. The reference implementation earns its name by conforming.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(acc): acc check, and the self-check now runs through the kit

The positive control is now self-referential: the conformance checker
checks itself on every commit. The third test is what keeps that honest —
a kit that silently stopped detecting anything would still pass a
self-check, so the suite also asserts it FAILS a deliberately broken
fixture.

Note the second test: every core rule must be VERIFIED, not merely
unfailed. A rule that quietly reports 'unverified' forever is a rule that
is not being enforced."
```

---

## Self-Review

**1. Spec coverage.** All 19 rules have a checker task: A1 (Task 5), A2–A6 (Task 6), B1–B3 (Task 7), C1–C3 (Task 8), D1–D4 (Task 9), E1/F1/F2 (Task 10). The three-verdict model, expectations ratchet, and binary core scoring come from `docs/wiki/SCHEMA.md` and the research, and land in Task 11. The `## The probe` section of each rule page is implemented by its checker's `probes()`.

**2. Placeholder scan.** No TBDs. Every code step contains runnable code. Task 6 Step 9 and Tasks 7–10's test steps describe tests by reference to the A2 shape rather than repeating six near-identical files — this is a deliberate exception to the no-"similar to Task N" rule, because the A2 test is quoted in full two steps earlier in the same task and the variation is only the fixture name. If an executor finds that insufficient, the A2 test is the template to copy verbatim.

**3. Type consistency.** `Invocation`, `Observation`, `Discovery`, `History`, `Finding`, `Checker`, `Verdict` are defined once in Task 1 and used unchanged throughout. `findByArgs` is added in Task 5 Step 1 before its first use. `SENTINEL` comes from `inert.ts` (Task 1) and is imported by every checker that needs an invalid token. `buildReport(h, findings, checkers, expectations)` has the same four-parameter signature in Task 11 and Task 12.

**4. Known gap, stated rather than hidden.** `runProbe` never sees a TTY, so B2 and machine-mode detection are only ever exercised on the non-TTY path. Verifying a target's _human_ rendering would require a pty, which is out of scope for L0 and is not claimed anywhere in the plan or in the rule pages.
