import { runProbe } from "./runner.ts";
import type { Discovery, Invocation, TargetInfo } from "./types.ts";

const MACHINE_FLAGS = ["--json", "--format", "--output"];

const FLAG_RE = /(?<![\w-])(--[a-z][a-z0-9-]*)/gi;

// Colon optional and extra leading words allowed, because real CLIs disagree: `gh` writes
// "CORE COMMANDS" with no colon at all, `docker` writes "Common Commands:" and "Management
// Commands:". The line must otherwise be bare (only letters/spaces around the word) so it can't
// match prose that merely mentions "commands" mid-sentence.
const COMMANDS_HEADING = /^\s*[a-z ]*\bcommands\b\s*:?\s*$/i;
// Same bareness rule, for the flags/options block.
const OPTIONS_HEADING = /^\s*(global\s+)?(options|flags)\s*:?\s*$/i;
// A block ends at a blank line or the next heading-shaped line. Shared by both scans below.
const NEXT_HEADING = /^[A-Za-z].*:$/;

/**
 * The content lines of every block `heading` opens, and whether any such heading was found.
 *
 * A BLANK LINE ENDS A BLOCK ONLY AFTER ITS CONTENT HAS STARTED, and that clause is not a
 * refinement — it is a defect found by execution. A renderer that puts a rule of whitespace under
 * its section titles, which `anthill` does and which is an ordinary layout, closed the block on
 * the line after the heading and yielded **zero flags** for a screen that plainly lists them.
 * Every rule that reads the flag surface — A5's near-miss, A7's value set, D3's advertisement —
 * silently reported nothing for that target, and each said so in a way that read as a fact about
 * the target rather than about the parse.
 *
 *     OPTIONS
 *                                  ← layout, not the end of the block
 *       --format=<text|json>    Output format
 *                                  ← this one is the end of the block
 *     COMMANDS
 */
function blockLines(lines: string[], heading: RegExp): { content: string[]; found: boolean } {
  const content: string[] = [];
  let inBlock = false;
  let started = false;
  let found = false;
  for (const line of lines) {
    if (heading.test(line)) {
      inBlock = true;
      started = false;
      found = true;
      continue;
    }
    if (!inBlock) continue;
    const trimmed = line.trim();
    if (trimmed === "") {
      if (started) inBlock = false;
      continue;
    }
    if (NEXT_HEADING.test(trimmed)) {
      inBlock = false;
      continue;
    }
    started = true;
    content.push(line);
  }
  return { content, found };
}

/**
 * Scoped to a detected Options/Flags block so unrelated `--flags` elsewhere in the help text —
 * a piped example (`mycli list | jq --raw-output`), a docs URL, a flag some OTHER program takes
 * — aren't mistaken for the target's own surface.
 *
 * Falls back to an unscoped scan of the whole text only when no options heading was found
 * anywhere. Finding less is safer than inventing, but finding nothing when a real options block
 * exists (just formatted in a way we don't recognize) would be worse than the old unscoped scan.
 */
function extractFlags(text: string, lines: string[]): string[] {
  const { content, found } = blockLines(lines, OPTIONS_HEADING);
  if (found) {
    const scoped: string[] = [];
    for (const line of content) for (const m of line.matchAll(FLAG_RE)) scoped.push(m[1] as string);
    return [...new Set(scoped)];
  }
  return [...new Set([...text.matchAll(FLAG_RE)].map((m) => m[1] as string))];
}

/**
 * One alternation member: no spaces, no delimiters, and never itself flag-shaped — `[--json]`
 * is optional-flag notation, not a value set, and `<file|->` offers a bare hyphen as a value.
 */
const SET_MEMBER = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

/** `<text|json>`, `(text|json)`, `[text|json]` — the delimiter is decoration, the `|` is the set. */
const DELIMITED_SET = /[<([]([^<>()[\]]+)[>)\]]/;

/** `one of: a, b, c` / `one of a or b` — the prose spelling, which needs no delimiters at all. */
const ONE_OF = /\bone of:?\s+(.+)$/i;

/** The first long flag on a line, which is the flag the rest of that line describes. */
const FIRST_FLAG = /(?<![\w-])(--[a-z][a-z0-9-]*)/i;

/**
 * The closed value sets a help screen advertises, keyed by flag.
 *
 * Read off ONE line at a time and only after the flag it belongs to, because that is how every
 * help layout surveyed writes it — the set sits in the flag's own value slot or in the first
 * sentence of its description. A continuation line carrying the set two rows below its flag is
 * not found, and finding nothing is the honest result: A7 reports `unverified`, which is what
 * "this tool declared nothing here" should look like.
 *
 * Scoped to the Options block on the same terms as `extractFlags`, and for the same reason — a
 * piped example (`mycli list | jq -r '.a|.b'`) is full of alternations that belong to another
 * program entirely.
 */
