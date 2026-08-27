# Violating spawn shapes, kept as specimens

These are the call shapes `git-spawn-scan.ts` must catch. They are **`.txt`, not `.ts`**, on
purpose: the scan walks `.ts` files, so specimens written as TypeScript would be flagged as real
violations of the file they are testing — which happened, and is why they live here.

`incident.txt` is the shape that bricked this repository, reduced. It is caught by the
**fail-closed** arm rather than the literal-`git` arm: the spawn passes an opaque `args`, and the
word `git` appears only at the caller. Without fail-closed, the check would not have caught the
very bug it was built for.
