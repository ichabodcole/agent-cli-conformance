---
name: acc
description:
  Check a command-line tool against the acc conformance standard. Use when someone wants to know
  whether their CLI is usable by agents and scripts, when they have run `acc check` and do not
  know what to do with the result, or when they want to cover the command paths a root-only probe
  cannot reach.
---

# Checking a CLI with `acc`

**This skill is the order of operations. It holds no facts of its own** — every claim below either
points at a document or is something you verify by running a command. If you find a sentence here
that does neither, that is a defect and the last section says where to report it.

`acc` is two things: a **standard** (a written argument about how CLIs should behave for agents)
and a **kit** that checks part of it. The standard covers more than the kit can measure, and the
kit says so about itself on every run.

## 1. Run it

```
acc check <target>
```

Takes ten minutes, needs no config, and executes the target — **read the safety note in
`acc check --help` first if your CLI does real work on a bare invocation.**

Add `--format text` if you are reading it yourself; without it you get JSON, which is what CI
wants.

## 2. Find out which branch you are on

**This is the step nothing else tells you, and it decides everything after it.** Look in the report
for the flag-surface block:

- **`enumerated N flags at the root:`** — your root names its accepted flags when it refuses one.
  A census can compare a declaration against that.
- **`did not enumerate at the root; N rejections read, none named a set`** — it refuses without
  saying what it accepts. **`acc check` alone will reach a verdict on almost nothing below your
  root**, and a batch is not an improvement on the census, it is the whole of it.

Neither is a failure. They decide which guide is next.

## 3. Go to the guide for what you found

| what you have                                       | where to go                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| core violations you want to clear                   | `acc show <rule-id> --body`, then **how to reach L0 in your project**              |
| a verdict you cannot read                           | the **conformance** concept page for `pass`/`fail`/`unverified`                    |
| coverage below the root                             | **how to record surfaces below the root** — `acc probe-plan` generates the capture |
| drift between what you document and what you accept | the same guide's census half                                                       |
| a restructure in front of you                       | **how to derive your surface from one registry**                                   |

`acc rules` lists everything the catalogue holds. `acc show <id>` is one rule; `--body` is its full
text and its argument.

## 4. Read what the report says it did NOT establish

**Do not stop at the verdict line.** The `NOT FULLY VERIFIED` block states, per rule, what a pass
did not cover — and it is the most useful part of the report. A `pass` here means _nothing
reachable was violated_, not _this rule holds_.

Adopters have consistently found this section worth more than the verdict, and one of them did work
no check required because the report was honest that it could not see it.

## 5. Report what happened — including if you got stuck

**This is part of the toolkit, not a courtesy.** The most useful thing you can send is the point
where you stopped.

**When you report, say which of these it was:**

1. **A gap in understanding** — the tool works, you could not tell what to do with it, or what
   something meant.
2. **The tooling did not work in your scenario** — it did the wrong thing, or nothing, on your
   actual CLI.

**Those are completely different problems and only you can tell them apart at the moment it
happens.** We will guess wrong afterwards, and we will guess in the direction that flatters us.

Include the command you ran and what came back. A finding nobody ran is a hypothesis.

**Where to send it:** see `REPORTING.md` beside this skill.
