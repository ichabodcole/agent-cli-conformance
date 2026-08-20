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

- **Markdown must already be Prettier-clean when you commit.** The pre-commit hook runs
  `prettier --check`, not `--write`, so a new `.md` file that has never been formatted fails the
  commit and reverts it. Run `bunx prettier --write` on anything you author.

## Branches and releases

Work lands on `develop`; `main` is what has been released. Branch off `develop` for a body of work,
merge back into `develop`, and open a PR from `develop` into `main` to begin a release. Docs-only
changes and paper-cuts can go straight to `develop`.

**A release takes two merges.** Merging into `main` publishes nothing — it makes release-please
open a second PR carrying the version bump and changelog, and merging _that_ creates the tag and the
GitHub Release. Between the two, `main` holds the next release rather than the last one.

**Most commit types do not release.** With `release-type: node` and no `changelog-sections`
override, `feat` bumps the minor, `fix` bumps the patch and a breaking change bumps the major;
`docs`, `chore`, `ci`, `test` and `refactor` produce no version and no release PR at all. A
docs-only merge to `main` that cuts no release is correct, not broken. Merge the promotion PR with a
merge or rebase commit — a squash takes its headline from the PR title, and a title that is not a
Conventional Commit leaves release-please with no signal at all.

## Commands

`bun run check` is **the** gate — typecheck, Biome, both docs lints, the suite — and it is the only
definition of one. The pre-commit hook and CI each run exactly that line, so neither can enforce
something the other does not. Everything else is in `package.json`.
