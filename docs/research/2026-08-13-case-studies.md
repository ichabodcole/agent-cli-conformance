---
type: research
generated: { by: claude-opus-5, at: 2026-08-13 }
status: stable
description: How best-in-class CLIs actually structure themselves, probed primary-source against gh, kubectl, docker, git, cargo, deno and npm.
tags: [exit-codes, parsing, streams, discoverability]
---

# Case Studies: How Best-in-Class CLIs Actually Structure Themselves

**Research date:** 2026-08-13
**Method:** Primary-source. Where a tool was installed locally it was probed empirically (exact version noted); otherwise official docs and source were read. Claims I could not verify are marked **unconfirmed**.

**Locally probed versions:** `gh` 2.96.0 (2026-07-02), `kubectl` v1.34.1, `docker` (Desktop, current), `git` (homebrew, current), `cargo`/`rustc` (current stable), `deno` (current), `npm` 11.x.

**Deliberately out of scope** (already covered elsewhere): clig.dev, clispec.dev v0.3, the Arcjet "Designing a CLI for AI agents" post, the HuggingFace `hf` CLI post. Referenced only for contrast.

---

## 1. Comparison Table

### 1.1 Command grammar

| Tool          | Shape                                                                                          | Depth                                                | Aliases                                                                                                    | Documented rationale                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **gh**        | **noun-verb** (`gh pr create`)                                                                 | max **3**; empirically 34 cmds @1, 182 @2, **13 @3** | `gh alias set`, one built-in (`co`→`pr checkout`), Cobra cmd aliases (`gh agent-task`≡`agent`/`agents`)    | Yes — [`docs/command-line-syntax.md`](https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md) + [primer.style/design/native/cli](https://primer.style/design/native/cli/) |
| **kubectl**   | **verb-noun** (`kubectl get pods`)                                                             | mostly 2, 3 for `create <kind>`                      | Resource `shortNames` from the API (`po`,`svc`,`deploy`), machine-discoverable via `kubectl api-resources` | Partial — [kubectl conventions](https://kubernetes.io/docs/reference/kubectl/conventions/)                                                                                           |
| **docker**    | **both** — legacy verb-first (`docker ps`) + management noun-verb (`docker container ls`)      | 2–3                                                  | Legacy top-level commands retained permanently as aliases                                                  | Yes — 1.13 CLI restructure                                                                                                                                                           |
| **aws**       | `aws <service> <verb-noun-op>` (`aws ec2 describe-instances`)                                  | 2 generated, 3 for hand-written                      | User-defined `~/.aws/cli/alias`; **cannot create new namespaces**                                          | Implicit: surface is generated from botocore API models                                                                                                                              |
| **stripe**    | **noun-verb** (`stripe customers create`) **plus** HTTP passthrough (`stripe get /v1/charges`) | 2, 3 for sub-resources/plugins                       | None user-facing                                                                                           | Yes — [resource vs HTTP commands](https://docs.stripe.com/stripe-cli/overview)                                                                                                       |
| **git**       | verb-first, flat (`git commit`)                                                                | 1 (+ sub-verbs: `git remote add`)                    | `alias.*` in git-config; `!`-prefix escapes to shell                                                       | Yes — **plumbing vs porcelain** two-tier design                                                                                                                                      |
| **cargo**     | verb-first, flat (`cargo build`)                                                               | 1–2                                                  | Built-in (`b`→`build`); external `cargo-foo` on PATH becomes `cargo foo`                                   | Yes — [external tools](https://doc.rust-lang.org/cargo/reference/external-tools.html)                                                                                                |
| **terraform** | verb-first (`terraform plan`)                                                                  | 1–2                                                  | —                                                                                                          | —                                                                                                                                                                                    |
| **vercel**    | noun-verb, plus `vercel api` passthrough                                                       | 2                                                    | —                                                                                                          | —                                                                                                                                                                                    |

### 1.2 Output contracts

| Tool                | Machine flag                                                                                | Schema stability guarantee                                                                      | Explicitly unstable                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **gh**              | `--json f1,f2` (**fields required**), `--jq`, `--template`; `gh api` (raw, no `--json`)     | **None published**                                                                              | Human/TTY output; `gh preview`; all `(preview)` commands                                                  |
| **kubectl**         | `-o` with 14 values on `get`; **but `-o` is not uniform across commands**                   | **Yes, strong** — inherited from Kubernetes API group versioning (`v1`, `v1beta1`) + OpenAPI    | `-o wide` is unstable **by omission**, not by statement (see §2.2); KYAML explicitly byte-unstable        |
| **docker**          | `--format json`, `--format '{{json .}}'`, Go templates                                      | **None published** — and the two JSON spellings **disagree** (§2.3)                             | Template output generally                                                                                 |
| **aws**             | `--output json\|yaml\|yaml-stream\|text\|table\|off`; `--query` (JMESPath)                  | Inherits AWS service API stability                                                              | **`--output text`** — columns alphabetized by JSON key, so positions shift silently when a field is added |
| **stripe**          | JSON by default; per-command `--print-json` / `--format JSON` / `--json` (**inconsistent**) | **Yes, strongest in industry** — dated API versions + published backward-compatible-change list | Plugins (`projects`, `tools`)                                                                             |
| **git**             | `--porcelain[=v1\|v2]`, `-z`, `--format`/`--pretty`, `cat-file --batch`                     | **Yes, explicit** — porcelain "guaranteed not to change in a backwards-incompatible way"        | `--short`, all default human output                                                                       |
| **cargo**           | `--message-format=json` (NDJSON), `cargo metadata --format-version=1`                       | **Yes, versioned** — consumer pins via `--format-version`; warns if unpinned                    | `-Z` unstable flags (nightly-only)                                                                        |
| **terraform**       | `-json` (NDJSON stream)                                                                     | **Yes, versioned** — `format_version` with explicit major/minor contract                        | —                                                                                                         |
| **salesforce `sf`** | `--json`; `SF_CONTENT_TYPE=JSON` env                                                        | **Yes** — JSON covered by deprecation policy; breaking changes get 4 months                     | Human-readable output ("relying on human readable output is not supported")                               |
| **vercel**          | `--json` / `--format json` (broad coverage)                                                 | Unconfirmed                                                                                     | —                                                                                                         |

### 1.3 Exit codes

| Tool          | Beyond 0/1?                                                                                                                                | Documented?                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **aws**       | **Yes — richest.** 0,1,2,130,252,253,254,255                                                                                               | [Published table](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-returncodes.html) |
| **git**       | **Yes, by convention.** 1 = meaningful negative, **128** = refused/fatal, **129** = misused (bad option); predicates overload 1 as boolean | Per-command only                                                                               |
| **docker**    | **Yes.** 1, **125** (docker itself failed), 126 (not invokable), 127 (not found), **64** (malformed template), container code passthrough  | **No** — not in the CLI reference                                                              |
| **gh**        | **Yes.** 0,1,2 (cancelled),4 (auth) documented; **8 (pending) implemented but undocumented**                                               | `gh help exit-codes`                                                                           |
| **terraform** | `plan -detailed-exitcode`: 0=no changes, 1=error, **2=changes present**                                                                    | Yes                                                                                            |
| **cargo**     | 0, **101** on error — but **unknown flag = 1**, and `cargo run` passes the child's code through                                            | Table published but **incomplete**                                                             |
| **kubectl**   | Effectively 0/1 (`DefaultErrorExitCode = 1` is the only constant); `kubectl diff` documents 0/1/>1                                         | Only for `diff`                                                                                |
| **deno**      | **No — every failure is 1** (except `Deno.exit(n)` passthrough)                                                                            | No                                                                                             |
| **stripe**    | **No — always 1 on any failure**                                                                                                           | No                                                                                             |
| **npm**       | Non-standard (observed **254**)                                                                                                            | Partially                                                                                      |

### 1.4 Discovery, unknown-input, destructive ops

| Tool          | Introspection                                                                                                                   | Unknown command                                                                        | Unknown flag                   | Destructive op                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **gh**        | `gh help reference` = **entire tree as Markdown** (92KB, 229 cmds); bare `--json` lists fields; completions                     | Suggests, **exit 1**                                                                   | Rejects + usage, **exit 1**    | Prompt; `--yes`; **`--yes` ignored if target implicit**; non-TTY → "required when not running interactively"            |
| **kubectl**   | **`api-resources`** + **`explain`** (live OpenAPI) + `options` + completions — **strongest**                                    | Suggests, exit 1                                                                       | Rejects, exit 1                | **Never prompts** by default; opt-in `-i/--interactive`; `--force`, `--grace-period`                                    |
| **docker**    | Completions                                                                                                                     | **No suggestion**, exit 1                                                              | Rejects, **exit 125**          | Prompts on `prune`; `-f/--force`                                                                                        |
| **aws**       | `aws help topics`, `--generate-cli-skeleton {input,yaml-input,output}`, `--cli-auto-prompt`, SQLite `ac.index`, botocore models | `Found invalid choice 'x'` + `Maybe you meant:` (difflib cutoff **0.8**), exit **252** | exit 252                       | **Never prompts, no `--force`**; safety = `--dryrun`/`--dry-run`                                                        |
| **stripe**    | `stripe resources`, `<res> --help`→Available Operations, `stripe docs/api/search`, `tools search→details --json→execute`        | Suggests (first match only), exit 1                                                    | exit 1                         | **Prompts, requires typing `yes`**; `-c/--confirm`; **test mode is the default**, `--live` opt-in                       |
| **git**       | `git --list-cmds=<groups>` (undocumented but real), `rev-parse`, `for-each-ref`                                                 | Suggests; **`help.autocorrect` can auto-run it**                                       | exit 129 (usage) / 128 (fatal) | Essentially never prompts; `clean` needs `-f` (`clean.requireForce`); **`--force-with-lease`** = optimistic concurrency |
| **cargo**     | `cargo --list`                                                                                                                  | Suggests + "find a package to install", **exit 101**                                   | exit 1                         | `--dry-run` as first-class convention                                                                                   |
| **deno**      | —                                                                                                                               | **No suggestion — treats it as a file path** (`deno rn` → "Module not found")          | Rejects, exit 1                | Permission prompts; `-A`; granular `--unstable-*`                                                                       |
| **terraform** | —                                                                                                                               | —                                                                                      | —                              | `apply` prompts; `-auto-approve`; `-json` **implies `-input=false`**                                                    |
| **vercel**    | `vercel skills`, `vercel api`                                                                                                   | —                                                                                      | —                              | `--yes`/`-y`; global `--non-interactive`; **agent auto-detection**                                                      |

---

## 2. Per-Tool Notable Details

### 2.1 `gh` (GitHub CLI) — the TTY-adaptive reference implementation

**Grammar.** Strictly noun-verb. The in-repo [`docs/command-line-syntax.md`](https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md) is a real, enforced mini-spec: `<placeholder>`, `[optional]`, `{required | choice}`, `...` for repeatable, and "for multi-word variables use dash-case." Empirically enforced — e.g. `gh discussion view {<number> | <discussion-url> | <comment-id> | <comment-url>}`.

Depth is deliberately capped at 3. Parsing `gh help reference` gives **34 commands at depth 1, 182 at depth 2, 13 at depth 3, zero at depth 4**. The 13 deepest are all sub-noun-then-verb: `gh repo autolink create`, `gh repo deploy-key add`, `gh codespace ports forward`.

**Output.** `--json` **requires an explicit field list**, because fields map to a GraphQL selection set. The discovery mechanism is the flag's own error path:

```
$ gh pr list --json          # exit 1
Specify one or more comma-separated fields for `--json`:
  additions, assignees, author, autoMergeRequest, baseRefName, ...
```

Long-standing requests to invert this ([#9588](https://github.com/cli/cli/issues/9588), [#8215](https://github.com/cli/cli/issues/8215), [#5800](https://github.com/cli/cli/issues/5800)) remain open — the design has held.

**No JSON schema stability guarantee exists.** `docs/releasing.md` commits only to semver-shaped release numbering. Fields have been added and reverted in patch releases (v2.34.0 → reverted in [v2.37.0](https://github.com/cli/cli/releases/tag/v2.37.0)).

**Exit codes.** `gh help exit-codes` documents 0, 1, 2 (cancelled), 4 (auth). [`internal/ghcmd/cmd.go`](https://github.com/cli/cli/blob/trunk/internal/ghcmd/cmd.go) also implements `exitPending = 8`, **which is not documented**. Three behaviors worth stealing:

- **`NoResultsError` → exit 0**, with the explanatory message printed _only if stdout is a TTY_. Emptiness is not failure.
- **Closed pager pipe → exit 0** (piping to `head` isn't a failure).
- **Extension exit codes pass through unchanged.**

**TTY-adaptive output — empirically confirmed.** Same command, two shapes:

```
$ GH_FORCE_TTY=80 gh repo list cli --limit 2
Showing 2 of 10 repositories in @cli
NAME                        DESCRIPTION                 INFO    UPDATED
cli/cli                     GitHub's official comma...  public  about 1 hour ago
cli/gh-extension-precom...  Action for publishing b...  public  about 2 days ago

$ gh repo list cli --limit 2 | cat
cli/cli<TAB>GitHub's official command line tool<TAB>public<TAB>2026-08-13T18:59:08Z
cli/gh-extension-precompile<TAB>Action for publishing binary GitHub CLI extensions<TAB>public<TAB>2026-08-11T09:56:15Z
```

Piped output is tab-delimited, header-free, **untruncated**, with **absolute RFC3339 timestamps**. TTY output truncates values, colorizes, adds a preamble, and relativizes time. Documented in [`docs/primer/foundations`](https://github.com/cli/cli/blob/trunk/docs/primer/foundations/README.md) and explicitly designed to be `cut`-compatible.

> **Agent hazard.** Many agent harnesses allocate a PTY. A PTY-allocating agent gets the _truncated, ANSI-colored, relative-timestamp_ variant. `GH_FORCE_TTY` forces this on; nothing forces it off except not being a TTY.

**Destructive ops — two rules worth copying.** From [`pkg/cmd/repo/delete/delete.go`](https://github.com/cli/cli/blob/trunk/pkg/cmd/repo/delete/delete.go):

1. Non-TTY converts the prompt into a **required flag**, not a silent default:
   `--yes required when not running interactively` (exit 1).
2. **An implicit target voids the bypass flag.** `gh repo delete --yes` with no argument warns and _downgrades to an interactive prompt_, because the target would be inferred from cwd. Help text: _"For safety, when no repository argument is provided, the `--yes` flag is ignored."_

`--confirm` was deprecated to `--yes` by binding **both flags to the same variable** plus Cobra's `MarkDeprecated` — nothing breaks.

**No deprecation policy.** Instead, gh uses **preview namespacing**: `gh preview` ("should be considered unstable and can change at any time") and per-command banners (`gh agent-task`, `gh skill`: _"in preview and subject to change without notice"_).

### 2.2 `kubectl` — the introspection reference implementation

Verb-noun (`kubectl get pods`), the mirror image of `gh`. **No documented rationale for the choice exists** — the [conventions page](https://kubernetes.io/docs/reference/kubectl/conventions/) covers scripting practice, not grammar philosophy. Treat "kubectl chose verb-noun deliberately" as unconfirmed.

The grammar is also **not uniformly applied**: `kubectl create secret generic` is verb-noun-noun, and `kubectl config get-contexts` is noun-verb. Max depth is 3, reached only by `create secret {generic,tls,docker-registry}` and `create service {clusterip,externalname,loadbalancer,nodeport}`.

**Aliases are server-side data, not client constants — the single best design point here.** Short names live in the API resource registry and arrive over discovery as the `shortNames` field of `APIResourceList`:

```json
{
  "name": "pods",
  "singularName": "pod",
  "namespaced": true,
  "version": "v1",
  "kind": "Pod",
  "verbs": ["get", "list"],
  "shortNames": ["po"]
}
```

Because the alias table is not hardcoded in the CLI, **CRDs contribute their own short names** and the client discovers them at runtime.

**Introspection surface**, the strongest in the survey precisely because the CLI does not own the schema:

- **`kubectl api-resources`** — machine-readable resource catalog (`-o json|yaml|name|wide`, filters `--verbs`, `--categories`, `--api-group`, `--namespaced`).
- **`kubectl explain <type>[.<field>]`** — reads the **live OpenAPI schema from the server**. Caveat: `--recursive` is _"Currently only 1 level deep"_, contradicting the common assumption that it dumps the whole tree. Output is `plaintext`/`plaintext-openapiv2` — **no JSON at all**.
- **`kubectl __complete`** (hidden Cobra endpoint) is a real machine-readable introspection API returning TSV `value<TAB>description` plus a directive line — flags _with descriptions_ and live resource names, without parsing help text.

**The stability statement is by omission, not by declaration.** The conventions page says:

> For a stable output in a script: Request one of the machine-oriented output forms, such as `-o name`, `-o json`, `-o yaml`, `-o go-template`, or `-o jsonpath`. … Fully-qualify the version. For example, `jobs.v1.batch/myjob`. … Don't rely on context, preferences, or other implicit states.

`-o wide` is **conspicuously absent from that list** — but no sentence anywhere declares it unstable. The real guarantee is inherited from the API deprecation policy, not promised by the CLI, which is why the advice is to pin `jobs.v1.batch`. (Note the third clause — _"don't rely on ... implicit states"_ — is the same insulation-from-user-config principle git states as a promise.)

**`-o` is not a uniform contract**, a significant wart: `get` accepts 14 values; `api-resources` 4; `version` only `yaml|json`; `explain` has no JSON; and **`kubectl describe` has no `-o` flag at all**. The two richest _explanatory_ commands have no machine-readable output — the biggest agent-facing gap in kubectl.

**Errors: structured on the wire, unstructured at the CLI boundary.** The API returns `metav1.Status` objects with `reason`, `code`, `message`, `details`, and `causes`. kubectl flattens them:

```
Error from server (Forbidden): pods is forbidden: User "tester" cannot list resource "pods" ...
```

`reason` and `message` survive _as a string_; `code`, `details`, and `causes` are discarded; nothing goes to stdout; and there is no `-o json` for errors. A consumer must regex the parenthetical.

**Exit codes**: `pkg/cmd/util/helpers.go` defines exactly one constant, `DefaultErrorExitCode = 1`. Only `kubectl diff` documents its status (_"0 No differences were found. 1 Differences were found. >1 Kubectl or diff failed with an error"_) — and notably requires `KUBECTL_EXTERNAL_DIFF` to honor the same convention. `kubectl auth can-i -q` is a deliberate exit-code-as-API design. One real bug: **`kubectl api-resources` against an unreachable cluster exits 2 via an unhandled Go panic**, and the same panic reproduces through the completion path — meaning **agent tab-completion of resource types panics when the cluster is unreachable**.

**Deprecation policy — the most rigorous published**, and uniquely it has _separate CLI rules_:

- **Rule #5a — user-facing (kubectl):** GA elements must keep working **12 months or 2 releases** (whichever is longer) after announced deprecation; Beta 3 months or 1 release; Alpha 0.
- **Rule #5b — admin-facing (kubelet):** GA only **6 months or 1 release**.
- **Rule #5c:** a CLI element may not be deprecated in favor of a _less stable_ alternative.
- **Rule #6:** _"Deprecated CLI elements must emit warnings (optionally disable) when used."_

> The design insight: **user-facing CLI gets a longer guarantee than admin-facing.** Humans and their scripts are treated as the more fragile consumer than operators.

**No confirmation on delete — and the refusal is documented.** [KEP-3895](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/3895-kubectl-delete-interactivity/README.md) concedes `kubectl delete` is "disruptive and irreversible" and prone to "inaccurate usage, mistyping, hasty tab completions," then refuses to change the default:

> Due to the backwards compatibility concerns, seeking confirmation from a user before proceeding to genuinely delete as default, is out of the table. … In terms of backwards compatibility, **this flag's default will always be false.**

Instead it added opt-in `-i/--interactive` (GA in k8s 1.30), which **enumerates the resources it is about to delete** and exits **0** when declined. Two other good details: `--grace-period` _"can only be set to 0 when --force is true"_ — the dangerous combination is **interlocked**, not merely warned about — and the docs state plainly that **"the delete command does NOT do resource version checks"**, so a concurrent update is silently lost (the exact hazard `--force-with-lease` solves for git).

`--dry-run` takes `none|server|client`, where `server` performs a real validation round-trip without persisting: a _validated_ dry run, not a simulated one.

### 2.3 `docker` — migration without breaking, and an unstable JSON contract

Docker is the survey's best case study in **restructuring a grammar without breaking callers**. Docker **1.13.0 (January 2017)** restructured a flat verb-first CLI into noun-verb management commands. The stated rationale: Docker 1.12's **40-plus top-level commands** "cluttered help pages and made tab-completion difficult," mixing containers, images, networks, and volumes in one list ([docker/docs#3819](https://github.com/docker/docs/issues/3819)).

**Legacy commands were kept and are still not deprecated** — nine years later they work, appear in help, and are absent from the [deprecated features page](https://docs.docker.com/engine/deprecated/). The implementation is elegant: **one command with an alias set, not two code paths**, and both spellings print the _same_ alias block, so help teaches the mapping in both directions:

```
$ docker ps --help           → Aliases: docker container ls, docker container list, docker container ps, docker ps
$ docker container ls --help → Aliases: docker container ls, docker container list, docker container ps, docker ps
```

**The migration was then partly walked back.** Docker 23.0 reorganized `docker --help` into a curated **"Common Commands"** shortlist (`run, exec, ps, build, pull, push, images, ...`) — which is _verb-first and legacy-spelled_ — above the Management Commands. So the end state is noun-verb for completeness, verb-first for the hot path, and **curation to solve the very discoverability problem noun-verb was introduced to solve.**

**`DOCKER_HIDE_LEGACY_COMMANDS` is a pattern worth stealing.** Documented verbatim: _"When set, Docker hides 'legacy' top-level commands ... in `docker help` output, and only `Management commands` per object-type ... are printed."_ Measured: `docker --help` lists **64** commands normally, **36** with the variable set. Crucially it only hides them from help — **the commands still run.** An env var that lets an advanced consumer opt into the stricter grammar, with zero deprecation risk.

**Exit codes are the most differentiated of the container-era CLIs, and entirely undocumented in the CLI reference.** Measured: success 0; unknown command 1; bad template _field_ 1; **malformed template 64** (`EX_USAGE`); **unknown flag 125**; binary not found in container 127; container exited 42 → **42 passthrough**.

The 125/126/127 split is the meaningful design: **125 = the docker command itself failed, 126 = found but not invokable, 127 = not found, anything else = the container's own code.** That reserved namespace lets a caller distinguish "docker broke" from "your workload returned non-zero" — something kubectl cannot do. The wart: unknown _commands_ return 1 while unknown _flags_ return 125 and malformed templates return 64 — three codes for what is arguably one category (you typed it wrong).

**No stability statement exists in the formatting docs**, and this has three measurable consequences:

1. **`--format json` and `--format '{{json .}}'` are NOT equivalent.** Same key set, different _values_:

   ```
   $ docker ps -a --format json          → "Size": "0B"
   $ docker ps -a --format '{{json .}}'  → "Size": "24.6kB (virtual 498MB)"
   ```

   The CLI appears to decide whether to request size computation from the daemon by inspecting the format string, and the `json` shorthand doesn't trip the heuristic. Two documented-as-interchangeable spellings **disagree silently, with no error.**

2. **The Go-template namespace and the JSON namespace diverge.** JSON uses the struct tag; the template uses the Go field name:

   ```
   $ docker version --format json | jq '.Client.ApiVersion'  → "1.53"
   $ docker version --format '{{.Client.ApiVersion}}'        → template error, exit 1
   $ docker version --format '{{.Client.APIVersion}}'        → 1.53
   ```

   **You cannot take a key you saw in `--format json` and address it in a template.**

3. **`--format json` emits NDJSON for list commands but a single object for scalar commands** — a consumer needs different parsing per command.

`--format json` rolled out **per-command and staggered** (v23.0 for `docker info`, v24.0 for `docker events`), not as a CLI-wide feature.

**Unknown command does NOT suggest** — Docker is a Cobra app and deliberately suppresses Cobra's suggester:

```
$ docker imagse                          # edit distance 2 — well within Cobra's default
docker: unknown command: docker imagse
Run 'docker --help' for more information  # exit 1
```

This is [docker/cli#5234](https://github.com/docker/cli/pull/5234) (merged 2024-07-16, shipped 28.0.0), which replaced dumping the _entire_ help on an unknown subcommand with a one-line error plus short usage. The design intent was explicitly **print less on error, not more** — the opposite of kubectl's choice.

**A real agent hazard, empirically confirmed:**

```
$ docker inspect nonexistent-container-xyz --format json
[]                                              # ← stdout: valid, empty JSON
error: no such object: nonexistent-container-xyz # ← stderr
                                                 # exit 1
```

Docker writes **valid-but-empty JSON to stdout _and_ an error to stderr**. An agent parsing only stdout sees "no results" rather than "error."

**Destructive ops: prompt on computed blast radius, not on named targets.** `docker rm`, `docker rmi`, and `docker volume rm` do **not** prompt; only the `prune` family does. The rule appears to be _"prompt when the target set is computed rather than named"_ — a defensible line. And the prompt **enumerates exactly what will be destroyed, expanding with the flags**:

```
WARNING! This will remove:
  - all stopped containers
  - all networks not used by at least one container
  - all dangling images
  - unused build cache
Are you sure you want to continue? [y/N]
```

That is materially better than a generic "Are you sure?" — the user reads the actual blast radius. `-f/--force` skips; **declining exits 0**, same as kubectl's `--interactive`.

**Deprecation policy is far weaker than Kubernetes'**: _"remains in Docker for at least one stable release unless specified explicitly otherwise."_ One release, with an escape hatch, no stability tiers, no warning requirement. What Docker does well is the **published table** with Status/Deprecated/Remove columns giving per-feature target versions (usually one major out, e.g. v29→v30), archived per-version in the repo so the history is auditable.

**Agent affordances shipped in the binary**: `docker mcp` (MCP Toolkit), `docker ai` (Gordon), and `docker model` (Model Runner). See §4.3.

### 2.4 `aws` — generated surface, richest exit codes

**The CLI is machine-generated from botocore JSON service models** (`botocore/data/<service>/<api-version>/service-2.json`). AWS states it directly: _"Each operation corresponds to a subcommand in the AWS CLI."_ AWS gets enormous surface for free and pays with zero ergonomic curation.

**The exit code table** ([published](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-returncodes.html)) is the richest in the survey:

| Code    | Meaning                                                            |
| ------- | ------------------------------------------------------------------ |
| 0       | Success                                                            |
| 1       | One or more S3 transfer operations failed _(S3 only)_              |
| 2       | Command couldn't be parsed _(all)_ / files skipped _(S3)_          |
| 130     | Interrupted by SIGINT (computed as `128 + signal.SIGINT`)          |
| **252** | Invalid syntax / unknown parameter / bad parameter value           |
| **253** | Invalid system environment or configuration (missing creds/region) |
| **254** | Request succeeded but **the service returned an error**            |
| 255     | General failure                                                    |

The 252/253/254 split is the important part: it lets a caller branch on **"my syntax / my environment / their service"** without parsing prose. 252–254 were **added in v2**.

Caveats: the table isn't fully honored ([#8766](https://github.com/aws/aws-cli/issues/8766) — `aws configure get region` returns 1 instead of 253), and two unknown-argument code paths coexist (252 for the AWS-customized argparser, 2 for raw argparse).

**`--generate-cli-skeleton {input,yaml-input,output}`** with `--cli-input-json`/`--cli-input-yaml` forms a closed loop. `yaml-input` emits inline comments carrying each parameter's description, `[REQUIRED]` markers, and enumerated valid values — effectively a self-documenting typed schema emitted by the CLI itself. Two caveats: skeleton keys are **API parameter names, not CLI flag names** (`--user-name` → `"UserName"`), and hand-written commands (`aws s3`) don't support it at all.

**`--output off`** suppresses stdout entirely — "useful in automation scripts and CI/CD pipelines where you only need to check the command's exit code."

**The `--output text` + `--query` trap**, verbatim: _"If you specify `--output text`, the output is paginated **before** the `--query` filter is applied, and the AWS CLI runs the query once on **each page**."_ Plus: text columns are alphabetized by underlying JSON key, so **column positions shift silently when a service adds a field**.

**The v2 pager default** is the notorious CI/agent trap: v2 pipes all output through `less`/`more` by default. Disable via `--no-cli-pager`, `AWS_PAGER=`, or `cli_pager=`.

**AWS never prompts.** `aws s3 rm --recursive` has no confirmation and no `--force`. Safety is preview-then-commit: `--dryrun` (s3), `--dry-run` (EC2, returns the `DryRunOperation` error).

**Deprecation policy** is dated and three-phase ([#9994](https://github.com/aws/aws-cli/issues/9994)): v1 GA 2015-11-19→2026-07-14, maintenance →2027-07-14, end-of-support 2027-07-15, **artifacts never deleted**. ~11 years of GA.

### 2.5 `stripe` — strongest stability policy, weakest exit codes

**Dual surface**: generated resource commands (`stripe customers create`) _plus_ raw HTTP passthrough (`stripe get /v1/charges`). Resource commands are generated from Stripe's **OpenAPI spec** via `//go:generate` ([`pkg/gen/`](https://github.com/stripe/stripe-cli/tree/master/pkg/gen)), keyed on the `x-stripeOperations` annotation.

The passthrough matters: a brand-new API endpoint is usable _before_ the CLI is regenerated. AWS has no equivalent — an un-modeled operation is simply unreachable.

**Exit codes: always 1.** [`pkg/cmd/root.go`](https://github.com/stripe/stripe-cli/blob/master/pkg/cmd/root.go) has exactly one failure path — `os.Exit(1)`. Error _categorization_ affects only the human message. A caller cannot distinguish "you typo'd" from "card declined" from "key expired" without scraping stderr. **This is the starkest single contrast with AWS in the survey.**

**Stability policy — the industry's strongest.** Dated versions with botanical release trains (current `2026-07-29.dahlia`). Major trains may break; **monthly releases are guaranteed backward-compatible**. Crucially, Stripe publishes _what consumers must tolerate_:

> Stripe considers the following changes to be backward-compatible:
>
> - Adding new API resources.
> - Adding new optional request parameters to existing API methods.
> - Adding new properties to existing API responses.
> - **Changing the order of properties in existing API responses.**
> - **Changing the length or format of opaque strings**, such as object IDs, error messages, and other human-readable strings. This includes adding or removing fixed prefixes (such as `ch_` on charge IDs). Make sure that your integration can handle Stripe-generated object IDs, which can contain up to **255 characters**.
> - Adding new event types. Make sure that your webhook listener gracefully handles unfamiliar event types.

Plus a **72-hour rollback window** with webhook replay in the old shape. I know of no comparable commitment elsewhere.

**Destructive ops — the strongest safety model in the survey, and it isn't a prompt.** `stripe delete` does prompt (requiring the literal word `yes`; `-c/--confirm` skips). But the real protection is that **every command defaults to test mode**; `--live` is opt-in. The blast radius of a mistaken agent command is a test object. `stripe sandbox create` goes further — a throwaway sandbox with working keys, **without a Stripe account**, explicitly framed for agents.

### 2.6 `git` — plumbing/porcelain, and the strongest output-stability wording

Git is the canonical **deliberate two-tier CLI**: "porcelain" (human, unstable) vs "plumbing" (machine, stable). The main man page literally partitions its command list this way.

The naming is confusing but the guarantee is exact. From `git status --help`:

> Version 1 porcelain format is similar to the short format, but is **guaranteed not to change in a backwards-incompatible way between Git versions or based on user configuration**. This makes it ideal for parsing by scripts.

Two clauses matter equally:

1. **Stable across versions** — the obvious part.
2. **Stable across user configuration** — porcelain explicitly ignores `color.status` and `status.relativePaths`.

> **This second clause is the one most tools miss.** Machine output must be insulated not just from version drift but from _the invoking user's config_. `aws --output text` fails this (column order depends on API shape); `gh --json` passes it; git states it as a promise.

Supporting machine affordances: `-z` (NUL-separated, so filenames with newlines are safe), `--porcelain=v2` (a richer, self-describing successor added without breaking v1), `git for-each-ref --format`, `git cat-file --batch`.

> **A naming trap worth avoiding.** `--porcelain` the _flag_ produces **plumbing-grade stable output** — the opposite of "porcelain" the tier. The word means "output suitable for building a porcelain on top of." Any spec borrowing the two-tier idea should not borrow this name.

**Exit codes are richer than usually credited, and split three ways** (measured): unknown subcommand → **1**; unknown option → **129**; fatal refusal (`git clean` without `-f`) → **128**. So **129 = you used me wrong, 128 = I refused, 1 = a meaningful negative answer.**

And the predicate commands deliberately overload exit 1 as a **boolean result**, not an error: `git diff --exit-code` returns 1 when differences exist, `git grep` returns 1 on no-match, `git merge-base --is-ancestor` returns 0/1. Exit code as a query answer.

**Unknown command** suggests:

```
$ git stauts
git: 'stauts' is not a git command. See 'git --help'.
The most similar command is
	status                                    # exit 1
```

And uniquely, git can **auto-run the suggestion**. `help.autoCorrect` accepts `show` (default, show only), `immediate` (run now), a positive number > 1 (run after that many **deciseconds**), `never`, and `prompt`. Measured behavior:

| Value             | Behavior                                                                                                           | Exit  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| `never`           | error only, **suppresses the suggestion**                                                                          | 1     |
| `0` (default)     | error + suggestion, does not run                                                                                   | 1     |
| `immediate`       | warns, then **runs it**                                                                                            | **0** |
| `20` (2s)         | _"Continuing in 2.0 seconds, assuming that you meant 'status'."_ then **runs it — even with stdin at `/dev/null`** | **0** |
| `prompt`, non-TTY | degrades to error, **and silently drops the suggestion**                                                           | 1     |

> Two findings for an agent CLI. The deciseconds mode **auto-executes a command the user never typed, in a non-interactive context, and returns 0** — a typo becomes a successful action. And `prompt` degrades _safely_ (fails closed) but _badly_: it throws away the "did you mean" hint the default mode would have printed, so the non-interactive caller gets **strictly less information** than with `autoCorrect=0`. Degrading a prompt should never cost you the diagnostic.

**Destructive ops.** Git essentially never prompts — it **refuses and names the flag**. `clean.requireForce` _"Defaults to true"_, so `git clean` yields `fatal: clean.requireForce is true and -f not given: refusing to clean` (exit 128), and a _second_ `-f` is needed for nested repos.

The standout is **`--force-with-lease`**: force-push only if the remote ref still equals the expected value — _"like taking a 'lease' on the ref without explicitly locking it."_ This is **optimistic concurrency control as a CLI flag**, and it beats any confirmation because it is _checkable_ rather than _attestable_.

But git's own docs contain the critical caveat, and it changes the recommendation:

> Note that all forms other than `--force-with-lease=<refname>:<expect>` that specifies the expected current value of the ref explicitly are **still experimental and their semantics may change**…
>
> The protection it offers over `--force` is ensuring that subsequent changes your work wasn't based on aren't clobbered, but this is **trivially defeated if some background process is updating refs in the background.**

> **The lesson: expected state inferred from a local cache is defeated by concurrent actors.** Only the form where the _caller passes the expected value explicitly_ is sound — and it is the only form git itself considers non-experimental. An agent CLI adopting this pattern must require the explicit value, not infer it.

**Introspection: `git --list-cmds=<group>`** returns machine-readable command lists — but git(1) documents it with a disclaimer: _"This is an internal/experimental option and may change or be removed in the future."_ Two groups are unexpectedly valuable:

- `git --list-cmds=deprecated` → a **machine-readable deprecation list** (`pack-redundant`, `whatchanged`)
- `git --list-cmds=others` → **machine-readable plugin discovery** (any `git-*` on `PATH`)

**Deprecation policy** ([BreakingChanges.adoc](https://github.com/git/git/blob/master/Documentation/BreakingChanges.adoc)): breaking releases are irregular and _"typically measured in multiple years"_ (1.6.0 → 2008, 2.0 → 2014). Breaking changes are developed behind a compile-time `WITH_BREAKING_CHANGES` switch so they are **testable long before release** — a genuinely good practice. Three admissible categories (outdated defaults, superseded concepts, unfixable features); explicitly excluded are "fixes to minor bugs that may cause a change in user-visible behavior."

### 2.7 `cargo` — the only tool that structures its _errors_

This is the most decision-relevant finding in the survey.

`cargo build --message-format=json` emits **newline-delimited JSON** in which errors are first-class structured objects. Empirically, on a type error:

```json
{
  "reason": "compiler-message",
  "package_id": "path+file:///tmp/cargotest#t@0.1.0",
  "manifest_path": "/tmp/cargotest/Cargo.toml",
  "target": {
    "kind": ["bin"],
    "name": "t",
    "src_path": "...",
    "edition": "2021"
  },
  "message": {
    "$message_type": "diagnostic",
    "level": "error",
    "message": "mismatched types",
    "code": { "code": "E0308" },
    "spans": [
      {
        "file_name": "src/main.rs",
        "line_start": 1,
        "line_end": 1,
        "column_start": 25,
        "column_end": 31,
        "byte_start": 24,
        "byte_end": 30,
        "is_primary": true,
        "label": "expected `i32`, found `&str`",
        "suggested_replacement": null,
        "suggestion_applicability": null
      }
    ],
    "children": [],
    "rendered": "error[E0308]: mismatched types\n --> src/main.rs:1:25\n..."
  }
}
```

Three properties no other surveyed tool has together:

1. **Errors are structured**, with a stable machine code (`E0308`), precise source spans (line, column, _and byte offsets_), and machine-applicable fix suggestions (`suggested_replacement`, `suggestion_applicability`).
2. **The human rendering is a field inside the machine payload** (`"rendered"`). One output serves both audiences — no mode flag has to choose.
3. **The stream carries an explicit terminal event.** Message `reason`s observed: `compiler-artifact`, `compiler-message`, `build-finished`. `build-finished` carries `{"success": true|false}` — a streaming consumer learns the outcome _from the stream_, not only from the exit code.

**Versioning is consumer-pinned, and cargo nags you to pin.** Empirically:

```
$ cargo metadata --no-deps
warning: please specify `--format-version` flag explicitly to avoid compatibility problems
{"packages":[...],"version":1,...}

$ cargo metadata --format-version=1 --no-deps
{"packages":[...],"version":1,...}     # no warning
```

The consumer **requests** a version via flag; the producer **echoes** it in the payload. Invalid values fail closed and list the valid set (`[possible values: 1]`).

**Crucially, cargo defines stability as _additive-compatible_ and says so explicitly** — this is more honest and more maintainable than a blanket freeze:

> Within the same output format version, the compatibility is maintained, except some scenarios. The following is a non-exhaustive list of changes that are **not** considered as incompatible:
>
> - **Adding new fields** — New fields will be added when needed. Reserving this helps Cargo evolve without bumping the format version too often.
> - **Adding new values for enum-like fields** — Same as adding new fields.
> - **Changing opaque representations** — The inner representations of some fields are implementation details. … Consumers shouldn't rely on those representations unless specified.

That tells consumers exactly what **parser tolerance is required**. Note the asymmetry, though: **`cargo metadata` is versioned; the `--message-format=json` stream is not.** There is no `--format-version` for the message stream; stability there is pinned only by MSRV notes.

Cargo also ships an honest caveat any streaming-JSON CLI should copy: _"`--message-format=json` only controls Cargo and Rustc's output. This cannot control the output of other tools... A possible workaround in these situations is to only interpret a line as JSON if it starts with `{`."_

**Exit codes:** the documented table is exactly two rows (0 success, 101 failure) and is **incomplete**. Measured: compile error, test failure, unknown subcommand, and `-Z` on stable all → 101; **unknown flag → 1** (clap rejects it before cargo runs); `cargo run` **passes the child's exit code through verbatim** (child `exit(42)` → 42). Because 101 is also Rust's panic code, `cargo run` exit 101 is ambiguous between "cargo failed" and "your program panicked."

Unknown command output is unusually helpful — three escalating remediations, and **no auto-run mode exists at all**:

```
$ cargo buld
error: no such command: `buld`
help: a command with a similar name exists: `build`
help: view all installed commands with `cargo --list`
help: find a package to install `buld` with `cargo search cargo-buld`
```

**`cargo --list` keeps tombstones**: removed commands remain listed as `git-checkout   REMOVED: This command has been removed`, rather than degrading to "no such command." A small but excellent affordance for any caller (or model) working from stale knowledge.

**The external subcommand protocol** is a clean, documented plugin ABI: `cargo foo` invokes `cargo-foo` from `PATH` (prioritizing `$CARGO_HOME/bin`), passing the subcommand name as the **second** argument, and `cargo help foo` becomes `cargo-foo foo --help`. The stated reason plugins shell out rather than link is directly on point for this project:

> Cargo as a library is unstable: the API may change without deprecation… **Instead, it is encouraged to use the CLI interface to drive Cargo.**

That is an explicit endorsement of **the CLI as the stable integration surface** — the premise of this entire research effort, stated by a major toolchain.

**Unstable features are gated three different ways by kind** ([unstable.md](https://doc.rust-lang.org/cargo/reference/unstable.html)): new `Cargo.toml` syntax needs a `cargo-features` key; new CLI flags/subcommands need `-Z unstable-options`; everything else is its own `-Z` flag. All nightly-only, enforced hard (exit 101 on stable). `-Zallow-features=` restricts which unstable features a build may use — a CI policy lever.

**Destructive ops: cargo never prompts**; `--dry-run` is the substitute, and **its coverage is uneven** — present on `publish`, `install`, `add`, `remove`, `update`, `clean`; absent on `yank`, `fix`, `package`, `owner`. `cargo yank` is the notable gap: irreversible registry mutation, no dry-run, no prompt.

`cargo publish`'s dirty-tree refusal is a model error message — it **enumerates the offending files and names the exact escape hatch**: _"to proceed despite this and include the uncommitted changes, pass the `--allow-dirty` flag."_

### 2.8 `terraform` — the formal machine-output contract

Terraform publishes an explicit [machine-readable UI spec](https://developer.hashicorp.com/terraform/internals/machine-readable-ui) and [JSON format spec](https://developer.hashicorp.com/terraform/internals/json-format), both governed by a `format_version` field with a stated bidirectional contract:

> We will increment the **minor** version, e.g. `"1.1"`, for backward-compatible changes or additions. **Ignore any object properties with unrecognized names to remain forward-compatible with future minor versions.**
>
> We will increment the **major** version, e.g. `"2.0"`, for changes that are not backward-compatible. **Reject any input which reports an unsupported major version.**

This is the cleanest formulation found: it specifies obligations on the **consumer**, not just promises from the producer. Producer-declares + consumer-tolerates-minor + consumer-rejects-major.

`-json` emits **one JSON object per line** with a common envelope: `@level` (info/error/warn), `@message` (human summary), `@module`, `@timestamp` (RFC3339), and `type` (discriminator for the rest of the keys). Note that the human summary is a _field_, mirroring cargo's `rendered`.

**`terraform plan -json` "implies `-input=false`."** Selecting machine output automatically disables interactive prompting. This is exactly the coupling an agent-first spec wants, shipped in production.

**`-detailed-exitcode`** repurposes the exit code as a tri-state result: **0 = succeeded, no changes; 1 = error; 2 = succeeded, changes present.** Like `git diff --exit-code`, this treats the exit code as a query answer.

### 2.9 Salesforce `sf` — the only shipped conformance kit

Not on the original list, but it is the closest existing thing to what this project is building.

**A stable JSON envelope**: `{"status": 0, "result": {...}, "warnings": []}`. `SF_CONTENT_TYPE=JSON` forces JSON globally without per-command flags.

**JSON output is covered by the deprecation policy.** Salesforce publishes what it may change:

> Salesforce reserves the right to make non-breaking changes to the JSON response of a Salesforce CLI command at any time.

Non-breaking = adding properties, changing human-readable values. Breaking (removing properties, changing types) requires a **minimum 4-month** deprecation window, and — importantly — _"If you specify JSON output, the warning is presented as a property."_ **Deprecation warnings are delivered in-band, in the machine payload.**

The stance is explicit: _"JSON output is enforced on all commands, and the JSON output is protected so that human readable output can be improved without fear of breaking scripts... Relying on human readable output is not supported."_ This is git's plumbing/porcelain split restated as policy.

**The conformance artifact.** Every bundled plugin commits a `command-snapshot.json` — a machine-readable snapshot of its own command surface, diffed in CI:

```json
[
  { "alias": [], "command": "org:auth:show-access-token",
    "flagAliases": [], "flagChars": ["o","p"],
    "flags": ["flags-dir","json","no-prompt","target-org"],
    "plugin": "@salesforce/plugin-org" },
  { "alias": ["env:create:sandbox"], "command": "org:create:sandbox",
    "flagAliases": ["c","clone"], "flagChars": ["a","f","i","l","n","o","s","w"],
    "flags": ["alias","async","definition-file","flags-dir","json", ...],
    "plugin": "@salesforce/plugin-org" }
]
```

Paired with `sf cli artifacts compare --previous <ver> --current <ver>`, which mechanically detects breaking changes between releases. Bundled plugins are **required to generate JSON schemas for all commands**. This is a real, shipped, working conformance kit for CLI surface stability — the single most directly relevant artifact found.

### 2.10 `deno` — the permission broker, and the cost of a default subcommand

**The permission broker is the most directly applicable piece of agent prior art in the entire survey.** Deno's permission model normally prompts interactively; `DENO_PERMISSION_BROKER_PATH` replaces that prompt with a **versioned IPC protocol** over a Unix socket or Windows named pipe:

> All `--allow-*` and `--deny-*` flags are ignored. **Interactive permission prompts are not shown (equivalent to non-interactive mode).** Every permission check is sent to the broker; the broker must reply with a decision for each request.
>
> If anything goes wrong during brokering (…Deno cannot connect to the socket/pipe, messages are malformed, arrive out of order, IDs do not match, or the connection closes unexpectedly), **Deno immediately terminates the process to preserve integrity and prevent permission escalation.**
>
> The request/response message shapes are **versioned and defined by JSON Schemas**: `permission-broker-request.v1.json` / `permission-broker-response.v1.json`

Each request carries a schema version, `pid`, a monotonic `id`, an RFC-3339 timestamp, the permission `name` and optional `value`; the response echoes the `id` and returns `allow`/`deny` with an optional human-readable reason.

> This is exactly the shape an agent-first CLI wants: **the interactive prompt is externalized into a versioned, schema-defined protocol, and every failure mode is fail-closed.** It solves the problem that §3.2 says prompts and `--force` cannot — the decision is delegated to a supervising process rather than attested by the caller. Nothing else in the survey does this.

Non-interactive permission denial **fails closed immediately** (exit 1, no hang), and the error is a **catchable typed error** (`Deno.errors.NotCapable`), not just a message — structured error handling inside the runtime, even though the CLI surface has none.

**The default-subcommand anti-pattern.** Deno is the one tool that **does not suggest at all** for unknown commands — because `deno <file>` is shorthand for `deno run <file>`, an unrecognized first argument falls through to being treated as a _file path_:

```
$ deno rn
error: Module not found "file:///private/tmp/rn".     # exit 1
```

A typo produces a _category error_ ("no such file") rather than "no such command." Flags, by contrast, **do** get suggestions (`--allow-bogus` → _"tip: a similar argument exists: '--allow-run'"_), which proves the machinery exists and the command position simply forfeits it.

> **This is the clearest single design prohibition the survey supports:** a convenience shorthand in the command position destroys typo recovery for _every_ command.

**Exit codes: everything non-zero is 1** (except `Deno.exit(n)` passthrough). Permission denied, type error, lint failure, unknown flag, and unknown "command" are indistinguishable by exit code — the caller must parse stderr.

**Output contracts are half-built.** `--json` exists on `info`, `lint`, `doc`, `bench` but **not** on `test`, `check`, `fmt`, `coverage`, `outdated`, `publish`. All three JSON outputs carry a top-level `"version": 1` — **but there is no `--format-version` input flag and no documented stability guarantee anywhere.** Deno _emits_ a version it will not let you _request_: detection without protection, the exact inverse of cargo.

**Granular unstable flags.** The monolithic `--unstable` was deprecated (1.40) then removed (2.0) in favor of **32 granular `--unstable-*` flags**, with the rationale stated plainly: _"The `--unstable` flag, while useful, has been somewhat **imprecise, activating all unstable features simultaneously.**"_ The removed flag still parses and warns rather than erroring — a good tombstone.

One inconsistency worth noting: **the CLI is strict, the config file is lenient.** `--unstable-bogus` is a hard error, but `"unstable": ["bogus-feature"]` in `deno.json` only warns and runs anyway. Defensible (config outlives the binary that reads it) but it means a typo'd config silently under-enables features.

### 2.11 `npm` and `oclif` — shorter notes

**npm.** Exit codes are non-standard — an unrelated failure produced **254** locally. `npm` is the cautionary example of a huge CLI with no coherent exit taxonomy.

**oclif** (framework behind Salesforce CLI, Heroku CLI, and others) is the best framework-level prior art:

- `enableJsonFlag` adds `--json` and **automatically suppresses log output** when active.
- `jsonEnabled()` lets command code branch.
- `toSuccessJson(result)` / `toErrorJson(result)` shape both envelopes — errors are **first-class in the JSON contract**, unlike gh/docker/kubectl.
- `CLIError` carries `message`, **`code`** (stable identifier), **`suggestions`** (array of next actions), **`ref`** (URL to docs), and `exit`.
- `oclif manifest` generates `oclif.manifest.json`, a machine-readable description of the command tree shipped as a build artifact.

That error shape — `code` + `suggestions` + `ref` — is the closest framework-level match to what an agent needs, and it predates the agent era.

---

## 3. Points of Genuine Disagreement

These are the places where a spec must take a side, because the best tools in the industry actively contradict each other.

### 3.1 Verb-noun vs noun-verb — unresolved, and the resolution is scale

| Position                           | Tools                                   |
| ---------------------------------- | --------------------------------------- |
| **noun-verb** (`gh pr create`)     | gh, stripe, docker (management), vercel |
| **verb-noun** (`kubectl get pods`) | kubectl, git, cargo, terraform          |
| **both, permanently**              | docker                                  |
| **service-noun then verb-noun op** | aws (`aws ec2 describe-instances`)      |

The disagreement is not aesthetic. **Noun-verb scales; verb-noun reads better at small N.** git and cargo are verb-first and flat because their verb set is small and famous. kubectl gets away with verb-noun _only because_ the noun set is server-discoverable (`api-resources`) — the verb set is tiny and closed (`get`, `describe`, `delete`, `apply`) while nouns are open and enumerable. gh, stripe, and vercel are noun-verb because the noun set is large and the verb set repeats per noun.

Docker is the tell: it _migrated toward_ noun-verb as it grew, and could not remove the verb-first forms. **AWS is a hybrid that satisfies nobody** — noun-first at the service level, verb-first at the operation level (`aws ec2 describe-instances`), because the operation names are mechanically derived from API method names rather than designed.

**For agents specifically, the argument tilts to noun-verb**: it makes the command tree a clean two-level taxonomy where enumerating "what can I do to X" is a single lookup.

### 3.2 Destructive operations — four mutually incompatible philosophies

| Philosophy                                   | Tool                                | Mechanism                                                  |
| -------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| **Never prompt; the caller owns safety**     | aws, kubectl, git                   | `--dryrun`/`--dry-run`; no `--force` on `aws s3 rm` at all |
| **Always prompt; bypass with a flag**        | stripe, docker (`prune`), terraform | `-c/--confirm`, `-f/--force`, `-auto-approve`              |
| **Prompt, but void the bypass on ambiguity** | gh                                  | `--yes` **ignored** when the target is implicit            |
| **Make the default target harmless**         | stripe                              | test mode is default; `--live` is opt-in                   |

These are irreconcilable. AWS's position is that a prompt is a bug in a scriptable tool; Stripe's position is that a prompt is the last line of defense. **kubectl inverts the default entirely** — confirmation is opt-in via `-i/--interactive`.

> **The most valuable observation:** Stripe's default-safe model and git's `--force-with-lease` are _the only two_ mechanisms in the survey that remain effective against an agent. Prompts don't work (agents bypass them, or the harness auto-answers). `--force` flags don't work (an agent will add the flag when the first attempt fails — this is an observed failure mode). What works is **making the dangerous thing require a different, explicit target** (`--live`) or **making the operation fail on stale state** (`--force-with-lease`). Confirmation is _attestation_; lease-checking is _verification_. Only verification survives an adversarial or careless caller.

### 3.3 Exit codes — a 4x spread with no convergence

AWS defines **8 codes** with a semantic split (my syntax / my environment / their service). gh defines **5** (one undocumented). Docker defines a **CLI-vs-workload** split (125/126/127 + passthrough). Cargo uses **101**. Stripe uses **1, always**. kubectl and npm have effectively nothing.

There is no shared convention beyond "0 is success." Even the _shape_ of the taxonomy differs: AWS splits by **fault attribution**, docker splits by **layer**, terraform and git use exit codes as **query results** (`-detailed-exitcode`, `--exit-code`).

Worse, **the reserved ranges collide**. cargo's 101 is meaningful; AWS's 252–255 approach the shell's reserved 126–128/130+ band; docker's 125–127 overlap the shell's "command not found"/"not executable" range. A spec that picks numbers must pick them consciously.

### 3.4 Does `--json` cover errors? Almost universally **no** — and this is the biggest gap

Empirically confirmed:

```
$ gh pr list --repo cli/nonexistent-xyz --json number
GraphQL: Could not resolve to a Repository with the name 'cli/nonexistent-xyz'. (repository)
                                                         # prose on stderr, exit 1

$ docker inspect nonexistent-xyz --format json
[]                                                       # stdout: empty JSON!
error: no such object: nonexistent-xyz                   # stderr prose, exit 1
```

**`--json` in gh, docker, and kubectl means "format my _success_ payload as JSON."** Failure falls back to prose on stderr. The mode flag does not cover the error path.

Only **four** surveyed tools structure errors:

- **cargo** — `compiler-message` objects with `code`, `spans`, `rendered`
- **terraform** — `@level: "error"` messages in the same NDJSON stream
- **Salesforce `sf`** / **oclif** — `toErrorJson`, `CLIError{code, suggestions, ref}`
- **vercel** — in agent mode only (§4)

> This is the clearest place for a spec to take a position, because the industry majority is simply _wrong_ here rather than merely different. An agent that must regex stderr to distinguish "not found" from "not authorized" from "rate limited" cannot behave correctly. And docker's `[]`-on-stdout-plus-error is worse than useless: it is a **silent-corruption hazard** for any consumer that trusts stdout.

### 3.5 Output versioning — producer-declares vs consumer-pins

Two coherent, incompatible models:

| Model                 | Tool                                       | Mechanism                                                                                   |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Producer declares** | terraform                                  | Payload carries `format_version`; consumer tolerates minor bumps, rejects unknown majors    |
| **Consumer pins**     | cargo                                      | Consumer passes `--format-version=1`; producer echoes `"version": 1`; **warns if unpinned** |
| **Neither**           | gh, docker, kubectl(CLI-level), stripe CLI | No version field at all                                                                     |

Cargo's model is stronger for agents: an unpinned consumer is _warned at runtime_, and a pinned consumer is immune to producer upgrades. Terraform's is stronger for streaming and for producers who need to evolve fast. The two can be combined (accept a `--format-version` request _and_ echo it in the envelope), and nothing in the survey forbids doing both.

### 3.6 Unknown input — suggest, hard-fail, auto-run, or silently reinterpret

| Behavior                                | Tool                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| Suggest, don't run                      | gh, kubectl, cargo, aws, stripe, git (default)        |
| **No suggestion at all — deliberately** | docker                                                |
| **Auto-run the guess**                  | git with `help.autoCorrect=immediate` / N deciseconds |
| **Silently reinterpret as a file path** | **deno**                                              |

The docker/kubectl split is the sharpest, because **both are Cobra apps with the same suggester available**. kubectl keeps it (`gett` → suggests both `set` and `get`, optimizing recall over precision); Docker suppresses it, and [docker/cli#5234](https://github.com/docker/cli/pull/5234) makes the reasoning explicit — on error, **print less, not more**. This is a real philosophical disagreement about whether error output should be helpful or deterministic. For agents, determinism plus a _structured_ suggestion field beats prose helpfulness — which neither tool does.

Also inconsistent: how many suggestions. AWS shows **all** matches above a tight `difflib` cutoff of **0.8**; stripe shows only the **first**; cargo shows one plus two escalating remediations.

git's auto-run and deno's silent reinterpretation are the two behaviors an agent-first spec should explicitly prohibit — both convert a typo into an unintended action.

### 3.7 What does "stable" _exclude_? — frozen vs additive-compatible

A subtler disagreement than §3.5, and arguably more important, because it determines what a **conformance test can assert**.

| Model                                          | Tool                                  | Promise                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frozen**                                     | git                                   | Porcelain v1 _"guaranteed not to change in a backwards-incompatible way"_ — achievable because the format is line-oriented and tiny         |
| **Additive-compatible, explicitly enumerated** | cargo                                 | Adding fields, adding enum values, and changing opaque representations are **declared not incompatible**; consumers must tolerate all three |
| **Additive-compatible, version-signalled**     | terraform                             | Minor bump = additions; consumers **must** ignore unknown properties                                                                        |
| **Additive-compatible, policy-backed**         | Salesforce                            | _"reserves the right to make non-breaking changes ... at any time"_; removals/type changes get 4 months                                     |
| **Unstated**                                   | gh, docker, kubectl (CLI layer), deno | —                                                                                                                                           |

Cargo's version is the most useful because it **enumerates the exclusions**. A spec that says only "the schema is stable" is untestable; a spec that says "new fields and new enum members MAY appear and consumers MUST tolerate them" tells both sides exactly what to build. Note that **git's frozen promise is only affordable because the payload is trivial** — no JSON-emitting tool in the survey attempts it.

### 3.8 Should the CLI own its own vocabulary?

kubectl's aliases and resource catalog are **server-supplied data** (`shortNames` in the discovery API), so a CRD installed today gets working `kubectl` aliases with no CLI release. AWS and Stripe generate their command surface from API models/OpenAPI at _build_ time. gh, docker, git, and cargo hardcode theirs.

The trade is stark: **runtime-derived surfaces are always current but require a live server to introspect** (and kubectl's `api-resources` _panics_ when the cluster is unreachable, breaking completion). **Build-time-generated surfaces work offline but lag the API** — which is exactly why Stripe keeps a raw passthrough and AWS, lacking one, cannot reach un-modeled operations.

A spec must decide whether introspection is answerable offline. For agents, offline-answerable is strongly preferable: an agent planning a call should not need a network round-trip to learn what flags exist.

### 3.9 TTY adaptation — a feature for humans, a hazard for agents

gh, git, docker, and aws all change behavior based on `isatty()`. gh changes it _dramatically_ (§2.1): truncation, color, relative timestamps, headers.

The disagreements:

- **aws v2 pages output through `less` by default** — actively hostile to automation.
- **gh's non-TTY mode is the good one** (untruncated, tab-delimited, absolute timestamps) — but agent harnesses that allocate a PTY get the _bad_ one.
- **Vercel inverts the trigger entirely**: it detects the _agent_, not the TTY (§4).

And the escape hatches point in opposite directions: `GH_FORCE_TTY` forces human mode _on_; `AWS_PAGER=`/`--no-cli-pager` forces it _off_. There is no standard way to say "I am a machine" — which is precisely the gap `AI_AGENT`/`AGENT` is trying to fill.

---

## 4. Agent-Specific Affordances

Categorized by kind, because the distinction matters enormously:
**(a)** MCP server wrapping a remote API · **(b)** MCP server inside the CLI binary · **(c)** CLI flags/commands/output for agents · **(d)** instruction/doc files for agents.

### 4.1 The single best prior art: Vercel's agent mode

Vercel is the only surveyed vendor that has made **agent-awareness a first-class, documented CLI behavior**.

**(c) Documented agent auto-detection.** From [vercel.com/docs/cli/global-options](https://vercel.com/docs/cli/global-options):

> The `--non-interactive` option runs a Vercel CLI command without interactive prompts. Use it for CI/CD pipelines, scripts, and agent environments. **When the CLI detects that it is running under an agent, non-interactive mode is the default.**

Detection is via the bundled [`@vercel/detect-agent`](https://www.npmjs.com/package/@vercel/detect-agent) package, which checks agent-specific environment variables:

```js
if (process.env.CLAUDECODE || process.env.CLAUDE_CODE) {
  return { isAgent: true, agent: { name: "claude" } };
}
```

Detected agents include Claude, Cursor, Devin, Replit, Gemini, Codex, Augment, and OpenCode. The package also promotes a proposed universal `AI_AGENT` env var.

**(c) A real structured error envelope — the best single artifact found.** In agent mode the CLI enters "structured JSON output mode." From [vercel/vercel#15068](https://github.com/vercel/vercel/issues/15068):

```json
{
  "status": "action_required",
  "reason": "missing_scope",
  "message": "Provide --scope or --team explicitly. No default is applied in non-interactive mode.",
  "choices": [{ "id": "team_...", "name": "<team-slug>" }],
  "next": [
    {
      "command": "vercel link --scope <team-slug>",
      "when": "Link first (then run any command without --scope)"
    }
  ]
}
```

Five properties, all of which an agent-first spec should want:

1. **`status`** is a machine state, and it has a **third value beyond success/failure**: `action_required`.
2. **`reason`** is a stable machine-readable error code (`missing_scope`), distinct from the prose.
3. **`message`** is human prose, carried _inside_ the machine payload.
4. **`choices`** enumerates the valid options — the agent can _resolve the error itself_ without a second discovery call.
5. **`next`** gives executable remediation commands, each with a `when` clause explaining applicability.

Note also _"No default is applied in non-interactive mode"_ — the same principle as `gh repo delete` voiding `--yes` on an implicit target. **Agent mode refuses to infer.**

**(c) A cautionary tale in the same issue.** The bug is that `--scope` is _silently ignored_ even when explicitly provided, so the command is unsatisfiable. And the workaround is devastating for the whole approach:

```bash
script -q /dev/null vercel link --yes   # fake a PTY to bypass agent detection
```

> **Implicit, environment-based mode switching is fragile.** It creates a second, less-tested code path that only agents hit, and it can be defeated (or accidentally triggered) by the execution environment. An explicit opt-in flag is testable by everyone; an implicit mode is tested by nobody.

**(c/d) Other Vercel affordances:** `vercel agent init` writes an `AGENTS.md` section delimited by `<!-- VERCEL BEST PRACTICES START/END -->` markers so re-running is **idempotent and non-destructive** (and targets `CLAUDE.md` instead when run from Claude Code); `vercel skills` discovers agent skills by detecting the framework and scanning `package.json`; `vercel api` is a raw authenticated API passthrough; `--json`/`--format json` is broadly available.

**(d) Vercel's docs are themselves agent-first**: served as Markdown with YAML frontmatter, `.md` URL suffixes, `Accept: text/markdown` content negotiation, an `llms.txt` index, a `sitemap.md`, and per-page `.graph.md` cross-link maps introduced by a literal `> **For AI agents:**` block. Their [KB guide](https://vercel.com/kb/guide/make-your-documentation-readable-by-ai-agents) documents a three-layer detection strategy: user-agent matching, RFC 9421 `Signature-Agent` header validation, and a heuristic fallback (missing `sec-fetch-mode`, which real browsers always send).

### 4.2 GitHub — agent commands _inside_ `gh`

**(c) `gh agent-task`** — shipped in **GitHub CLI 2.80.0**, announced [2025-09-25](https://github.blog/changelog/2025-09-25-kick-off-and-track-copilot-coding-agent-sessions-from-the-github-cli/). Subcommands `create`, `list`, `view`; aliases `agent-tasks`/`agent`/`agents`. Public preview. Its help contains a directly agent-relevant caveat: _"Identifying tasks by pull request is not recommended for non-interactive use cases as there may be multiple tasks for a given pull request that require disambiguation."_

**(c) `gh skill`** (preview, confirmed in 2.96.0) — a **package manager for agent skills** backed by GitHub repos: `install`, `list`, `preview`, `publish`, `search`, `update`, with project-vs-user scope and multi-agent targets.

**(d) `cli/cli` ships an official Agent Skill for `gh` itself** — [`skills/gh/SKILL.md`](https://github.com/cli/cli/blob/trunk/skills/gh/SKILL.md). This is the most interesting document in the survey because it is effectively a **list of gh's own agent-hostile behaviors**:

- **Silent truncation**: "List commands cap results... The default is usually 30." Nothing in the output says so.
- **No totals**: "`gh issue list` / `gh pr list` do not expose aggregate totals like `totalCount` via `--json`."
- **A flag collision**: "`--template`/`-T` collides with a body-template flag on a few commands (e.g. `gh pr create -T`); always check `--help` before assuming which one you're hitting."
- **Inconsistent quoting between two search surfaces**: `gh search issues repo:x is:open` needs bare tokens, while `gh issue list --search "..."` needs one quoted string. The wrong form fails with `Invalid search query`.
- **Non-obvious identity modelling**: "Bots author as GitHub Apps, so `--author dependabot` matches nothing. Use `--app dependabot`."

It also states the interactivity contract positively: _"`gh` already does the right thing in non-TTY contexts: it skips the pager, strips ANSI color, and errors out fast with a helpful message instead of prompting. You don't need to defensively set `GH_PAGER`."_

> **The meta-finding:** the world's most carefully designed CLI still needed a prose skill file to be usable by agents, and every item in that file is a _design defect_ that documentation is papering over. Silent truncation, flag collisions, and inconsistent quoting are exactly the classes of thing a conformance kit can mechanically forbid.

**(a) `github/github-mcp-server`** is a separate binary/hosted server wrapping the GitHub API, not `gh` itself. `.github/mcp.json` in cli/cli registers `gh aw mcp-server` as a local MCP server — an example of **(b)**.

### 4.3 Docker — MCP inside the CLI

**(b) `docker mcp`** — the MCP Toolkit, present as a Docker CLI plugin (confirmed locally): `catalog`, `client`, `config`, `feature`, `gateway`, `policy`, `secret`, `server`, `tools`. `docker mcp gateway` runs a gateway that multiplexes many containerized MCP servers behind one endpoint; the [MCP Catalog](https://docs.docker.com/ai/mcp-catalog-and-toolkit/) curates 300+ servers as container images, with Profiles and Clients (Claude Code, Cursor, Zed) as first-class concepts. Docker's angle is **distribution and sandboxing of MCP servers**, not making `docker` itself agent-legible.

**(c) `docker ai`** — "Docker AI Agent - Ask Gordon", a conversational agent in the CLI (`docker ai "How do I run redis?"`).

### 4.4 Stripe — the most built-out agent surface

**(a) Remote MCP at `https://mcp.stripe.com`** ([docs](https://docs.stripe.com/mcp)), OAuth-authenticated, with a **`search → details → read/write`** tool triad (`stripe_api_search`, `stripe_api_details`, `stripe_api_read`, `stripe_api_write`). Stripe's stated rationale is a **context-budget** argument: this shape makes much of the API reachable _"without increasing the context window unnecessarily."_ There is **no `stripe mcp` subcommand** — the server is remote-hosted, not CLI-launched.

**(c) `stripe sandbox create`** — provisions a working sandbox **without a Stripe account**, explicitly _"so that you, a coding agent, or an automated workflow can start building immediately."_ Plus `--non-interactive` on `sandbox`/`docs`, framed as _"Useful for scripting and agent-assisted workflows."_

**(c) `stripe tools search|details --json|execute --body '<json>'`** — a search/schema/execute triad exposed _as CLI commands_, structurally identical to MCP tool discovery. `tools details --json` emits a full JSON parameter schema (name, type, description, required, split into path/query/body).

**(d) `stripe projects llm-context`** generates an `AGENTS.md`; `stripe projects init` writes one automatically. **(d)** [docs.stripe.com/llms.txt](https://docs.stripe.com/llms.txt) opens with an instruction aimed at the model itself: _"When installing Stripe packages, always check the npm registry for the latest version rather than relying on memorized version numbers... Never hardcode an old version number from training data."_ **(d)** Official Agent Skills (`stripe-docs`, `stripe-best-practices`, `upgrade-stripe`) with a machine index at `https://docs.stripe.com/.well-known/skills/index.json`.

### 4.5 AWS, Terraform, Fly, Netlify, Supabase

**(a) AWS API MCP Server** (`awslabs.aws-api-mcp-server`) — architecturally notable because **it wraps the AWS CLI itself**. `call_aws` "executes AWS CLI commands with validation"; `suggest_aws_commands` maps NL to the 5 most likely CLI invocations. Safety is env-var-gated: `READ_OPERATIONS_ONLY=true`, `REQUIRE_MUTATION_CONSENT=true` (requires an elicitation-capable client), plus working-directory scoping. AWS's answer to "how do agents use AWS" was **to wrap its own CLI in MCP rather than replace it** — a strong signal that a well-formed CLI _is_ the agent interface. AWS's own docs warn the server "can be vulnerable to prompt injection attacks."

_Amazon Q Developer CLI uses its own agent config format (`name`, `mcpServers`, `tools`, `allowedTools`, `hooks`); no evidence AWS has adopted AGENTS.md — treat as unconfirmed/likely false._

**Terraform**: the machine-readable UI spec (§2.8) predates the agent era but is the best-specified machine contract found. **(a)** `hashicorp/terraform-mcp-server` exists.

**(b) Fly.io flyctl** ships MCP _in the binary_: `fly mcp launch` (deploy a stdio MCP server onto a Fly machine and wire up clients) and `flyctl mcp server` ([fly.io/docs/mcp](https://fly.io/docs/mcp/)).

**Netlify** has publicly repositioned around "Agent Experience": `netlify create "<prompt>"` triggers Agent Runners, and **`--allow-anonymous` lets an agent deploy without a Netlify account** — the same "remove the auth prerequisite" move as `stripe sandbox create`. Plus `@netlify/mcp` **(a)** and a `netlify.ai` agent-facing property.

**Supabase**: `--output json` exists but coverage is **partial**, with an open request to extend it ([supabase/cli#4675](https://github.com/supabase/cli/issues/4675)). The MCP server is a separate package **(a)**.

### 4.6 The cross-cutting standards

**`AGENTS.md`** ([agents.md](https://agents.md/)) — deliberately **not a strict format**: _"AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide."_ Reported 60,000+ repos. Originated among OpenAI Codex, Amp, Jules, Cursor, and Factory; now stewarded by the Agentic AI Foundation under the Linux Foundation. Adopted by Stripe and Vercel (both **generate** it from their CLIs); cli/cli has one at repo root.

**`llms.txt`** — verified empirically by HTTP fetch on 2026-08-13:

| URL                                  | Result            |
| ------------------------------------ | ----------------- |
| `docs.stripe.com/llms.txt`           | **200** (~90 KB)  |
| `developers.cloudflare.com/llms.txt` | **200** (~16 KB)  |
| `docs.docker.com/llms.txt`           | **200** (~6 KB)   |
| `vercel.com/docs/llms.txt`           | **200** (~211 KB) |
| `docs.deno.com/llms.txt`             | **200** (~5 KB)   |
| `supabase.com/llms.txt`              | **200** (~2 KB)   |
| `docs.netlify.com/llms.txt`          | **200** (~25 KB)  |
| `fly.io/llms.txt`                    | **200** (~38 KB)  |
| `developer.hashicorp.com/llms.txt`   | **404**           |
| `cli.github.com/llms.txt`            | **404**           |

Adoption among developer-tool vendors is now the norm, not the exception. Notably **absent for the two tools with the best machine-output specs** (HashiCorp, GitHub CLI) — good machine contracts and good agent docs are apparently uncorrelated.

**Agent-runtime detection env vars.** There is **no standard**, and this is an active, unresolved dispute ([agentsmd/agents.md#136](https://github.com/agentsmd/agents.md/issues/136)):

| Agent             | Variable            |
| ----------------- | ------------------- |
| Claude Code       | `CLAUDECODE=1`      |
| Cursor            | `CURSOR_AGENT=1`    |
| Gemini CLI        | `GEMINI_CLI=1`      |
| Cline             | `CLINE_ACTIVE=true` |
| Augment           | `AUGMENT_AGENT=1`   |
| TRAE AI           | `TRAE_AI_SHELL_ID`  |
| Goose, Amp        | `AGENT`             |
| Vercel's proposal | `AI_AGENT`          |

The proposal is to standardize `AGENT` (mirroring `CI=true`), with the stated rationale being _exactly_ our problem space: "provide structured error output (JSON with suggestions) instead of prose," adjust verbosity, and handle non-interactivity. **VS Code/Copilot explicitly oppose env vars**, preferring terminal profile settings. No consensus exists.

**Machine-readable command manifests** that actually ship: `oclif.manifest.json` (oclif), `command-snapshot.json` (Salesforce), botocore `service-2.json` models + the SQLite `ac.index` (AWS), Stripe's OpenAPI spec under `api/openapi-spec`. `gh help reference` (Markdown) and `git --list-cmds=` (plain text) are the closest gh/git equivalents — neither is structured.

---

## 5. Concrete Implications for Our Spec

Ordered by how much they should change what we write.

### 5.1 Mandate a structured error envelope — this is the industry's biggest gap

The majority position (`--json` covers success only) is **wrong**, not merely different (§3.4). Docker's `[]`-plus-error is a silent-corruption hazard. Take the side of cargo, terraform, oclif, Salesforce, and Vercel.

Synthesize the envelope from Vercel's shipped `action_required` shape (§4.1) plus oclif's `CLIError` fields:

```jsonc
{
  "status": "error",          // success | error | action_required  ← three states, not two
  "reason": "missing_scope",  // stable machine code, never localized, never reworded
  "message": "…",             // human prose, carried INSIDE the machine payload (cf. cargo "rendered")
  "choices": [ … ],           // enumerated valid options, so the agent can self-resolve
  "next":    [ { "command": "…", "when": "…" } ],  // executable remediation
  "ref":     "https://…"      // docs URL (oclif)
}
```

Three specific requirements fall out:

- **`action_required` as a first-class third status.** Success/failure is insufficient; "I need one more input from you and here are the valid values" is the single most common agent-blocking state.
- **The human string is a field, not an alternative rendering.** cargo's `rendered` and terraform's `@message` both do this. It removes the need to choose an audience.
- **`reason` codes are part of the compatibility contract** and must be enumerable (see §5.5).

### 5.2 Version the output contract explicitly — and do both directions

Neither gh, docker, nor kubectl's CLI layer has a version field at all. Adopt **both** halves of §3.5:

- Accept a **consumer-pinned** `--format-version=N` (cargo), and **warn when unpinned** — cargo's runtime nag is a genuinely good idea that costs nothing. Deno's `"version": 1`-with-no-way-to-request-it is the failure mode to avoid: detection without protection.
- **Echo the version in the envelope** and adopt Terraform's consumer obligations verbatim in spirit: _minor bump → consumers MUST ignore unknown properties; major bump → consumers MUST reject unsupported versions._

State obligations on the **consumer**, not just promises from the producer (Terraform's key contribution) — and **enumerate what "stable" excludes** (cargo's, §3.7). Concretely, the spec should declare that new fields, new enum members, and changes to explicitly-opaque representations are **not** breaking, and that consumers MUST tolerate all three. Without that clause the guarantee is untestable and every field addition becomes a debate.

Two further requirements follow from failures observed above:

- **Machine output MUST NOT vary by invocation spelling.** Docker's `--format json` ≠ `{{json .}}` (different _values_) and its template-vs-JSON key namespaces (`APIVersion` vs `ApiVersion`) are the cautionary case. One logical output, one set of names.
- **A given command's machine output MUST have one shape.** Docker emits NDJSON for lists and a bare object for scalars under the same flag, forcing per-command parsing rules.

### 5.3 Define exit codes by fault attribution, and stay out of reserved ranges

Follow AWS's _semantics_ (my syntax / my environment / their service) but not its _numbers_ — 252–255 crowd the shell's signal band, and cargo's 101, docker's 125–127, and the shell's 126/127/128+N all collide differently.

Recommended shape, adapted from AWS + gh:

- `0` success — **including empty results** (gh's `NoResultsError → 0` is correct; emptiness is not failure)
- `1` generic/unclassified failure
- `2` usage error (unknown command, unknown flag, bad argument)
- `3` authentication/authorization required (gh's 4, renumbered contiguously)
- `4` precondition/state error (the thing isn't in a state where this works)
- `5` remote/service error (their fault, not yours) — AWS's 254, the most valuable single distinction
- `6` `action_required` (pairs with §5.1's third status)

Two further borrowings:

- **Reserve a namespace for "the tool itself failed" vs "the thing you asked me to run failed."** Docker's 125/126/127-plus-passthrough is the only survey example, and it is exactly the ambiguity that bites `cargo run` (exit 101 means either "cargo failed" or "your program panicked"). Any command that _executes user-supplied work_ needs this split.
- **Reserve a documented `-detailed-exitcode`-style opt-in** for commands where the exit code is a **query result** (terraform's 0/1/2, `git diff --exit-code`, `git merge-base --is-ancestor`, `kubectl auth can-i -q`). Require it to be opt-in so the default stays "0 means it worked."

And a warning drawn from cargo and AWS alike: **document what you actually do.** Cargo publishes a two-row table while unknown-flag returns 1; AWS publishes 252 for unknown arguments while a second code path returns 2; gh documents four codes and implements five. An exit-code table that the implementation contradicts is worse than none, because callers branch on it. This is the first thing the conformance kit (§5.5) should assert.

### 5.4 Take a hard line on destructive operations: verification, not attestation

§3.2's key insight is that **prompts and `--force` flags do not survive an agent**. An agent that hits "pass --force to continue" will pass `--force`. Require, in priority order:

1. **Default-safe targets** where the domain allows it (Stripe's `--live` opt-in is the strongest safety property in the survey).
2. **Lease/precondition flags** — `--if-match <token>` in the spirit of `git push --force-with-lease`. The caller states the version it believes it is overwriting; the operation _fails on stale state_. **Require the expected value explicitly**, per git's own warning that the inferred-from-local-cache forms are "still experimental" and "trivially defeated" by concurrent actors (§2.6). This is the one place where copying the prior art's _default_ would be a mistake. Note kubectl documents the opposite gap: _"the delete command does NOT do resource version checks."_
3. **A delegation protocol for decisions the CLI cannot make.** Deno's permission broker (§2.10) is the model: a versioned, JSON-Schema-defined request/response over a socket, with monotonic IDs and **immediate process termination on any protocol anomaly**. It is the only mechanism in the survey that gives an agent's _supervisor_ a decision point without a TTY. If the spec wants human-in-the-loop on destructive ops without prompts, this is the shape.
4. **`--yes` is void when the target is implicit** — adopt gh's `repo delete` rule generally. Vercel's agent mode reaches the same conclusion independently: _"No default is applied in non-interactive mode."_
5. **Non-interactive must fail loudly, never assume.** gh's `--yes required when not running interactively` is the correct behavior; silently proceeding or silently defaulting are both wrong.
6. **Interlock dangerous combinations rather than warning about them** — kubectl's `--grace-period` _"can only be set to 0 when `--force` is true"_ is enforcement, not documentation.
7. **Enumerate the blast radius when the target set is computed.** Docker prompts only for `prune` (computed targets), not `rm` (named targets) — a defensible line — and the prompt lists each category, expanding under `--all --volumes`. In machine mode this becomes a structured `affected` array in the `action_required` payload: the agent's equivalent of reading the prompt.
8. **`--dry-run` as a cross-cutting convention** (cargo, aws, kubectl), applied **uniformly** — cargo's gaps (`yank` has no dry-run and no prompt) are the failure to avoid. Prefer kubectl's `--dry-run=server`: a real validation round-trip beats a local simulation.
9. **Declining is success.** kubectl's `--interactive` and docker's `prune` both exit 0 when the user says no. A refusal is not an error.

### 5.5 Ship a conformance artifact — Salesforce has proven this works

Salesforce's `command-snapshot.json` + `sf cli artifacts compare` (§2.9) is the only shipped, working conformance kit for CLI surface stability found anywhere. Copy it directly and extend it, because our surface is bigger than theirs:

- Snapshot **commands, aliases, flags, flag chars, and flag aliases** (their fields), **plus** exit codes emitted, `reason` codes emitted, and the JSON output schema per command.
- Diff in CI; a removal or type change is a **build failure**, not a review comment.
- Require every command to declare its output schema, as Salesforce requires of bundled plugins.

This is the piece that turns a spec into something enforceable, and it is the strongest argument that the project is tractable — someone already ships it.

### 5.6 Make discovery machine-readable — nobody has fully done this

The best introspection stories are kubectl's (`api-resources` + `explain`, live from server OpenAPI) and gh's (`help reference`, but **Markdown**, and bare `--json`, but **via an error path**). Nobody emits their full command tree, flags, exit codes, and output schemas as **one structured document at runtime**.

That is an obvious, cheap win and a genuine gap in the prior art. Require a single introspection entrypoint (`<tool> describe --json` or equivalent) returning the complete command tree with, per command: flags and types, required-ness, output schema `$ref`, exit codes, `reason` codes, and destructive-ness. oclif's `oclif.manifest.json` proves the build-time half is routine; kubectl proves the runtime half is valuable; nobody has combined them.

Four corollaries from observed failures:

- **Introspection MUST work offline.** kubectl's catalog requires a live server, and `kubectl api-resources` **panics (exit 2) when the cluster is unreachable** — taking shell/agent completion down with it. An agent planning a call should not need a network round-trip to learn what flags exist. Ship the static surface as a build artifact (oclif/Salesforce) and let runtime discovery _augment_ it, never gate it.
- **Field/option discovery must not be an error path.** gh's bare-`--json`-exits-1 works, but it teaches agents to trigger errors deliberately to learn the schema.
- **Introspection must cover the explanatory commands too.** kubectl's `describe` has no `-o` and `explain` has no JSON — the two richest sources of context are human-only. Whatever the tool knows, it should be able to say in JSON.
- **Expose deprecation and extension boundaries as data.** `git --list-cmds=deprecated`, `git --list-cmds=others` (plugins), and cargo's `REMOVED:` tombstones in `--list` all let tooling discover the edges of the CLI instead of hardcoding them. Removed commands should remain _listed as removed_ rather than degrading to "unknown command" — that is a direct hit against models working from stale training data.

**Aliases and vocabulary should be data, not code** (§3.8). kubectl's server-supplied `shortNames` mean a CRD installed today gets working aliases with no CLI release; docker's alias sets are static but _self-documenting_, printing the same `Aliases:` block from either spelling. Both beat an undocumented hardcoded table.

### 5.7 Prefer noun-verb, cap depth at 3, forbid implicit default subcommands

- **Noun-verb** (§3.1) — it scales, and it makes "what can I do to X" a single enumeration. gh's empirical distribution (34/182/13 across depths 1/2/3, zero at 4) is a good target.
- **Cap nesting at 3.** Every well-regarded tool in the survey does, whether or not they say so.
- **Forbid an implicit default subcommand.** deno's `deno rn → "Module not found"` (§2.10) shows how a default subcommand converts an unknown-command error into a misleading _category_ error. This is the clearest single design prohibition the survey supports.
- **Forbid auto-running suggestions** (git's `help.autoCorrect=immediate`). Suggest in the structured `next` field; never execute.

### 5.8 Machine mode should be explicit, and should imply non-interactivity

Two findings pull in opposite directions and the resolution matters:

- **Terraform's `-json` implies `-input=false`** — selecting machine output disables prompting. Correct; adopt it. Machine output and interactive prompting are mutually exclusive by definition.
- **Vercel's implicit agent detection is fragile** (§4.1) — it created an unsatisfiable command, and the workaround is to fake a PTY with `script -q /dev/null`. Do **not** make agent mode implicit-only.

Recommendation: **an explicit flag/env var is normative** (`--format json` / `AGENT_CLI_FORMAT=json`), env-based agent detection is at most an _optional default-setter_, and — critically — **an explicit flag always wins over detection**. Also honor the emerging `AGENT`/`AI_AGENT` convention (§4.6) as an input, while noting no standard exists yet.

Separately: **never let TTY-ness change data**. gh's TTY mode truncates values and relativizes timestamps (§2.1). Adopt git's porcelain wording as a hard rule — machine output must be _"guaranteed not to change in a backwards-incompatible way between versions **or based on user configuration**."_ The config clause is the one most tools miss, and PTY-allocating agent harnesses make the TTY clause urgent.

### 5.9 Keep a raw passthrough

gh (`gh api`), stripe (`stripe get/post/delete`), and vercel (`vercel api`) all ship a raw authenticated API passthrough. AWS does not, and consequently an un-modeled operation is unreachable. A passthrough means **the CLI is never behind the API**, and it gives agents an escape hatch when the ergonomic surface lacks a field. Cheap to build, and it bounds the cost of imperfect command coverage.

### 5.10 Two hazards to forbid by name

Both are empirically confirmed above and both silently corrupt agent behavior:

- **Silent truncation.** gh's own skill file warns that list commands cap at ~30 with nothing in the output saying so. Require that any truncated result declare it in-band (`"truncated": true`, `"total": N`) — this is a correctness issue, not an ergonomics one.
- **Empty-success-plus-error.** `docker inspect <missing> --format json` prints `[]` on stdout _and_ an error on stderr with exit 1. Require that a failed command emit **no** success payload on stdout.

### 5.11 Change the surface by adding, and publish the window in releases _and_ time

Every successful migration in the survey worked the same way, and every one refused to remove:

- **Docker (2017–present):** added noun-verb management commands, kept every legacy verb-first command working for nine years, and gated help-only cleanup behind an env var (`DOCKER_HIDE_LEGACY_COMMANDS`) so strict consumers can opt in **without any deprecation event**. That env-var pattern — _stricter surface available on request, default unchanged forever_ — is worth copying wholesale.
- **kubectl (KEP-3895):** wanted confirmation on `delete`, concluded that changing the default would hang every existing script, and shipped `-i/--interactive` with the explicit commitment _"this flag's default will always be false."_
- **gh:** deprecated `--confirm` → `--yes` by binding **both flags to the same variable** plus `MarkDeprecated`. Nothing breaks; the warning does the teaching.
- **git:** develops breaking changes behind a compile-time `WITH_BREAKING_CHANGES` switch, so they are **testable years before release**.
- **deno:** the removed `--unstable` flag still parses and warns rather than erroring.

For the deprecation window itself, borrow Kubernetes' _shape_ and Salesforce's _delivery_:

- Express the window as **"N months or M releases, whichever is longer"** (k8s Rule #5a: 12 months or 2 releases for GA user-facing elements). A pure release count is gameable by shipping fast; a pure duration is gameable by shipping slowly.
- Adopt **Rule #5c** — nothing may be deprecated in favor of a _less stable_ alternative — and **Rule #6** — deprecated elements MUST emit warnings.
- Deliver the warning **in-band in the machine payload**, as Salesforce does: _"If you specify JSON output, the warning is presented as a property."_ A deprecation notice on stderr is invisible to an agent parsing stdout, which makes the entire policy unenforceable in practice. This is the single most-missed detail in the survey.

Finally, note the one dimension where nobody agrees and the spec should simply decide: kubectl gives **user-facing CLI a longer guarantee (12mo/2 releases) than admin-facing (6mo/1 release)**; Docker gives everything _one stable release_; git gives _multiple years_; AWS gave v1 _eleven years_. Given that agents are far more brittle consumers than humans — they cannot read a migration guide — the argument favors the long end.

---

## Appendix: Source Index

**gh** · [command-line-syntax.md](https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md) · [primer CLI design](https://primer.style/design/native/cli/) · [internal/ghcmd/cmd.go](https://github.com/cli/cli/blob/trunk/internal/ghcmd/cmd.go) · [repo/delete/delete.go](https://github.com/cli/cli/blob/trunk/pkg/cmd/repo/delete/delete.go) · [skills/gh/SKILL.md](https://github.com/cli/cli/blob/trunk/skills/gh/SKILL.md) · [agent-task changelog](https://github.blog/changelog/2025-09-25-kick-off-and-track-copilot-coding-agent-sessions-from-the-github-cli/) · `gh help exit-codes`, `gh help formatting`, `gh help reference`

**kubectl** · [reference](https://kubernetes.io/docs/reference/kubectl/) · [conventions](https://kubernetes.io/docs/reference/kubectl/conventions/) · [API deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/) · [jsonpath](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

**docker** · [CLI reference](https://docs.docker.com/reference/cli/docker/) · [formatting](https://docs.docker.com/engine/cli/formatting/) · [deprecated features](https://docs.docker.com/engine/deprecated/) · [MCP Catalog & Toolkit](https://docs.docker.com/ai/mcp-catalog-and-toolkit/)

**aws** · [return codes](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-returncodes.html) · [output format](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-output-format.html) · [--query](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html) · [skeleton](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-skeleton.html) · [v1→v2 changes](https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration-changes.html) · [v1 lifecycle #9994](https://github.com/aws/aws-cli/issues/9994) · [errorhandler.py](https://github.com/aws/aws-cli/blob/v2/awscli/errorhandler.py) · [argparser.py](https://github.com/aws/aws-cli/blob/v2/awscli/argparser.py) · [awslabs/mcp](https://awslabs.github.io/mcp/servers/aws-api-mcp-server)

**stripe** · [CLI overview](https://docs.stripe.com/stripe-cli/overview) · [API versioning](https://docs.stripe.com/api/versioning) · [pkg/gen](https://github.com/stripe/stripe-cli/tree/master/pkg/gen) · [pkg/cmd/root.go](https://github.com/stripe/stripe-cli/blob/master/pkg/cmd/root.go) · [MCP](https://docs.stripe.com/mcp) · [skills](https://docs.stripe.com/skills) · [llms.txt](https://docs.stripe.com/llms.txt)

**git** · [plumbing & porcelain](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain) · [git-status porcelain format](https://git-scm.com/docs/git-status#_porcelain_format_version_1) · [BreakingChanges.adoc](https://github.com/git/git/blob/master/Documentation/BreakingChanges.adoc) · `git help config` (help.autoCorrect), `git push --help` (--force-with-lease)

**cargo** · [external tools](https://doc.rust-lang.org/cargo/reference/external-tools.html) · [cargo metadata](https://doc.rust-lang.org/cargo/commands/cargo-metadata.html) · [unstable](https://doc.rust-lang.org/cargo/reference/unstable.html)

**terraform** · [machine-readable UI](https://developer.hashicorp.com/terraform/internals/machine-readable-ui) · [JSON format](https://developer.hashicorp.com/terraform/internals/json-format) · [plan](https://developer.hashicorp.com/terraform/cli/commands/plan)

**salesforce** · [JSON responses](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_dev_cli_json_support.htm) · [deprecation policy](https://developer.salesforce.com/docs/platform/salesforce-cli-reference/guide/cli_reference_deprecation.html) · [plugin-org command-snapshot.json](https://github.com/salesforcecli/plugin-org/blob/main/command-snapshot.json)

**vercel** · [global options](https://vercel.com/docs/cli/global-options) · [vercel agent](https://vercel.com/docs/cli/agent) · [vercel skills](https://vercel.com/docs/cli/skills) · [@vercel/detect-agent](https://www.npmjs.com/package/@vercel/detect-agent) · [issue #15068](https://github.com/vercel/vercel/issues/15068) · [agent-readable docs guide](https://vercel.com/kb/guide/make-your-documentation-readable-by-ai-agents)

**cross-cutting** · [agents.md](https://agents.md/) · [agent env var proposal #136](https://github.com/agentsmd/agents.md/issues/136) · [oclif commands](https://oclif.io/docs/commands/) · [fly.io MCP](https://fly.io/docs/mcp/) · [supabase/cli#4675](https://github.com/supabase/cli/issues/4675)
