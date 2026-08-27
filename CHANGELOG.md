# Changelog

## [0.1.4](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.3...v0.1.4) (2026-08-27)


### Features

* findings carry the argv behind every evidence id they cite ([a648a98](https://github.com/ichabodcole/agent-cli-conformance/commit/a648a98a7d32a2209f27e1d7320d158aae9e07b3))
* **report:** findings carry the probe behind each evidence id ([3ee2ca7](https://github.com/ichabodcole/agent-cli-conformance/commit/3ee2ca7a018483ccbe6e9e6e065fc4f127350a80))


### Bug Fixes

* **kit:** two source files were invisible to grep, for one byte each ([5b839c3](https://github.com/ichabodcole/agent-cli-conformance/commit/5b839c34a8ef4aff3b7bd2284a27cd0e1e5eb658))
* **report,wiki:** the legibility batch — five misreads, four fixed, one split ([5b7559a](https://github.com/ichabodcole/agent-cli-conformance/commit/5b7559ab36cd98127741ee2fd41ea10d683dba05))
* **spec:** the check help note sends readers on the join T2 removed ([e79a81d](https://github.com/ichabodcole/agent-cli-conformance/commit/e79a81d66bf279e66ec7bb84c18bbe304448492d))
* three things both adopter trials hit ([f0964b5](https://github.com/ichabodcole/agent-cli-conformance/commit/f0964b5462160c13eb9204c40d8853639ad816c0))

## [0.1.3](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.2...v0.1.3) (2026-08-27)


### Features

* **gate:** fail on unmarked version literals and unguarded git spawns ([f22ebc8](https://github.com/ichabodcole/agent-cli-conformance/commit/f22ebc8566ae51809d7093c3717384a2d89fd4a5))
* **kit:** a check that fails a fixture spawning git with an inherited environment ([18d908f](https://github.com/ichabodcole/agent-cli-conformance/commit/18d908f4de8e79fdbcb08604d5e0bc6552f071ef))
* **lint:** a release literal in a live document must be marked, removed, or allowlisted ([988d25f](https://github.com/ichabodcole/agent-cli-conformance/commit/988d25fb04692b92452c33e1d6263d495188b024))


### Bug Fixes

* **docs:** the two version literals that rot, one as a marker and one as a record ([2acc3dd](https://github.com/ichabodcole/agent-cli-conformance/commit/2acc3ddbb7dc1ed063244a949f29981ec5790d4c))
* **skills:** the skill carries no version literal — install, then verify ([b85e041](https://github.com/ichabodcole/agent-cli-conformance/commit/b85e041085fd039947b9f4738234dabe06a0ac8b))

## [0.1.2](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.1...v0.1.2) (2026-08-27)


### Features

* **version:** `acc version --check` — is the installed kit the current release? ([5a232a3](https://github.com/ichabodcole/agent-cli-conformance/commit/5a232a371c5f500b9fce7920b385650d1c8adcf7))
* **version:** `acc version --check`, and an install line that pins the tag ([cf63880](https://github.com/ichabodcole/agent-cli-conformance/commit/cf63880e2b6885390dd7d2728f407f8572341ed5))


### Bug Fixes

* **docs:** review items — proven marker form, the purpose clause, the moved-tag condition ([99b3a82](https://github.com/ichabodcole/agent-cli-conformance/commit/99b3a82f6c8629144a59bb392214328a55268e67))
* **docs:** the claims that drifted from behaviour, caught by the first outside run ([eaf284b](https://github.com/ichabodcole/agent-cli-conformance/commit/eaf284b3cfe885235cefbd931d6f2b38c8e89224))
* **skills:** the description stays check-shaped ([ba56356](https://github.com/ichabodcole/agent-cli-conformance/commit/ba56356331cef83796f4ffcaa0b5ab40c995dc1f))
* **skills:** the guidance is the goal, and the checks hold it in place ([d5f3dbe](https://github.com/ichabodcole/agent-cli-conformance/commit/d5f3dbe52ab8718170b2cd638fe2bcdabe3c7bc0))
* **test:** the release fixtures run git through the guarded helper ([0efa4cb](https://github.com/ichabodcole/agent-cli-conformance/commit/0efa4cb9c917f80ec7d4aac83c9a1d4f6ff9edee))
* two claims that would have shipped false ([84bc58e](https://github.com/ichabodcole/agent-cli-conformance/commit/84bc58e9a1bc3165ffa628492f37a3af56cc9795))

## [0.1.1](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.0...v0.1.1) (2026-08-27)


### Features

* **cli:** acc compare — where several tools answer differently ([deb7e6b](https://github.com/ichabodcole/agent-cli-conformance/commit/deb7e6b8a315581c66b2e6bea6843769fd42ddb6))
* **cli:** acc probe-plan emits a capture harness, not a list of argv ([c0a01b4](https://github.com/ichabodcole/agent-cli-conformance/commit/c0a01b4f632417aa486d74fd78927915dbbf96f1))
* **cli:** say in the headline that a declaration disagrees, and tell a modelling caller what they can do ([cd032b8](https://github.com/ichabodcole/agent-cli-conformance/commit/cd032b8e7beeb2ce9d8c1bba5d8cf23f93631142))
* **envelope:** next carries an executable and an argv array ([8204dc2](https://github.com/ichabodcole/agent-cli-conformance/commit/8204dc25440a789fcc0d72ccce4f63e08e7a2243))
* **kit:** a declaration format, and a reader that checks it against the tool ([0191f89](https://github.com/ichabodcole/agent-cli-conformance/commit/0191f897d055521d42f98feb3093f596a572edec))
* **kit:** read back the flag set a target names in its own rejection ([0c5c0ea](https://github.com/ichabodcole/agent-cli-conformance/commit/0c5c0eac8c18b0021131c79ed2ace256b01b5163))
* **kit:** read surfaces a caller recorded, and say who observed each line ([98ed3b6](https://github.com/ichabodcole/agent-cli-conformance/commit/98ed3b6c95029cf43e184c7329f64d0249b509ab))
* **kit:** the report names its target, in the target's own words ([ccbe03d](https://github.com/ichabodcole/agent-cli-conformance/commit/ccbe03d5aee54d328ec86dc687753834e613552d))
* **skill:** first-contact skill for adopters — draft for drift review ([12dbf7e](https://github.com/ichabodcole/agent-cli-conformance/commit/12dbf7ec6dc2bc6fdfc3bef3d1bc36c1e576c64d))
* **skill:** rewrite for the reader who has never heard of acc ([2f174c6](https://github.com/ichabodcole/agent-cli-conformance/commit/2f174c64bd33b06386e9783ce8da733be5d2d677))
* **skills:** cascade-check, for the fix that moves the problem instead of fixing it ([5a4724d](https://github.com/ichabodcole/agent-cli-conformance/commit/5a4724dd0cc9b71f0c55d45688e201850a76182c))
* the kit says the things it already knew ([1a23fb7](https://github.com/ichabodcole/agent-cli-conformance/commit/1a23fb712dd3e2e4ad17a0487aa996e5f3220979))


### Bug Fixes

* **cli:** a missing file is not_found, and the rule stops being per-command ([6c58e7d](https://github.com/ichabodcole/agent-cli-conformance/commit/6c58e7da58d57c1f9d0aadd8f787028553bc5f93))
* **cli:** one census line rests, and observationId reasons from what ships ([6104474](https://github.com/ichabodcole/agent-cli-conformance/commit/6104474579e22c1e2df8799bbb0491ffba7919d5))
* **cli:** the NOTE withholds on a prefix or a rendering, and is tested both ways ([928d383](https://github.com/ichabodcole/agent-cli-conformance/commit/928d383224885264644969bf205db6fc2e6e1a13))
* **kit:** A4 promises no route, and the exit-code contract agrees with itself ([26bc232](https://github.com/ichabodcole/agent-cli-conformance/commit/26bc232d1420c082fa380491d967edbe81453482))
* **kit:** capture short flags, and say the surface was read at the root ([942f1a1](https://github.com/ichabodcole/agent-cli-conformance/commit/942f1a1634592b5bf6312c1edaf03f50b5cacf90))
* **kit:** name C2's exit codes, unwrap help before matching, stop cutting the remedy ([8ee27e2](https://github.com/ichabodcole/agent-cli-conformance/commit/8ee27e2a7e7ec0edd345fb3410f926d2fe54e732))
* **kit:** targetIdentity is optional, and the axis comment stops licensing the overread ([ef80c1c](https://github.com/ichabodcole/agent-cli-conformance/commit/ef80c1c0f70b39c80583b82584c5885a150cde9f))
* **kit:** the B5 quote clipped by code units, splitting a character in half ([9193bd9](https://github.com/ichabodcole/agent-cli-conformance/commit/9193bd91a6760d6308eac55417479f65986bedfb))
* **kit:** the census fraction takes its numerator from its own denominator ([3de5930](https://github.com/ichabodcole/agent-cli-conformance/commit/3de59303e100949bbe57e61ab981f3d8180ad236))
* **kit:** the fixtures refuse to run git anywhere they did not create ([1b600b4](https://github.com/ichabodcole/agent-cli-conformance/commit/1b600b46f857df546061dd50fe1fc06beabe71e1))
* **kit:** the harness stops dirtying the tree, and identity is config again ([45c8445](https://github.com/ichabodcole/agent-cli-conformance/commit/45c844525a1d529d0577ad23695d99d173d731c6))
* **kit:** the identity quote is clipped by length as well as by line ([30ad29d](https://github.com/ichabodcole/agent-cli-conformance/commit/30ad29d7b1220eb6a213bec5e7883242191a1995))
* **kit:** the multi-byte fixture emitted no multi-byte bytes on Linux ([cd22adf](https://github.com/ichabodcole/agent-cli-conformance/commit/cd22adf86d379917ed8e64bf6dd496860a2ce745))
* **kit:** the not-compared reason stops naming a claim nobody is going to make ([a98a607](https://github.com/ichabodcole/agent-cli-conformance/commit/a98a60776bfec08b1cd4af07780748165ff1909c))
* **kit:** the test suite stops running git against the repository it lives in ([4727ed2](https://github.com/ichabodcole/agent-cli-conformance/commit/4727ed2e9ae7fcf461ed4ed818868ea9db7697c1))
* name the premise three verdicts rest on, and correct what we claim to check ([6346284](https://github.com/ichabodcole/agent-cli-conformance/commit/6346284785aacd20b662cde70a1a3cfa9dceb9c9))


### Performance Improvements

* **kit:** make the probe deadline a parameter, and cut the gate in half ([16b993a](https://github.com/ichabodcole/agent-cli-conformance/commit/16b993a02dc9a8520881213555c894c53405d551))


### Miscellaneous Chores

* release this range as 0.1.1, and keep the README's rule mechanical ([5de1b05](https://github.com/ichabodcole/agent-cli-conformance/commit/5de1b05d00d671a6b26637c7e6b3094d3ae20fe6))
* release this range as 0.2.0 rather than 0.1.1 ([d512858](https://github.com/ichabodcole/agent-cli-conformance/commit/d51285852a0339dc65044917897bbae2c4a1d292))

## [0.1.0](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.0...v0.1.0) (2026-08-23)


### Features

* **cli:** publish the deviation classification where machines read it ([7627be3](https://github.com/ichabodcole/agent-cli-conformance/commit/7627be303c0e35920e8610e75071958bf747015b))
* **cli:** the text report says what each waiver cost ([928fc74](https://github.com/ichabodcole/agent-cli-conformance/commit/928fc744ca56c0a3b1de4b6bb96970e819f90320))
* **kit:** a waived design-choice keeps fullyVerified ([83980ef](https://github.com/ichabodcole/agent-cli-conformance/commit/83980ef14e2842724eb4ad0a3b9b42b87945d363))
* **kit:** publish the observations the evidence ids point at ([85679c6](https://github.com/ichabodcole/agent-cli-conformance/commit/85679c67504c92cb4c189e70a07425cf3ea77b53))
* rules say what a violation means, and evidence ids resolve to the probes behind them ([d9b16a8](https://github.com/ichabodcole/agent-cli-conformance/commit/d9b16a8089aaa984c187e847d739520972469cc0))
* **wiki:** classify every rule by what NOT satisfying it means ([22dfa54](https://github.com/ichabodcole/agent-cli-conformance/commit/22dfa54345750c67a9565e6def92f62b51f58962))


### Bug Fixes

* **kit:** repairs from the two-lens review ([26efcd2](https://github.com/ichabodcole/agent-cli-conformance/commit/26efcd2110db20062cfb9df5187198355c32ca38))
* **kit:** revert A6, restore the deleted stability promise, and bind three hollow tests ([cecaa36](https://github.com/ichabodcole/agent-cli-conformance/commit/cecaa36143a327d35c2d2b53338aacd5ca2e9dd4))


### Miscellaneous Chores

* pin the first release of the reset line ([31195e5](https://github.com/ichabodcole/agent-cli-conformance/commit/31195e59df15f33440f22b74010ee814c4aaa42f))

## Changelog

<!-- Releases before this file was reset are archived verbatim in docs/reports/2026-08-22-release-notes-from-the-withdrawn-1x-line.md; the reasoning is in docs/wiki/decisions/pre-1-0-while-the-design-moves.md -->
