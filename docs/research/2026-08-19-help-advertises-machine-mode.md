---
type: research
generated: { by: claude-opus-5, at: 2026-08-19 }
status: stable
description: What ten installed CLIs actually print in their root --help, and whether any of them names a machine-readable output path there.
tags: [discoverability, machine-mode, agent-facing]
---

# What root `--help` actually advertises

**Research date:** 2026-08-19

**Question:** D3 says a CLI's human root help should advertise its machine-readable path. Of the
CLIs installed on one developer machine, which ones actually do — and in what form? The rule page
records this as unmeasured: "no surveyed CLI's root help _text_ was captured, so which of `git`,
`docker`, `kubectl` or `gh` names its machine-mode flag at the root is unknown from this research."
This note captures the text.

**Method:** Every tool below was located with `command -v`, then invoked exactly once as
`<tool> --help` with stdin from `/dev/null`, stdout and stderr both redirected to a file
(`( "$t" --help ) </dev/null >"$t.txt" 2>&1`), i.e. **captured on a pipe, not a TTY**, with
`PAGER=cat GH_PAGER=cat GIT_PAGER=cat NO_COLOR=1` exported so no pager could truncate the
capture. The captured files were then searched with
`grep -niE 'json|--format|-o |output|jq|template|schema|machine|script'`. Two additional
captures were taken: `rg -h` (ripgrep's short help, which is a different document from its
`--help`), and a second `--help` capture of every tool through a pseudo-terminal
(`pty.fork()` + `execvp`, output diffed against the pipe capture) to test whether help changes
when stdout is a TTY. Machine: Darwin 25.5.0 arm64 (macOS 26.5.2, build 25F84). Versions as
reported by each tool on the same day:

| Tool      | Version reported                       | Command used               |
| --------- | -------------------------------------- | -------------------------- |
| `gh`      | `gh version 2.96.0 (2026-07-02)`       | `gh --version`             |
| `hf`      | `huggingface_hub version: 0.35.3`      | `hf version`               |
| `git`     | `git version 2.55.0`                   | `git --version`            |
| `docker`  | `Docker version 29.2.0, build 0b9d198` | `docker --version`         |
| `kubectl` | `Client Version: v1.34.1`              | `kubectl version --client` |
| `cargo`   | `cargo 1.96.0 (30a34c682 2026-05-25)`  | `cargo --version`          |
| `jq`      | `jq-1.7.1-apple`                       | `jq --version`             |
| `rg`      | `ripgrep 15.2.0`                       | `rg --version`             |
| `node`    | `v24.18.0`                             | `node --version`           |
| `go`      | `go version go1.26.5 darwin/arm64`     | `go version`               |

**Scope — deliberately not tested.** Only **root** help was captured. No subcommand help was run
(`gh pr list --help`, `hf download --help`, `kubectl get --help` and the like are all unexamined),
so this note says nothing about whether a flag missing from root help exists one level down — and
in several cases it certainly does. No man pages, no shell completions, no vendor documentation
and no `--generate`d output were read. No subcommand that acts was run at any point; every
invocation here is a help or version query. One machine, one moment, one version of each tool: a
different platform or a newer release may print different text. `hf` was tested only as the
`huggingface_hub` console script on this machine's `pyenv` shim path.

**Notation.** Every claim carries one of two labels and they are never mixed:

- **[MEASURED]** — read out of a capture taken by the method above. Quoted blocks are verbatim.
- **[READ]** — taken from a tool's own help text as a statement about itself (e.g. help naming a
  documentation URL), where the statement itself was measured but what it points at was not
  followed.

Nothing here is inferred from vendor documentation, changelogs, or memory. Where a question was
not answered by the capture, it is marked unanswered rather than filled in.

---

## 1. Results

All ten tools were present. `<tool> --help` exited `0` for nine of them; `go --help` exited `2`.
[MEASURED]

