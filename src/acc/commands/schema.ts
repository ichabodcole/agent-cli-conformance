import { emit, type OutputMode } from "../envelope.ts";
import { ERROR_KINDS } from "../exit-codes.ts";
import { COMMANDS, GLOBAL_ARGS } from "../spec.ts";
import { VERSION } from "../version.ts";

/**
 * The machine-readable self-description.
 *
 * Serialised from `spec.ts` — the same declaration the parser is built from — so it cannot
 * describe a flag the parser rejects, or omit one the parser accepts. A schema maintained
 * separately from the parser is a document that lies as soon as anyone edits the other.
 *
 * Works with no configuration, no credentials, and no network, so it is safe as a first probe
 * against an unknown build.
 */
export function schemaCommand(mode: OutputMode, startedAt: number): void {
  const data = {
    name: "acc",
    version: VERSION,
    description: "Agent CLI Conformance — explore the spec and check binaries against it.",
    global_args: GLOBAL_ARGS,
    commands: COMMANDS.map((c) => ({
      name: c.name,
      description: c.description,
      effects: c.effects,
      output_kind: c.output_kind,
      cardinality: c.cardinality,
      positionals: c.positionals,
      args: c.args,
      errors: c.errors,
      examples: c.examples,
    })),
    // Every declared kind, its code, and whether a blind retry is meaningful. A conformance
    // run provokes each one and verifies the code matches what is promised here.
    errors: Object.entries(ERROR_KINDS).map(([kind, spec]) => ({ kind, ...spec })),
  };

  emit({
    mode,
    command: "schema",
    startedAt,
    data,
    next: [{ command: "acc rules --tier core", when: "to see what a conforming CLI must satisfy" }],
    // Text mode still emits JSON here: the schema IS structured data, and pretty-printing it
    // into prose would produce something no one can consume and no one wants to read.
    renderText: (d) => JSON.stringify(d, null, 2),
  });
}
