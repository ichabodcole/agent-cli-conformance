import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const CONFIG_FILE = "acc.config.json";

/**
 * How hard a rule binds for THIS project.
 *
 * `core` and `diagnostic` are the two tiers the catalogue itself uses, so a project can move a
 * rule between them in either direction — DOWN, to stop a rule gating its adoption, and UP, to
 * hold itself to a rule the catalogue only reports. Raising is not decoration: a project
 * declaring itself stricter than baseline is a signal worth having, and a config that could only
 * subtract would read as an opt-out list rather than as tuning.
 *
 * `off` is a different KIND of statement, not a third point on the same scale — see
 * `AccConfig.rules`.
 */
export const SEVERITIES = ["core", "diagnostic", "off"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** One rule's declaration. Both fields are required; see `AccConfig.rules` for why `reason` is. */
export interface RuleConfig {
  severity: Severity;
  reason: string;
}

export interface AccConfig {
  /**
   * DECLARATIONS — "this rule binds differently for my tool, by design."
   *
   * `severity: "off"` is a WAIVER, and a waiver is not debt. It never goes stale, because
   * passing was never the goal; the report shows what the verdict WOULD have been as
   * information, never as something to go and fix. That is the whole distinction from
   * `knownFailures` below, and mixing the two would break the ratchet: every deliberate design
   * choice would sit in a list nagging to be repaid.
   *
   * D2 is the entry that forced this to exist. A bare invocation must be a usage error;
   * dogfooding against four real CLIs found three of them printing help and exiting `0`, which
   * many well-liked tools do deliberately. "Nothing was requested, nothing ran" is a defensible
   * design POSITION rather than a bug diagnosis, and the rule most likely to make the kit feel
   * like a straitjacket is the rule most likely to get the whole kit switched off — after which
   * none of its other rules help either.
   *
   * A `reason` is REQUIRED, exactly as a `knownFailures` reason is. A waiver without one is a
   * silent opt-out; with one it is a declaration someone can review later — and, aggregated
   * across projects, evidence about the SPEC rather than about any one tool. Many projects
   * waiving one rule for one stated reason is a rule that needs an archetype, not a waiver (see
   * docs/roadmap.md, R4-2).
   */
  rules: Record<string, RuleConfig>;
  /**
   * DEBT — "this rule is broken for my tool, I know, I will fix it."
   *
   * Rule ids whose failure is currently accepted, each with a reason. Only ever shrinks; the
   * report names a **stale expectation** once the rule starts passing, so the line gets deleted.
   */
  knownFailures: Record<string, string>;
  /**
   * DECLARED DEFAULT OUTPUT — "my tool emits JSON with no flags at all."
   *
   * The kit does not infer machine mode at all — a flag matched out of help by SPELLING is not a
   * selector, and seven attempts to make that guess safe each failed in a new direction. Without
   * this key the machine-mode rules report `unverified` and name it as the remedy, which is the
   * `L0` boundary working rather than a gap: see
   * [the admission test](../../../docs/wiki/concepts/probing.md#what-l0-may-assume--the-admission-test).
   *
   * It is worth most to the CLI an inference could never see: one whose data commands emit JSON
   * unless asked for prose, with no flag to notice. This key does not touch D3, and measuring
   * that is cheaper than reasoning about it: against `fixtures/machine-first.ts` D3 reports
   * `unverified` — "help appears to CLAIM structured output is the default … a claim matched in
   * prose rather than a token this kit can verify" — identically with and without the
   * declaration. D3's subject is the help text a caller reads, and this key is a statement to the
   * kit, which is the asymmetry that rule page argues for.
   *
   * A declaration rather than a sharper inference, and the argument is the one the roadmap
   * already makes for L1: a declaration can be FALSIFIED and an inference cannot, because the
   * inference is the guess. Here the falsification is the cheapest kind — send a parser error
   * with no selector at all and see whether the answer is a document. A target that declares
   * this and answers in prose fails B5, which is the rule doing its job.
   *
   * `undefined` means undeclared, which is not the same as "not machine-first" — it means the kit
   * was told nothing, and nothing is what it will infer: the machine-mode rules report
   * `unverified` and name this key as the remedy.
   */
  defaultOutput?: "json";
}

/**
 * A malformed or misdirected config file.
 *
 * Its own error type rather than an `AccError`, for the reason `record.ts`'s
 * `TargetNotExecutableError` is: the kit is meant to be usable without this CLI's error
 * taxonomy, and the command layer owns the mapping to a kind and an exit code. `path` is carried
 * separately from the message so the translation can put it in structured `details` rather than
 * leaving the caller to parse prose.
 */
export class ConfigError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(message);
    this.name = "ConfigError";
    this.path = path;
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The per-project config: `rules` (declarations) and `knownFailures` (debt).
 *
 * Both live in a per-project file — never as edits to the shared checker corpus. `knownFailures`
 * is borrowed from Web Platform Tests: it lets a project adopt the kit today without a wall of
 * red, while keeping every outstanding failure named and visible. That list only ever shrinks,
 * and nothing in the kit adds to it automatically. `rules` is the other statement entirely, and
 * `AccConfig` above is where the difference is argued.
 *
 * ## Everything here is validated, because the file suppresses a gate
 *
 * The parsed JSON used to be cast straight to `Partial<Expectations>`, which is a promise the
 * type system cannot keep about a file on disk (review R2-4). What that admitted:
 * `knownFailures: null` reached a later `in` and threw an INTERNAL error over a configuration
 * mistake; arrays and numbers entered the report despite the declared type; and a mistyped rule
 * id excused nothing, silently — it does not match a finding, so it never suppresses a failure
 * AND never shows up as a stale expectation. A file whose whole job is to suppress a gate is the
 * last place to accept "probably fine".
 *
 * That reasoning applies with MORE force to `rules`, which can disable a rule outright rather
 * than excuse one failure of it. So a rule entry is checked down to its KEYS: an unrecognised one
 * is rejected rather than ignored, because `"severty": "off"` quietly doing nothing is the same
 * silent no-op as a mistyped id, and it leaves the project believing it declared something it
 * did not.
 *
 * `knownRuleIds` is passed in rather than imported from the registry so the kit stays free of it;
 * an empty list disables the id check, which is what a caller checking a partial corpus wants.
 *
 * ## An explicitly requested path that is wrong is an ERROR
 *
 * `dir` undefined means "nobody asked" — the default lookup in the cwd, where a missing file is
 * the normal case and yields an empty config. A `dir` the caller passed is a request, and a
 * request that cannot be honoured is reported instead of ignored: silently continuing with an
 * empty config would fail a rule the project believed it had waived, which is precisely the
 * silent-failure shape this catalogue exists to catch a CLI doing.
 */
/**
 * `"json"` is the only legal value, and anything else is an ERROR rather than an ignored key.
 *
 * A mistyped declaration that silently does nothing leaves a project believing it declared
 * something it did not — the same silent no-op this file already refuses for a mistyped rule id
 * or an unknown key inside a rule entry. The vocabulary is deliberately one word wide: there is
 * no `"flag"` value, because that case is what reading help already covers.
 */
/** Every key this file accepts. Anything else is a typo, and a typo is an error here. */
const TOP_LEVEL_KEYS = ["rules", "knownFailures", "defaultOutput"];

function parseDefaultOutput(path: string, raw: unknown): { defaultOutput?: "json" } {
  if (raw === undefined) return {};
  if (raw !== "json") {
    throw new ConfigError(
      path,
      `defaultOutput must be "json" if present, found ${JSON.stringify(raw) ?? describe(raw)}`,
    );
  }
  return { defaultOutput: "json" };
}

export function loadConfig(
  dir: string | undefined,
  knownRuleIds: readonly string[] = [],
): AccConfig {
  const explicit = dir !== undefined;
  const path = join(dir ?? ".", CONFIG_FILE);

  if (!existsSync(path)) {
    if (!explicit) return { rules: {}, knownFailures: {} };

    throw new ConfigError(
      path,
      existsSync(dir) && statSync(dir).isDirectory()
        ? `no ${CONFIG_FILE} in the requested directory`
        : `no such directory: ${dir}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    // The parser's own message names the offset, which is the one detail that makes a syntax
    // error fixable; it is quoted rather than replaced with "invalid JSON".
    throw new ConfigError(path, `is not valid JSON: ${(err as Error).message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new ConfigError(path, `must contain a JSON object, found ${describe(parsed)}`);
  }

  // AN UNKNOWN TOP-LEVEL KEY IS AN ERROR, for the reason a mistyped rule id already is: a
  // declaration that silently does nothing leaves a project believing it declared something it
  // did not. `{"defaultoutput": "json"}` would otherwise run clean with the declaration quietly off —
  // and since the declaration is what lets B5 reach a machine-first target, the typo switched off
  // the falsification too. Found by an independent review.
  for (const key of Object.keys(parsed)) {
    if (!TOP_LEVEL_KEYS.includes(key)) {
      throw new ConfigError(
        path,
        `has an unknown key "${key}" (known: ${TOP_LEVEL_KEYS.join(", ")})`,
      );
    }
  }

  const known = new Set(knownRuleIds);
  const rules = parseRules(path, parsed.rules, known);
  const knownFailures = parseKnownFailures(path, parsed.knownFailures, known);
  requireNoContradiction(path, rules, knownFailures);
  return { rules, knownFailures, ...parseDefaultOutput(path, parsed.defaultOutput) };
}

/** The keys a rule entry may carry. An unrecognised one is a typo doing nothing, silently. */
const RULE_KEYS = ["severity", "reason"];

function parseRules(path: string, raw: unknown, known: Set<string>): Record<string, RuleConfig> {
  if (raw === undefined) return {};
  if (!isPlainObject(raw)) {
    throw new ConfigError(path, `rules must be an object, found ${describe(raw)}`);
  }

  const rules: Record<string, RuleConfig> = {};
  for (const [ruleId, entry] of Object.entries(raw)) {
    if (!isPlainObject(entry)) {
      throw new ConfigError(path, `rules.${ruleId} must be an object, found ${describe(entry)}`);
    }
    for (const key of Object.keys(entry)) {
      if (!RULE_KEYS.includes(key)) {
        throw new ConfigError(
          path,
          `rules.${ruleId} has an unknown key "${key}" (known: ${RULE_KEYS.join(", ")})`,
        );
      }
    }
    const { severity, reason } = entry;
    if (typeof severity !== "string" || !(SEVERITIES as readonly string[]).includes(severity)) {
      const found = typeof severity === "string" ? `"${severity}"` : describe(severity);
      throw new ConfigError(
        path,
        `rules.${ruleId}.severity must be one of ${SEVERITIES.join(", ")}, found ${found}`,
      );
    }
    // Required for exactly the reason a knownFailures reason is: a waiver with no reason is a
    // silent opt-out, and a severity move with no reason is a decision nobody can review.
    if (typeof reason !== "string" || reason.trim() === "") {
      throw new ConfigError(
        path,
        `rules.${ruleId}.reason must be a non-empty string, found ${describe(reason)}`,
      );
    }
    requireKnownId(path, "rules", ruleId, known);
    rules[ruleId] = { severity: severity as Severity, reason };
  }
  return rules;
}

function parseKnownFailures(
  path: string,
  raw: unknown,
  known: Set<string>,
): Record<string, string> {
  if (raw === undefined) return {};
  if (!isPlainObject(raw)) {
    throw new ConfigError(path, `knownFailures must be an object, found ${describe(raw)}`);
  }

  const knownFailures: Record<string, string> = {};
  for (const [ruleId, reason] of Object.entries(raw)) {
    if (typeof reason !== "string" || reason.trim() === "") {
      throw new ConfigError(
        path,
        `knownFailures.${ruleId} must be a non-empty string reason, found ${describe(reason)}`,
      );
    }
    requireKnownId(path, "knownFailures", ruleId, known);
    knownFailures[ruleId] = reason;
  }
  return knownFailures;
}

/**
 * One id in BOTH sections — an error when the rule is WAIVED, allowed when its severity merely
 * MOVED. Precedence was the other option and it is the wrong one, because either precedence
 * silently deletes a line the author wrote.
 *
 * A waiver plus a known failure is a contradiction: "this rule does not apply to my tool" and
 * "this rule applies, I am failing it, I will fix it" cannot both be true. Let the waiver win and
 * a design decision is misreported as debt; let the known failure win and the waiver — the line
 * the project wrote to describe itself — does nothing at all. Either way the file says one thing
 * and the report says another, over a rule the author has simply not made their mind up about.
 * So it is rejected, naming the id and both keys, and they decide which sentence they meant.
 *
 * A severity MOVE plus a known failure is not a contradiction and is allowed. "I hold myself to
 * core on A6, and I currently fail it" is the aspirational half of the same ratchet WPT is built
 * on: the rule binds HARDER and the debt is tracked, and rejecting that would make raising a
 * severity something only an already-passing project could do. The two keys answer different
 * questions there — which gate the rule sits behind, and whether the project is behind on it.
 */
function requireNoContradiction(
  path: string,
  rules: Record<string, RuleConfig>,
  knownFailures: Record<string, string>,
): void {
  for (const [ruleId, rule] of Object.entries(rules)) {
    if (rule.severity === "off" && ruleId in knownFailures) {
      throw new ConfigError(
        path,
        `${ruleId} is waived in rules AND listed in knownFailures — a rule cannot both not apply to this tool and be a failure it intends to fix; delete one`,
      );
    }
  }
}

/**
 * An id no checker answers to does nothing, silently, in EITHER section. Under `knownFailures` it
 * excuses no failure and never becomes a stale expectation, so the ratchet cannot tighten past
 * it; under `rules` it waives nothing, and the project believes it declared something it did not.
 * `A1 ` and `a1` are the realistic typos.
 */
function requireKnownId(path: string, section: string, ruleId: string, known: Set<string>): void {
  if (known.size > 0 && !known.has(ruleId)) {
    throw new ConfigError(
      path,
      `${section} names "${ruleId}", which is not a rule this kit checks (known: ${[...known].sort().join(", ")})`,
    );
  }
}

/** A value's shape, for an error message. `null` and `[]` are the two that matter. */
function describe(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "an array";
  return `a ${typeof v}`;
}
