---
name: cascade-check
description:
  Before changing something other code or other documents depend on, find what depends on it and
  decide whether the change still works — so a repair in one place does not quietly break a
  relationship somewhere else. Use before editing a shared value, a rule, a definition, an error
  classification, a link target, or a term other pages rely on, and when a reviewer has just
  reported a defect and you are about to fix it where it was found.
---

# Check what cascades before you change it

You are about to change one thing. Other things depend on it. Find them first.

This takes a few minutes. You are looking one step out from what you are touching, not across the
whole repository.

## When to run it

Run it when other code or other pages read the thing you are touching:

- a value, guard, or predicate more than one caller consults
- how an error is classified, or what an exit code means
- what a field, flag, or term means
- a link, a heading, or a sentence another page points at
- anything duplicated on purpose, where a lint or a test compares two copies

Skip it for new code nothing calls yet, a typo, or a change entirely inside one function.

If you are unsure, run it. It is cheap.

## Steps

### 1. Say what you are changing, in one sentence

Name the fact, not the file. "A missing declaration file is a usage error" is a fact. "Line 204 of
`check.ts`" is not.

If you cannot write that sentence, everything below will look clean, because you will search for
the wrong thing.

### 2. Find what depends on it

**In code:** search for the symbol, not the symptom. Who calls this function, reads this field,
constructs or catches this error type, imports this module? Who reads the value it returns?

**In documentation:** who links here, and what do they say this page says? Follow inbound links and
the `related:` entries in document frontmatter. Look for the same claim written out twice — a
description copied into a catalog, an example repeated in two guides, a number quoted in a second
place. Those copies do not update themselves, and a lint may be comparing them.

**In both:** look for tests, lints, and published examples. They are the ones that state the
current behaviour out loud.

### 3. Sort what you found

For each one, which is it?

- **Reads it** — takes the value and does something with it.
- **Derives from it** — computes something else from it, so a change moves that too.
- **Asserts it** — a test, a lint, a documented example, or sample output that states what it is
  today.
- **Sits near it** — mentions it but does not depend on it. Ignore these.

Read the **asserts it** group carefully before you change or update any of them. A test can pin the
behaviour you are changing while its name says it was checking something else.

### 4. Decide — there are three answers

**The change holds everywhere.** Make it.

**The change is right but belongs in more places.** Do not paste the same edit at each site. Change
the thing they all read, once, so they all inherit it. If there is nothing they all read — each
place decides for itself — then making one is the fix.

**The dependents cannot all be satisfied at once.** The fix is the wrong shape. Design it again,
then run steps 2 and 3 on whatever you are now proposing to change. One pass is often not enough:
the first tells you the fix is in the wrong place, and the second tells you what the right fix is.

Two signs you are in the third case:

- You are recognising a condition by matching text — an error message, a heading, a filename
  pattern. That works until someone rewords the text, and then it fails without saying so.
- The only way to make your fix work is to leave two callers deliberately answering differently.
  Someone will find that later and file it as a bug.

## Worked example

`acc probe-plan` answered `not_found` when `--paths` named a missing file and `usage` when
`--declaration` did. A reviewer reported the inconsistency.

Fixing it inside `probe-plan` made it worse. One step out: `loadDeclaration` has another caller,
and `acc check` answered the same mistake with `usage`. The inconsistency moved from between two
flags to between two commands.

One more step out found the real problem. There was a rule nobody had written down — a file that is
missing is `not_found`, and a file that is there but unreadable is `usage` — and three places were
each deciding it separately. The first fix had also recognised "missing" by matching the error's
message text, which is the first sign above.

The repair was to put the fact on the error itself, so all three places read it instead of deciding
it. A test caught in step 3 asserted exit code 2, though its name said it was checking something
else — that intent still held, and only the code changed.

It took two passes to get there, which is the usual number.

## Reviewers do this too

If you are reviewing and you find a defect, spend the same few minutes on what else touches it.
Then say in the report whether the obvious fix is safe. "Here is the bug" is useful. "Here is the
bug, and the obvious fix breaks this other thing" is what saves the round trip.

## Say what you found

Put the dependents you checked into the commit message or the pull request, and say which of the
three answers you got. The next person to touch this needs to know the list was made, and whether
the fix moved once or was redesigned.

For a large change, run this first so you write the right fix, then
[`two-lens-review`](../two-lens-review/SKILL.md) after, to catch what it broke anyway.
