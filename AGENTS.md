# agent-cli-conformance — agent guide

A specification and conformance kit for CLIs that LLM agents drive. `acc check <target>` runs
black-box probes against a binary and reports which rules it violated, which it could not
establish, and what each check left unproven. The wiki is the spec; `src/acc/` is its reference
implementation and its positive control.

Keep this file lean — an index plus the non-obvious essentials. Anything discoverable from
`package.json` or a directory listing does not belong here. If something below is wrong, fix it in
the same change: a grounding file that lies is worse than one that stays silent.

## Where to look

| Path                 | What it is                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| `docs/wiki/`         | the spec. `SCHEMA.md` is the contract for editing it; `STYLE.md` is the prose bar |
| `docs/research/`     | the evidence, dated and frozen — a corpus, never brought up to date               |
| `docs/reports/`      | findings someone is expected to act on; each one completes and discharges         |
| `docs/plans/`        | work not yet done                                                                 |
| `docs/roadmap.md`    | what is missing and why, with each gap's evidence                                 |
| `docs/techniques.md` | verification techniques that have each caught a real defect here                  |
| `src/acc/kit/`       | the runner, the checkers, the report algebra                                      |
| `scripts/docs-lint/` | the portable, zero-dependency wiki linter                                         |
| `.scratch/`          | untracked working material; "never touched again" is a valid end state            |

`research/`, `reports/` and `plans/` each have a `README.md` stating what earns a place in that
folder and what disqualifies it — the boundaries between them are load-bearing, not filing
preference. Read the one you are writing into. `docs/wiki/` uses `SCHEMA.md` for the same purpose.

## What's not obvious

- **The rule page and the checker are two halves of one declaration, and the lint compares them
  verbatim in both directions.** `tier`, `probe_level`, `coverage`, `coverage_gaps` and
  `coverage_established` must be identical on the page and in the checker. Change one, change the
  other, or `bun run check` fails. Gap phrases may contain **no comma and no space-hyphen-space** —
  the frontmatter parser splits on both.

- **Never invent how another tool behaves.** Every claim in the wiki about a framework, runtime or
  CLI must trace to `docs/research/` or a primary source, and say which. A plausible-sounding claim
  about `cobra` or `argparse` is the worst possible defect here, because the whole project is an
  argument that documentation without evidence is how this class of bug survives. If you cannot
  source it, cut it or measure it.

- **A measurement carries its coordinates; a rule does not.** Research notes are dated and name
  their versions, and are answered by a new note rather than edited. The failure mode nothing checks
  is the opposite direction: a wiki page lifting a versioned measurement into an unversioned claim.
  B4 asserted "exactly 65,536 bytes" as a property of pipes until Bun 1.4 delivered 131,072 through
  the same code path. Assert the invariant on the rule page; leave the number in the note.

- **`acc` is the positive control, so changing its output can legitimately fail the suite.**
  `src/acc/conformance.test.ts` runs the kit against `acc` itself. A kit with nothing that provably
  passes cannot tell "found a real defect" from "the checker is wrong" — so if that file goes red,
  the reference implementation stopped conforming, and that is the finding.

- **Rule ids and exit codes are append-only.** Both travel in stored reports that outlive a release.
  `1`–`8` are why the invocation failed, `9`–`123` are what the subject turned out to be, `124`+
  belong to the shell and to child processes. An outcome is not an error: `acc check` on a
  non-conformant target succeeded, and says so with `ok: true` on stdout and exit `9`.

- **Prose is gated too, and by taste rather than by the linter.** `docs/wiki/STYLE.md` names the
  defects this wiki has actually shipped; `.claude/skills/prose-cold-read/` is the review pass for
  finding them. Density is fine where it carries evidence and is not fine as decoration.

- **A check you have not seen fail is not a check.** After writing a regression test, put the
  defect back and confirm it goes red — three tests here passed both ways, two of them written by
  someone who thought they were being careful. The instinct generalises: build the adversarial
  fixture, run the thing rather than tracing it, and ask what happens to the population a rule has
  never met. [`docs/techniques.md`](docs/techniques.md) collects the ones that have caught
  something here, each with what it caught.

