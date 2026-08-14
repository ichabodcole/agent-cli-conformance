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
 * Scoped to a detected Options/Flags block so unrelated `--flags` elsewhere in the help text —
 * a piped example (`mycli list | jq --raw-output`), a docs URL, a flag some OTHER program takes
 * — aren't mistaken for the target's own surface.
 *
 * Falls back to an unscoped scan of the whole text only when no options heading was found
 * anywhere. Finding less is safer than inventing, but finding nothing when a real options block
 * exists (just formatted in a way we don't recognize) would be worse than the old unscoped scan.
 */
function extractFlags(text: string, lines: string[]): string[] {
  const scoped: string[] = [];
  let inOptions = false;
  let foundBlock = false;
  for (const line of lines) {
    if (OPTIONS_HEADING.test(line)) {
      inOptions = true;
      foundBlock = true;
      continue;
    }
    if (inOptions && (line.trim() === "" || NEXT_HEADING.test(line.trim()))) {
      inOptions = false;
      continue;
    }
    if (!inOptions) continue;
    for (const m of line.matchAll(FLAG_RE)) scoped.push(m[1] as string);
  }
  if (foundBlock) return [...new Set(scoped)];
  return [...new Set([...text.matchAll(FLAG_RE)].map((m) => m[1] as string))];
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
  let inCommands = false;
  for (const line of lines) {
    if (COMMANDS_HEADING.test(line)) {
      inCommands = true;
      continue;
    }
    // A blank line or a new heading ends the block.
    if (inCommands && (line.trim() === "" || NEXT_HEADING.test(line.trim()))) {
      inCommands = false;
      continue;
    }
    if (!inCommands) continue;
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
