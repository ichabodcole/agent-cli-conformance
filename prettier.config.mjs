// Prettier owns markdown here; Biome owns everything else (Biome does not format .md).
//
// The settings below are not stylistic preferences — each one prevents a specific way that
// auto-formatting corrupts LLM-facing documentation. Measured, not assumed.

/** @type {import("prettier").Config} */
export default {
  // Leave the author's line breaks alone. This is prettier's default, and it is the right
  // one: hard-wrapping prose rewraps a whole paragraph when one word changes (burying the
  // real edit in diff noise) and splits greppable phrases across lines, which breaks the
  // literal searches agents actually run.
  proseWrap: "preserve",

  // THE IMPORTANT ONE. By default prettier formats code inside fenced blocks whose language
  // it recognises. This repo documents NON-CONFORMING behaviour on purpose — a rule page
  // showing malformed JSON or a mis-invoked command is the evidence for the rule. Verified:
  // with this on, `{ "ok": false, error: 'x' }` in a ```json fence is silently rewritten to
  // valid JSON, destroying the counter-example. A formatter must never edit a specimen.
  embeddedLanguageFormatting: "off",

  printWidth: 100,

  overrides: [
    {
      // The evidence trail: dated agent-authored reports, cited but never revised. Structural
      // tidying is fine; nothing here is hand-maintained.
      files: "research/**/*.md",
      options: { printWidth: 100 },
    },
  ],
};