- **A fix is reviewed through two lenses, and one reviewer cannot hold both.** Whether the repair
  is correct is a different question from what else the thing it changed used to decide, and the
  second is the one that gets skipped — a guard suppresses, so whatever it suppresses that is not
  the target of the fix ships as a regression alongside the repair. Run both lenses together via
  the [`two-lens-review` skill](.claude/skills/two-lens-review/SKILL.md); serially is how the
  systemic defect gets found after the narrow one has already landed.

- **When you write a rule here, write the reason, not a number.** A cap like "at most two
  attempts" is easy to write and easy to follow off a cliff: the day there is a good reason for a
  third, the number is what gets obeyed. Give the condition instead — what you are looking for,
  and what tells you it has stopped arriving — so the next reader can recognise the case you did
  not think of. This is a standing preference of the repo owner's, and it applies to skills,
  guides and checker comments alike.

- **Markdown must already be Prettier-clean.** The check is `--check`, never `--write`, in both
  the hook and the gate — so a `.md` file that has never been formatted fails the commit and
  reverts it. Run `bunx prettier --write` on anything you author. The formatter is configured to
  leave fenced specimens alone, because half this wiki's evidence is deliberately malformed
  output that a formatter would silently repair.

## Branches and releases

Work lands on `develop`; `main` is what has been released. Branch off `develop` for a body of work,
merge back into `develop`, and open a PR from `develop` into `main` to begin a release. Docs-only
changes and paper-cuts can go straight to `develop`.

**A release takes two merges.** Merging into `main` publishes nothing — it makes release-please
open a second PR carrying the version bump and changelog, and merging _that_ creates the tag and the
GitHub Release. Between the two, `main` holds the next release rather than the last one.

Cutting a release runs the [`release` skill](.claude/skills/release/SKILL.md) — the note is written
by a fresh agent from the tree, cold-read, and carried through to the published GitHub Release,
which otherwise shows only a list of commit subjects.

**This is a pre-1.0 line, deliberately** — see
[stay pre-1.0 while the design is still moving](docs/wiki/decisions/pre-1-0-while-the-design-moves.md).
`bump-minor-pre-major` and `bump-patch-for-minor-pre-major` are set, so while the major is `0` a
**breaking change bumps the MINOR** and a **feature bumps the PATCH**. Without those options a `!`
bumps the major even from `0.x` — measured, before they were set: `feat(kit)!` on `0.2.0` shipped
`v1.0.0`, not `v0.3.0`. **Both readings have now been wrong once**, so verify against the release
rather than against this sentence.

**Reserve `!` for the promised surface, which is narrow.** One question decides it:

> **Did you change something in the STABLE column?** Rule ids, the exit-code taxonomy,
> `conformant`. If not — the report shape, `fullyVerified`, `acc.config.json` keys, CLI flags, the
> text layout — it is a `feat` or a `fix`, however large it felt to write.

The README carries the same split, for adopters. Typing every design change `!` would make the
version number meaningless rather than careful: this project is still deciding the right-hand
column, and a number that moves on every decision measures nothing.

**A `BREAKING CHANGE:` footer counts as much as the `!`.** release-please parses both, so removing
the `!` from a subject while leaving the footer in the body still cuts the bigger bump. Check the
whole message, not the first line.

`docs`, `chore`, `ci`, `test` and `refactor` produce no version and no release PR at all. A
docs-only merge to `main` that cuts no release is correct, not broken. Merge the promotion PR with a
merge or rebase commit — a squash takes its headline from the PR title, and a title that is not a
Conventional Commit leaves release-please with no signal at all.

## Commands

`bun run check` is **the** gate — typecheck, Biome, Markdown formatting, both docs lints, the
suite — and it is the only definition of one. CI runs that line and nothing else; the pre-commit
hook runs it behind a `lint-staged` pass that applies the same rules to staged files first, for
speed. Nothing the hook enforces is missing from `bun run check`, which is what makes a
`--no-verify` commit unable to land something CI would have caught. Everything else is in
`package.json`.