| Tool      | Root help names a machine-readable output path? | Names a query/composition flag? | Points at a reference / skill / docs surface? |
| --------- | ----------------------------------------------- | ------------------------------- | --------------------------------------------- |
| `rg`      | **Yes** — `--json`, in an options block         | No                              | Yes — `--generate`, plus a format URL         |
| `jq`      | **Yes** — the whole tool is the JSON path       | Yes — jq filters are the tool   | Yes — `man jq` and a project URL              |
| `gh`      | **Partly** — a JSON _help topic_, not a flag    | No                              | Yes — `reference` topic, manual URL, `skill`  |
| `go`      | **Partly** — a `-json` _help topic_, not a flag | No                              | Yes — `go help <topic>`                       |
| `node`    | **No** (for node's own output)                  | No                              | No                                            |
| `hf`      | **No**                                          | No                              | No                                            |
| `git`     | **No**                                          | No                              | Yes — `git help` guides                       |
| `docker`  | **No**                                          | No                              | Yes — a docs URL                              |
| `kubectl` | **No**                                          | No                              | Yes — a docs URL                              |
| `cargo`   | **No**                                          | No                              | Yes — `cargo help <command>`                  |

Two of ten name a machine-readable output path as a **flag** in root help. Two more gesture at one
through a help-topic table row. Six say nothing about structured output at the root at all.
[MEASURED]

**Not one of the ten names a query or composition flag** — no `-q`, no `--jq`, no `--template`, no
`--filter` — anywhere in root help. `jq` is the only tool whose root help describes a query
language, and that is because the query language _is_ the tool rather than a flag alongside an
output mode. [MEASURED]

## 2. Pipe versus TTY

Root help was captured both on a pipe and through a pseudo-terminal. Eight of the ten produced
**byte-identical** output. Two differed, and neither difference touches machine-mode content:
[MEASURED]

- `docker` re-wraps its `Global Options:` descriptions to the terminal width. On the pipe the
  `--context` description wraps across three lines; on the pty it is one long line. No flag
  appears or disappears.
- `jq` prints `argv[0]` in its usage lines. The pipe capture invoked it as `jq` and the pty
  capture invoked it by absolute path, so the usage lines read `jq [options] …` and
  `/usr/bin/jq [options] …` respectively. This is an artefact of how the two captures were
  invoked, not a TTY behaviour.

`gh` deserves a caveat: `GH_PAGER=cat` was set for both captures. Whether `gh --help` would
paginate on a TTY under a default environment was **not tested**, so "identical on a pty" here
means identical given that environment.

## 3. Per-tool captures

### `rg` — the clearest pass

ripgrep ships two root help documents and **both** name `--json`. The short help (`rg -h`) puts it
in an `OUTPUT MODES:` block: [MEASURED]

```
OUTPUT MODES:
  -c, --count                     Show count of matching lines for each file.
  --count-matches                 Show count of every match for each file.
  -l, --files-with-matches        Print the paths with at least one match.
  --files-without-match           Print the paths that contain zero matches.
  --json                          Show search results in a JSON Lines format.
```

The long help (`rg --help`, 74,678 bytes on this capture) expands the same flag: [MEASURED]

```
    --json
        Enable printing results in a JSON Lines format.

        When this flag is provided, ripgrep will emit a sequence of messages,
        each encoded as a JSON object, where there are five different message
        types:
```

and names where the format is specified: [MEASURED]

```
        A more complete description of the JSON format used can be found here:
        https://docs.rs/grep-printer/*/grep_printer/struct.JSON.html.
```

It also advertises a generated-artefact surface, though for completions and man pages rather than
for a machine-readable command reference: [MEASURED]

```
    --generate=KIND
        This flag instructs ripgrep to generate some special kind of output
        identified by KIND and then quit without searching. KIND can be one of
        the following values:

        man: Generates a manual page for ripgrep in the roff format.
```

`rg -h` also tells the reader the two documents differ, which is itself discovery: [MEASURED]

```
Use -h for short descriptions and --help for more details.
```

### `jq` — the whole tool is the machine path

`jq --help` opens by describing itself as a JSON processor, so the machine-readable path is not a
flag to be found but the premise of the program: [MEASURED]

```
jq - commandline JSON processor [version 1.7.1-apple]

Usage:	jq [options] <jq filter> [file...]
	jq [options] --args <jq filter> [strings...]
	jq [options] --jsonargs <jq filter> [JSON_TEXTS...]

jq is a tool for processing JSON inputs, applying the given filter to
its JSON text inputs and producing the filter's results as JSON on
standard output.
```

Its options block names output shaping directly: [MEASURED]

```
  -c, --compact-output      compact instead of pretty-printed output;
  -r, --raw-output          output strings without escapes and quotes;
```

and its help points at a documentation surface: [MEASURED]

```
the jq(1) manpage ("man jq") and/or https://jqlang.github.io/jq/.
```

`jq` is a boundary case for D3 rather than a clean pass. The rule is about a tool that has a human
mode and a machine mode and must tell you the second exists; `jq` has only the second.

### `gh` — a help topic, not a flag

`gh --help` **does not contain the string `--json` or `-q` anywhere**. What it contains is a row in
its `HELP TOPICS` table: [MEASURED]

```
HELP TOPICS
  accessibility: Learn about GitHub CLI's accessibility experiences
  actions:       Learn about working with GitHub Actions
  environment:   Environment variables that can be used with gh
  exit-codes:    Exit codes used by gh
  formatting:    Formatting options for JSON data exported from gh
  mintty:        Information about using gh with MinTTY
  reference:     A comprehensive reference of all gh commands
  telemetry:     Information about telemetry in gh
```

Three things in that block matter. `formatting` tells a reader that JSON export exists, without
naming the flag that produces it. `reference` is exactly the generated-reference pointer D3 asks
for. `exit-codes` is the same move for a neighbouring rule.

Root help also names an agent-facing surface as a command, under `CORE COMMANDS`: [MEASURED]

```
  skill:         Install and manage agent skills (preview)
```

Read carefully, that row is about installing agent skills, not about a skill documenting `gh`
itself; the capture does not establish which. It is quoted because the rule page makes a claim
about a `gh` agent skill, and this is the only thing in root help that touches the subject.

And the closing block: [MEASURED]

```
LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using `gh help exit-codes`
  Learn about accessibility experiences using `gh help accessibility`
```

Note what is absent: `gh` writes a `LEARN MORE` line for exit codes and one for accessibility, but
none for `formatting`. The JSON surface is the one help topic root help does not signpost twice.

`gh` would **fail** a strict reading of D3's own probe, which "scopes its flag scan to a recognised
options block". `gh --help`'s `FLAGS` block contains exactly two entries: [MEASURED]

```
FLAGS
  --help      Show help for command
  --version   Show gh version
```

### `go` — a help topic, not a flag

`go --help` exits `2` and prints the same overview as `go help`. Under `Additional help topics` it
carries one row that names a machine-readable encoding: [MEASURED]

```
	buildjson       build -json encoding
```

That row names `-json` as a thing `go build` emits, and points at `go help buildjson` for the
encoding. No root-level flag is advertised, and root help does not mention that `go list -json`
or `go test -json` exist. Whether `go help buildjson` documents a schema was **not tested** —
it is a second invocation and out of the root-help scope declared above.

### `node` — nothing for node's own output

`node --help` (24,650 bytes) contains the string `JSON` several times, but every occurrence
concerns something other than a machine-readable rendering of node's own output. The two closest:
[MEASURED]

```
  --report-compact            output compact single-line JSON
```

```
  --test-reporter=...         report test output using the given
                              reporter
```

The first shapes a diagnostic report file; the second selects a test reporter. Neither is a
general "give me your output as JSON" path, and root help names no such path. There is also a
rendering defect in the capture worth noting for anyone parsing this help mechanically —
two words run together with no space: [MEASURED]

```
                              process exits using aJSON configuration
```

### `hf` — nothing

The entire `hf --help` output is 1,022 bytes and contains **no** occurrence of `json`, `format`,
`schema`, `jq`, `template` or `query`, case-insensitive. Its `options:` block has exactly one
entry: [MEASURED]

```
options:
  -h, --help            show this help message and exit
```

The command table lists `auth`, `cache`, `download`, `jobs`, `repo`, `repo-files`, `upload`,
`upload-large-folder`, `env`, `version`, `lfs-enable-largefiles` and `lfs-multipart-upload`. No
`schema` command, no reference pointer, no documentation URL. Root help is a bare argparse
listing.

### `git`, `docker`, `kubectl`, `cargo` — nothing at the root

None of the four names a machine-readable output path in root help. [MEASURED]

- `git --help` contains no occurrence of `json`, `--format`, `schema` or `template`,
  case-insensitive. It points only at prose guides: `'git help -a' and 'git help -g' list
available subcommands and some concept guides.`
- `docker --help` has one match for the search pattern and it is coincidental —
  `attach      Attach local standard input, output, and error streams to a running container`.
  Its `Global Options:` block covers config, context, debug, host, log level, TLS and version;
  no output format. It closes with a docs pointer: `For more help on how to use Docker, head to
https://docs.docker.com/go/guides/`. [READ] for what that URL contains.
- `kubectl --help` has one match and it is likewise coincidental — `completion      Output shell
completion code for the specified shell (bash, zsh, fish, or powershell)`. `-o json` does not
  appear. Root help defers global flags entirely: `Use "kubectl options" for a list of global
command-line options (applies to all commands).` Whether `kubectl options` names `-o` was
  **not tested**. It opens with a docs pointer: ` Find more information at:
https://kubernetes.io/docs/reference/kubectl/`. [READ] for what that URL contains.
- `cargo --help` matches only on `-Zscript` and `-v, --verbose... Use verbose output`. Its
  `Options:` block names `--color <WHEN>`, `--config`, `--locked`, `--offline` and others; no
  message-format flag. It defers: `See 'cargo help <command>' for more information on a specific
command.`

## 4. What this changes for the rule

Three findings bear on D3 as written.

**The rule is describing a minority behaviour, not codifying a norm.** Two of ten installed CLIs
name a machine-mode flag in root help, and one of those two (`jq`) has no human mode to
distinguish it from. That is not an argument against the rule — a `diagnostic` rule is allowed to
find that most of the world fails it — but the rule page should not imply the practice is
established. [MEASURED]

**A "help topic" row is a real but weaker form of the behaviour, and the probe does not see it.**
`gh` and `go` both tell a reader that structured output exists without naming the flag. That is
strictly better than silence: an agent reading `formatting: Formatting options for JSON data
exported from gh` knows to look further, whereas nothing in `hf --help` suggests looking at all.
But it costs a second invocation, and D3's probe — which scans a recognised options block — would
score both as failures. Whether that is the right call is a rule-design question this note does
not settle; it only establishes that the two forms exist and are distinguishable. [MEASURED]

**The reference/docs pointer is far more common than the flag.** Seven of ten point somewhere:
`gh` at a `reference` topic and a manual URL, `docker` and `kubectl` at documentation URLs, `git`
and `cargo` and `go` at their own `help` subsystems, `jq` and `rg` at format specifications. The
cheap discovery path D3 describes is widely implemented; it is specifically the **flag** that goes
unadvertised. [MEASURED]

## 5. Verdict on the two claims this note was made to test

The rule page's `## Evidence` section asserts two things about specific tools.

**"`gh` mentions its structured surface in help" — partly true, and the wording matters.**
[MEASURED] `gh --help` mentions that a structured surface exists, via the `formatting` help-topic
row quoted in §3. It does **not** mention `--json`, `-q`, `--jq` or `--template`; those strings do
not occur in root help at all. So "mentions its structured surface" survives, and any reading that
`gh` advertises its machine-mode _flag_ in root help does not. The same sentence's claim that `gh`
"ships an agent-facing skill documenting invocation patterns, which its own changelogs point users
toward" is **not established by this note**: root help names a `skill` command described as
`Install and manage agent skills (preview)`, which is not the same thing, and no changelog was
read. That half of the claim remains unsourced.

**"`hf` documents `--json` and `-q` for composition directly in help" — refuted at the root.**
[MEASURED] `hf --help` on `huggingface_hub` 0.35.3 contains neither string, nor any occurrence of
`json` in any case. Its only documented option is `-h, --help`. The refutation is scoped to root
help: this note did not run `hf <subcommand> --help`, so it cannot say whether `--json` exists
deeper in the tool. What it can say is that the word "directly in help", read as root help, is
false for this version on this machine.

## 6. What could not be tested, and why

- **Subcommand help for every tool.** Out of the declared scope. This is the largest gap: a tool
  that fails D3 at the root may advertise `--json` prominently one level down, and for `gh`,
  `kubectl` and `docker` it is likely. That does not rescue the root-help claim, since D3 is
  specifically about the document an agent reads first, but it means "fails D3" must not be read
  as "has no machine mode".
- **Whether the advertised paths work.** No `--json` was ever executed. `rg --json` is named in
  help; that it is accepted and emits JSON Lines is untested here.
- **`gh --help` pagination under a default environment.** `GH_PAGER=cat` was forced for both
  captures, so the TTY-versus-pipe comparison for `gh` holds only under that setting.
- **`kubectl options`, `go help buildjson`, `git help -a`.** Each is a second invocation that
  would likely change the verdict's texture, and each is outside root help.
- **Swift ArgumentParser's `--experimental-dump-help`.** Named as unmeasured on the rule page; no
  ArgumentParser binary was in scope here, so it stays unmeasured.
- **Any platform but this one.** macOS on arm64, Homebrew and pyenv and nvm and cargo install
  paths. A Linux distribution's packaged `docker` or `kubectl` may print different help.
