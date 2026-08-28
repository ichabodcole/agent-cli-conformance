import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { emit, type OutputMode, useColor } from "../envelope.ts";
import { conflictError, notFoundError, permissionError, usageError } from "../errors.ts";
import { DeclarationError, loadDeclaration } from "../kit/declaration.ts";
import { buildHarness, HarnessError, type PathSource } from "../kit/harness.ts";
import { isExecutable, toTarget } from "./check.ts";

/**
 * EMIT A CAPTURE HARNESS for the command paths below the root.
 *
 * The kit probes the root and nothing else, on purpose. Everything below it has to be run by the
 * person who owns the tool — so this command produces the script they run, and `acc check
 * --recorded-surfaces` reads what it wrote.
 *
 * ## Why the harness goes to `--out` and not to stdout
 *
 * `acc`'s stdout is a NEGOTIATED ENVELOPE SURFACE: what lands there is chosen at run time by
 * format resolution, and a redirect is not a terminal, so `acc probe-plan ./t > capture.sh`
 * resolves to JSON and writes an envelope into a file named `capture.sh`. That is machine-mode
 * detection working correctly — it is one of the things this project tells other people to do —
 * and routing around it would mean either exempting one command from the CLI's own contract or
 * making the artifact depend on a resolution the caller must remember to pin. A `--format text`
 * that you must never forget is a default that is wrong.
 *
 * The deeper reason, from the adopter who asked for `--out`, then withdrew it, then re-adopted it
 * on this: **this command has two outputs and only one of them is a report.** For every other
 * command `text` and `json` are two renderings of one answer; here `text` would be an executable
 * shell script and `json` a description of a plan — two different artifacts, one for a reader and
 * one for `sh`. Stdout was already occupied by the report, which is why the script needs its own
 * sink.
 *
 * So `effects` is `idempotent`, not `read_only`. Nothing in the standard says a conforming CLI has
 * no mutating commands; it says a CLI declares its effects honestly. Same inputs in, same bytes
 * out, and a second run leaves the same state.
 */
export interface ProbePlanOptions {
  declaration?: string;
  paths?: string;
  out?: string;
  force?: boolean;
}

/** The sentinel the emitted harness sends. Fixed rather than a flag: the guide's warning is that
 *  a sentinel the target genuinely accepts erases the whole read, and a default nobody edits is
 *  safer than an option somebody sets to a plausible flag. */
const SENTINEL = "--acc-not-a-flag";

/** What the harness asks the target to say about itself. Captured by DEFAULT and not configurable:
 *  a tool with no `--version` should record the failure rather than have the plan omit the
 *  question, and `identity` is explicitly not verified to be a version by anything downstream. */
const IDENTITY_ARGV = ["--version"];

/**
 * Read a caller-supplied path list.
 *
 * A JSON array of arrays — the same shape as `commands[].path`, so a caller who has written a
 * declaration is not learning a second vocabulary. Newline-delimited text is the tempting
 * alternative and it is wrong: a multi-token path has no unambiguous separator, and `send note`
 * would have to be split on a space that can legitimately be inside a token.
 */
