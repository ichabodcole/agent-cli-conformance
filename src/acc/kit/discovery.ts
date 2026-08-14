import { runProbe } from "./runner.ts";
import type { Discovery, Invocation, TargetInfo } from "./types.ts";

const MACHINE_FLAGS = ["--json", "--format", "--output"];

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
  const flags = [
    ...new Set([...text.matchAll(/(?<![\w-])(--[a-z][a-z0-9-]*)/gi)].map((m) => m[1] as string)),
  ];

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