function extractValueSets(lines: string[]): Record<string, string[]> {
  const scan = blockLines(lines, OPTIONS_HEADING);
  const out: Record<string, string[]> = {};
  for (const line of scan.found ? scan.content : lines) {
    const flag = FIRST_FLAG.exec(line);
    if (!flag?.[1]) continue;
    const after = line.slice((flag.index ?? 0) + (flag[1] as string).length);

    // Delimited alternation first: it is the value slot, so it is unambiguous. `one of:` is the
    // fallback, since it lives in prose and prose can say anything.
    const delimited = DELIMITED_SET.exec(after)?.[1];
    const raw = delimited?.includes("|")
      ? delimited.split("|")
      : (ONE_OF.exec(after)?.[1]?.split(/,|\bor\b/) ?? []);

    const values = raw.map((v) => v.trim().replace(/^[`'"]|[`'".]$/g, "")).filter(Boolean);
    // Two members or nothing. One value is a constant, not a choice, and a stray `<file>` or a
    // trailing sentence fragment collapses to exactly one — so the floor is also the filter.
    if (values.length > 1 && values.every((v) => SET_MEMBER.test(v)) && !(flag[1] in out))
      out[flag[1] as string] = values;
  }
  return out;
}

/**
 * The same sets, read STRUCTURALLY out of a help document that is itself JSON.
 *
 * Not an indulgence: every probe runs with stdout on a pipe, so a tool that switches to machine
 * mode when its caller is a program — the behaviour this catalogue asks for in
 * [machine mode](../../../docs/wiki/concepts/machine-mode.md) — answers `--help` with a schema,
 * and `acc` itself is one of them. Parsing only prose would mean the rule could never be checked
 * against the tools that took the catalogue's own advice, which is the wrong way round.
 *
 * `{ name: "--flag", values: [...] }` is the shape `acc schema` publishes and the one the
 * `values`/`choices` vocabulary of every schema format surveyed converges on. Anything else is
 * simply not found, on the same terms as the prose reader above.
 */
function valueSetsFromJson(text: string): Record<string, string[]> | null {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  const out: Record<string, string[]> = {};
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const { name, values } = obj;
    if (
      typeof name === "string" &&
      /^--[a-z]/i.test(name) &&
      Array.isArray(values) &&
      values.length > 1 &&
      values.every((v) => typeof v === "string" && SET_MEMBER.test(v)) &&
      !(name in out)
    ) {
      out[name] = values as string[];
    }
    // Depth-first in declaration order, so the first set found is the one the document presents
    // first — a global flag ahead of a subcommand's, in every schema layout surveyed.
    for (const value of Object.values(obj)) visit(value);
  };
  visit(doc);
  return out;
}

/**
 * Parse a help screen heuristically.
 *
 * Deliberately conservative: finding nothing is a legitimate result. Guessing a subcommand
 * that does not exist would make the kit run an invocation it cannot classify as inert, and
 * guessing a flag that does not exist would produce false findings. Downstream, an empty
 * discovery turns dependent probes into `unverified` — an honest "could not check" rather than
 * a vacuous pass.
 */
export function parseHelp(text: string): Omit<Discovery, "helpReadable"> {
  const lines = text.split("\n");

  const subcommands: string[] = [];
  for (const line of blockLines(lines, COMMANDS_HEADING).content) {
    // Two or more trailing spaces (a description column, "list   List things.") or end-of-line
    // is what separates a real entry from prose that merely starts with a lowercase word inside
    // the block ("list of available flags below") — without it, a stray sentence reads as a verb.
    const m = /^\s+([a-z][a-z0-9:_-]*)(\s{2,}|$)/i.exec(line);
    // `:` stays in the character class because some CLIs namespace verbs with it for real
    // ("db:migrate", "cache:clear"). But gh's table style ("auth:  Authenticate...") suffixes
    // every name with a colon that is punctuation from the layout, not part of the name — left
    // in, a nested probe built from it (`gh auth: <sentinel>`) is rejected as an unknown ROOT
    // command by gh, which records a pass for a nesting check that verified nothing at all. Only
    // a single TRAILING colon is stripped; interior colons survive untouched.
    if (m?.[1]) subcommands.push(m[1].replace(/:$/, ""));
  }

  const flags = extractFlags(text, lines);
  const machineModeFlag = MACHINE_FLAGS.find((f) => flags.includes(f)) ?? null;
  // Same precedence as `extractFlags`: scope to the Options block when there is one, fall back to
  // the whole text when there is not. The JSON branch wins outright, because a document that
  // parses whole is a declaration rather than a layout to guess at.
  const valueSets = valueSetsFromJson(text) ?? extractValueSets(lines);
  return { subcommands, flags, machineModeFlag, valueSets };
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
    return {
      subcommands: [],
      flags: [],
      machineModeFlag: null,
      valueSets: {},
      helpReadable: false,
    };
  }
  return { ...parseHelp(text), helpReadable: true };
}