function loadPathList(file: string): string[][] {
  const abs = resolve(file);
  if (!existsSync(abs))
    throw notFoundError(`no such file: ${file}`, {
      hint: '--paths takes a JSON file holding an array of command paths, e.g. [["state"], ["send", "note"]].',
    });
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    throw usageError(`${abs} is not valid JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(raw) || raw.length === 0)
    throw usageError(`${abs} must hold a non-empty JSON array of command paths`, {
      hint: 'Each entry is an array of tokens: [["state"], ["send", "note"]].',
    });
  return raw.map((entry, i) => {
    if (!Array.isArray(entry) || entry.some((t) => typeof t !== "string"))
      throw usageError(
        `${abs} entry ${i} is not an array of strings. Each command path is its own array of tokens, so a multi-token path needs no separator this reader could get wrong`,
      );
    return entry as string[];
  });
}

export function probePlanCommand(
  targetPath: string,
  opts: ProbePlanOptions,
  mode: OutputMode,
  startedAt: number,
): void {
  const target = toTarget(targetPath);
  if (!existsSync(target.path))
    throw notFoundError(`no such file: ${targetPath}`, {
      hint: "Pass a path to an executable or a .ts entry point — the same target you would give acc check.",
    });
  // A TARGET THAT CANNOT BE SPAWNED, REFUSED HERE RATHER THAN CAPTURED LATER.
  //
  // `acc check` discovers this by spawning and reports it as `not_found`; this command spawns
  // nothing, so it asks the question statically instead — `toTarget` resolved argv0 to the file
  // itself, meaning no interpreter will be prepended, and the file is not executable.
  //
  // Without this the harness runs and captures its OWN shell's "Permission denied" at every path,
  // honestly and completely, and the census then reports what the target accepts on the strength
  // of an error the target never emitted. Every field in that batch is true and the conclusion
  // drawn from it is about the wrong program.
  if (target.argv0.length === 1 && !isExecutable(target.path))
    throw notFoundError(`target could not be executed: ${targetPath}`, {
      hint: "The file exists but nothing would be able to spawn it. Check the exec bit, the shebang, and the architecture — the harness would otherwise record its own shell's error as if the target had written it.",
      details: { argv0: target.argv0 },
    });

  // TWO SOURCES, AND THE CHOICE IS THE CALLER'S TO STATE. Guessing paths from help is refused
  // outright: discovery's verb extraction is a heuristic tuned for the root, and a wrong path list
  // produces records at paths that do not exist.
  if (opts.declaration && opts.paths)
    throw usageError("--declaration and --paths both name a source of command paths", {
      hint: "Give one. The declaration is the convenient source; a path list is the one that can find a verb your declaration does not name.",
    });
  if (!opts.declaration && !opts.paths)
    throw usageError("no source of command paths was given", {
      hint: "Pass --declaration <file> to derive them from what you declared, or --paths <file> to supply them from wherever you actually enumerate verbs.",
    });

  let paths: string[][];
  let pathSource: PathSource;
  if (opts.paths) {
    paths = loadPathList(opts.paths);
    pathSource = "caller-supplied";
  } else {
    try {
      // The root is dropped rather than refused: a declaration normally declares it, the kit
      // probes it for itself, and a batch carrying a root record is refused wholesale. Silently
      // omitting the one path the caller could not have used is the right reading of their file.
      paths = loadDeclaration(opts.declaration as string)
        .commands.map((c) => c.path)
        .filter((p) => p.length > 0);
    } catch (err) {
      // A FILE THAT IS NOT THERE IS `not_found`, WHATEVER FLAG NAMED IT. Mapping every
      // `DeclarationError` to `usage` made the same mistake answer differently depending on which
      // source the caller chose — `--paths ./missing.json` said not_found and
      // `--declaration ./missing.json` said usage — and it made this command's own declared error
      // list false, which is the worse half.
      if (err instanceof DeclarationError)
        throw err.missing
          ? notFoundError(`no such file: ${opts.declaration}`, {
              hint: "--declaration takes a declaration file; its commands[].path entries become the paths to probe.",
            })
          : usageError(`${err.path} ${err.message}`);
      throw err;
    }
    pathSource = "declaration";
  }

  let harness: string;
  try {
    harness = buildHarness({
      launcher: target.argv0,
      // Provenance anchor: the tree the TARGET sits in, resolved here because the generator is
      // pure. Without it the emitted script read git from its own cwd, and two adopters running
      // from scratch directories got "build unknown" for targets at a known commit.
      targetDir: dirname(resolve(target.path)),
      paths,
      sentinel: SENTINEL,
      identityArgv: IDENTITY_ARGV,
      pathSource,
      out: "batch.json",
      // The file the caller was told to create. It sits untracked in their repo beside the
      // harness and the batch, so it has to be excluded from the harness's own dirt check for
      // the same reason those two are.
      sourceFiles: [resolve((opts.paths ?? opts.declaration) as string)],
    });
  } catch (err) {
    if (err instanceof HarnessError) throw usageError(err.message);
    throw err;
  }

  let written: string | null = null;
  if (opts.out) {
    const abs = resolve(opts.out);
    if (!existsSync(dirname(abs)))
      throw notFoundError(`no such directory: ${dirname(abs)}`, {
        hint: "The parent directory of --out must exist; this command does not create one.",
      });
    // REFUSE RATHER THAN OVERWRITE. A generator that silently replaces a harness somebody has
    // edited is the same class of surprise as a JSON envelope in a file called capture.sh.
    if (existsSync(abs) && !opts.force)
      throw conflictError(`${abs} already exists`, {
        hint: "Pass --force to overwrite it, or choose another path. Refusing rather than replacing a file you may have edited.",
      });
    try {
      // Written in ONE call. A streamed write truncates its target before the content exists, so
      // a failure part-way leaves a SHORT script that still runs — capturing some paths and not
      // others, with nothing marking the absence. Half a harness is worse than none.
      writeFileSync(abs, harness, { encoding: "utf8", mode: 0o755 });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EACCES" || code === "EPERM")
        throw permissionError(`cannot write ${abs}: ${(err as Error).message}`);
      throw err;
    }
    written = abs;
  }

  // THE LIMIT IS NAMED AT GENERATION TIME, standing next to the person who chose the source.
  // A declaration-derived plan can only ever probe paths the declaration already names, so a verb
  // the parser accepts and the declaration omits is not a disagreement in the census — it is
  // absent from it, leaving no trace anywhere. Nothing downstream can recover that, and nothing
  // downstream is told: the batch carries no field for it, by decision rather than by omission.
  const limit =
    pathSource === "declaration"
      ? "paths came from the declaration, so a path your parser accepts and your declaration omits was not probed and cannot appear as a disagreement"
      : "paths were supplied by the caller — derived from the implementation, which does not mean complete";

  emit({
    mode,
    command: "probe-plan",
    startedAt,
    data: {
      target: target.path,
      launcher: target.argv0,
      sentinel: SENTINEL,
      identityArgv: IDENTITY_ARGV,
      pathSource,
      paths,
      out: written,
      limit,
      harness: written === null ? harness : undefined,
    },
    next: written
      ? [
          {
            exec: "sh",
            args: [written],
            when: "to run the capture and write batch.json",
          },
        ]
      : [
          {
            exec: "acc",
            // CARRYING THE SOURCE FLAG THROUGH. Suggesting the bare invocation dropped the
            // `--paths`/`--declaration` the caller supplied and this command requires, so the
            // proposal `next` made was one the tool refuses at exit 2.
            args: [
              "probe-plan",
              targetPath,
              opts.paths ? "--paths" : "--declaration",
              (opts.paths ?? opts.declaration) as string,
              "--out",
              "./capture.sh",
            ],
            when: "to write the harness to a file you can run",
          },
        ],
    renderText: (d) => {
      const dim = useColor() ? "\x1b[2m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      const lines = [
        `${d.paths.length} command path${d.paths.length === 1 ? "" : "s"} planned, ${d.pathSource}`,
        ...d.paths.map((p) => `  ${p.join(" ")} ${dim}${d.sentinel}${reset}`),
        "",
        `LIMIT: ${d.limit}`,
      ];
      if (d.out) {
        lines.push("", `wrote ${d.out}`, `run it: sh ${d.out}`);
      } else {
        lines.push(
          "",
          "No --out was given, so the harness was not written. The script is in `.data.harness`",
          "of the JSON output; --out is how you get a runnable file.",
        );
      }
      return lines.join("\n");
    },
  });
}
