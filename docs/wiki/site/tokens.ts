// "We use semantic tokens throughout" is exactly the kind of claim this repo refuses to take on
// trust: it is true the day it is written and quietly false the first time someone drops a `#666`
// into a rule under deadline. Nothing about the stylesheet would notice.
//
// So the property is a gate. `assertTokenDiscipline` runs in `docs:build` and throws, which means
// a colour literal outside the token block does not produce a slightly-off page — it produces no
// page at all. Same argument the wiki makes for every rule it publishes: a declaration you cannot
// falsify is a comment that lies.

/** Everything between these markers is the token layer, and the only place a literal may live. */
const TOKEN_START = "/* == tokens:start == */";
const TOKEN_END = "/* == tokens:end == */";

/** Colour functions. A literal in any of these forms is a literal however it is spelled. */
const COLOR_FUNCTION = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i;

/** `#abc`, `#aabbcc`, `#aabbccdd`. Only ever tested against declaration VALUES, so an `#id`
 *  selector cannot be mistaken for one. */
const HEX = /#[0-9a-fA-F]{3,8}\b/;

/**
 * Properties whose value carries a colour, shorthands included.
 *
 * Checked with a WHITELIST of permitted value words rather than a blacklist of the 148 CSS
 * colour names. A blacklist has to be complete to be sound, and `rebeccapurple` is exactly the
 * kind of name that would be missing from a hand-written one — so the rule is inverted: in a
 * colour-bearing declaration, every bare word must be a keyword that provably is not a colour.
 */
const COLOR_PROPERTIES =
  /^(color|background|background-color|border|border-(top|right|bottom|left|block|inline)(-(start|end))?(-color)?|border-color|outline|outline-color|box-shadow|text-shadow|text-decoration|text-decoration-color|text-emphasis-color|caret-color|accent-color|fill|stroke|column-rule|column-rule-color|scrollbar-color)$/;

/** Value words that are structurally part of a colour-bearing shorthand and are not colours. */
const NON_COLOR_KEYWORDS = new Set([
  "none",
  "inherit",
  "initial",
  "unset",
  "revert",
  "auto",
  "transparent",
  "currentcolor",
  "solid",
  "dashed",
  "dotted",
  "double",
  "groove",
  "ridge",
  "inset",
  "outset",
  "hidden",
  "thin",
  "medium",
  "thick",
  "underline",
  "overline",
  "line-through",
  "wavy",
  "from-font",
  "no-repeat",
  "repeat",
  "center",
  "cover",
  "contain",
  "0",
]);

const NUMERIC = /^-?[\d.]+(px|rem|em|%|vh|vw|ch|s|ms|deg)?$/;

/** A `prop: value` pair found in the stylesheet, with the line it sits on. */
interface Declaration {
  prop: string;
  value: string;
  line: number;
}

/** Strip comments, then pull out every declaration outside the token block. */
export function declarationsOutsideTokens(css: string): Declaration[] {
  const start = css.indexOf(TOKEN_START);
  const end = css.indexOf(TOKEN_END);
  if (start === -1 || end === -1)
    throw new Error(`site.css is missing its ${TOKEN_START} / ${TOKEN_END} markers`);

  // Blank the token block and every comment, preserving newlines so line numbers stay honest.
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  const scanned = css
    .slice(0, start)
    .concat(blank(css.slice(start, end + TOKEN_END.length)), css.slice(end + TOKEN_END.length))
    .replace(/\/\*[\s\S]*?\*\//g, blank);

  const out: Declaration[] = [];
  const lines = scanned.split("\n");
  for (const [n, line] of lines.entries()) {
    const m = /^\s*([-a-zA-Z]+)\s*:\s*([^;{}]*);/.exec(line);
    if (m) out.push({ prop: (m[1] as string).toLowerCase(), value: m[2] as string, line: n + 1 });
  }
  return out;
}

/**
 * Every violation of the token contract in `css`, as human-readable strings.
 *
 * Two rules, and the second is the one that does the real work:
 *
 * 1. No hex literal or colour function anywhere outside the token block.
 * 2. In a colour-bearing declaration, every value word is `var(--…)`, a number, or a keyword
 *    known not to be a colour. That catches named colours without needing to enumerate them.
 */
export function tokenViolations(css: string): string[] {
  const problems: string[] = [];

  for (const { prop, value, line } of declarationsOutsideTokens(css)) {
    if (HEX.test(value))
      problems.push(`site.css:${line}  hex literal outside the token block: ${prop}: ${value}`);
    if (COLOR_FUNCTION.test(value))
      problems.push(`site.css:${line}  colour function outside the token block: ${prop}: ${value}`);

    if (!COLOR_PROPERTIES.test(prop)) continue;
    // `var(--x)` may itself contain spaces in a fallback, so blank the var() calls first and
    // inspect what is left over.
    const rest = value.replace(/var\(\s*--[^)]*\)/g, " ");
    for (const word of rest.split(/[\s,/]+/).filter(Boolean)) {
      const w = word.toLowerCase();
      if (NON_COLOR_KEYWORDS.has(w) || NUMERIC.test(w)) continue;
      problems.push(
        `site.css:${line}  \`${word}\` is a bare value in a colour property; use a semantic token: ${prop}: ${value}`,
      );
    }
  }

  return problems;
}

/** Throw if the stylesheet has drifted off the semantic layer. Called from the build. */
export function assertTokenDiscipline(css: string): void {
  const problems = tokenViolations(css);
  if (problems.length)
    throw new Error(
      `${problems.length} colour literal(s) outside the token block — every rule must reference the semantic layer:\n  ${problems.join("\n  ")}`,
    );
}
