import { emit, type OutputMode } from "../envelope.ts";
import { VERSION } from "../version.ts";

/**
 * The version, as a FIELD rather than a bare string.
 *
 * D1 requires machine mode to carry the version in a structured payload, and commander's
 * built-in `--version` handling wrote `0.0.0` and exited before the envelope existed. That
 * escaped the positive control too, because the D1 checker probes only plain `--version` — in a
 * terminal that is text mode, where a bare string is exactly right.
 *
 * Text mode keeps the bare string on purpose: `acc --version` in a shell should be pipeable
 * into a comparison, and wrapping it would break every script that reads it.
 */
export function versionCommand(mode: OutputMode, startedAt: number): void {
  emit({
    mode,
    command: "--version",
    startedAt,
    data: { name: "acc", version: VERSION },
    next: [{ command: "acc schema", when: "to see the surface this version implements" }],
    renderText: (d) => d.version,
  });
}
