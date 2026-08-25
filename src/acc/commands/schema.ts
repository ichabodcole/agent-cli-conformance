import { emit, type OutputMode } from "../envelope.ts";
import { ERROR_KINDS } from "../exit-codes.ts";
import { COMMANDS, errorsOf, GLOBAL_ARGS } from "../spec.ts";
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
export function schemaCommand(mode: OutputMode): void {
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
      // Derived, not copied. Every command can fail in the parser before its handler runs, so
      // `usage` belongs to all six whether or not any of them declared it — a schema that says
      // an outcome cannot happen, while it plainly can, is worse than one that says nothing.
      errors: errorsOf(c),
      examples: c.examples,
      // Serialised too: a caveat that only a human reading `--help` can see is invisible to
      // exactly the caller this whole tool is built for.
      ...(c.notes?.length ? { notes: c.notes } : {}),
    })),
    // Every declared kind, its code, and whether a blind retry is meaningful.
    //
    // This is the reference TAXONOMY, not a list of outcomes this CLI has been seen to produce.
    // The suite provokes the three `acc` can currently reach — `usage`, `not_found` and
    // `internal` — and asserts that every declared code is distinct and below the reserved
    // passthrough band. `auth`, `permission`, `conflict`, `rate_limit` and
    // `confirmation_required` are declared for consumers to implement against and no command
    // here emits one, so nothing verifies their codes at runtime. The serialisation is derived
    // from ERROR_KINDS, so the schema cannot drift from the source; it can only outrun what has
    // been exercised.
    errors: Object.entries(ERROR_KINDS).map(([kind, spec]) => ({ kind, ...spec })),
  };

  emit({
    mode,
    command: "schema",
    // No `startedAt`. In machine mode this document IS `acc --help`, and D4 forbids help from
    // carrying a duration — `meta.durationMs` flipped between 0 and 1 depending on how loaded
    // the machine was, so two runs differed by one byte and `acc` failed its own core rule.
    // Caught by CI on a slower runner after passing locally for months, which is the whole
    // argument for the rule: a duration in a description of the tool measures the machine.
    data,
    next: [
      {
        exec: "acc",
        args: ["rules", "--tier", "core"],
        when: "to see what a conforming CLI must satisfy",
      },
    ],
    // Text mode still emits JSON here: the schema IS structured data, and pretty-printing it
    // into prose would produce something no one can consume and no one wants to read.
    //
    // It emits the ENVELOPE, not the bare payload. Printing the raw object in a terminal and
    // the enveloped one in a pipeline gave the same argv two incompatible query paths chosen
    // by whether stdout was a TTY — which is why the published `acc schema | jq '.commands[]'`
    // example failed. Every other command envelopes, generic tooling should not have to
    // special-case this one, and the envelope carries `meta` and `next` that the bare object
    // does not.
    renderText: (_d, envelope) => JSON.stringify(envelope, null, 2),
  });
}
