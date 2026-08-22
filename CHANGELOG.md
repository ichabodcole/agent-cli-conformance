# Changelog

## [1.0.1](https://github.com/ichabodcole/agent-cli-conformance/compare/v1.0.0...v1.0.1) (2026-08-22)


### Bug Fixes

* **cli:** a finding about the reader's config is a section, not a legend entry ([12f22ca](https://github.com/ichabodcole/agent-cli-conformance/commit/12f22ca7b2f970ee51023a5d8fad1e51cd167794))
* **cli:** correct the documented upgrade command, and lift config findings out of the legend ([195a722](https://github.com/ichabodcole/agent-cli-conformance/commit/195a7222a51a4450d47cb9eb7f6574f18536dd0c))
* **cli:** test the rendered report, and correct the specimens that drifted from it ([bbcfe50](https://github.com/ichabodcole/agent-cli-conformance/commit/bbcfe50821cf2e05ef57a6cda8512fe975936c18))

## [1.0.0](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.2.0...v1.0.0) (2026-08-21)


### ⚠ BREAKING CHANGES

* **kit:** a machine mode is declared, never inferred from a flag's spelling
* **kit:** the declaration is defaultOutput: "json", named for what is checked
* **kit:** a machine mode is declared, never inferred from a flag's spelling
* **kit:** targets that never declared lose the machine-mode verdicts at L0, and gain a line naming the one-line config that restores them. A target that declared is unaffected.

### Features

* **kit:** a machine mode is declared, never inferred from a flag's spelling ([d1d2d8f](https://github.com/ichabodcole/agent-cli-conformance/commit/d1d2d8f809170c0ee14e2137937454104a0478c3))
* **kit:** a machine mode is declared, never inferred from a flag's spelling ([637c47a](https://github.com/ichabodcole/agent-cli-conformance/commit/637c47ae2d2ee9f28dcbe88c1fa6e4aa8eb162d7))
* **kit:** a machine mode is DECLARED, never inferred from a flag's spelling ([3bb9462](https://github.com/ichabodcole/agent-cli-conformance/commit/3bb94628557464f6d723954f23837d6a82c25de2))
* **kit:** an excuse the run never evaluated is inert, not stale ([c7183aa](https://github.com/ichabodcole/agent-cli-conformance/commit/c7183aa45d73b45e46dd6ed404c54e4297a98881))
* **kit:** the declaration is defaultOutput: "json", named for what is checked ([530359c](https://github.com/ichabodcole/agent-cli-conformance/commit/530359c301038d389b6cca09e6c5ba13e417dd9e))


### Bug Fixes

* **d3:** a claim matched in prose downgrades a failure, it does not buy a pass ([8ed80db](https://github.com/ichabodcole/agent-cli-conformance/commit/8ed80db263fc4c59b89c7b41ecb3b4aa83c7f9f1))
* **kit:** a declaration is not a licence to skip the half the target got wrong ([1bab1c3](https://github.com/ichabodcole/agent-cli-conformance/commit/1bab1c3027e62c27cc3dcfb8c80c82705f8f0b3e))
* **kit:** a flag named --json is not proof that --json selects anything ([40c080e](https://github.com/ichabodcole/agent-cli-conformance/commit/40c080e031386ae978c49123a270933b6c4245f2))
* **kit:** a flag that requires a value is not a mode switch ([0bc739a](https://github.com/ichabodcole/agent-cli-conformance/commit/0bc739af5f1728893acbf8ecfceaeb1acd108eef))
* **kit:** a promise made in help is the one worth testing ([4dd177d](https://github.com/ichabodcole/agent-cli-conformance/commit/4dd177de16f1f939ac82c78853be9818f712a2a5))
* **kit:** a selector is established by a CONTRAST, not by a document appearing ([0e36d8b](https://github.com/ichabodcole/agent-cli-conformance/commit/0e36d8b60118a69efdccc42ef2f93d104d9aa87a))
* **kit:** a sentence in help must not be able to fail your build ([fdbb5b5](https://github.com/ichabodcole/agent-cli-conformance/commit/fdbb5b53ee0caaa8a23a213d18c8e1397024e544))
* **kit:** corroboration may decide whether a rule can condemn, never a rule that already answered ([ef1ca57](https://github.com/ichabodcole/agent-cli-conformance/commit/ef1ca57e5ad6382734ea78237187a43203f9a8f2))
* **kit:** D3 reads help, not our config ([a676736](https://github.com/ichabodcole/agent-cli-conformance/commit/a676736f55837aec6f84ecfa4c9c2ed833ac00b1))
* **kit:** tell a declaring target that its declaration was seen ([913896d](https://github.com/ichabodcole/agent-cli-conformance/commit/913896d61eaf4edd5676d6501188efe94f142b8c))
* **kit:** the corroboration guard was wrong in four places an outside review measured ([d7102f7](https://github.com/ichabodcole/agent-cli-conformance/commit/d7102f7c4a639b4ffe6f8565c3d621b7345cdf45))
* **kit:** the pipe-conditional patterns could not tell stdin from stdout ([ba1311e](https://github.com/ichabodcole/agent-cli-conformance/commit/ba1311e444093966b826bb250cfa82edb6fde964))

## [0.2.0](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.1...v0.2.0) (2026-08-21)


### Features

* **kit:** a CLI can declare machine mode is its default ([1bf0993](https://github.com/ichabodcole/agent-cli-conformance/commit/1bf0993cce3d0916b5c3b9ce5fee122058b905ae))
* **kit:** every report names the kit that produced it, and the docs name the pipe ([51ac40f](https://github.com/ichabodcole/agent-cli-conformance/commit/51ac40f3b6704d205851f8a7f65091989eb63802))


### Bug Fixes

* **kit:** a declaration must not excuse the path it does not cover ([ad62e9b](https://github.com/ichabodcole/agent-cli-conformance/commit/ad62e9b6c883f0de7532d0573fe0b31975b91b9f))
* **kit:** a waiver excuses a rule, it does not blind the kit to what the target did ([408edc2](https://github.com/ichabodcole/agent-cli-conformance/commit/408edc24944f7b35f5dcf2b3172d6eca5ff9dd92))
* **kit:** a waiver withdraws a premise, so C2 stops failing on a waived shape ([56b07a7](https://github.com/ichabodcole/agent-cli-conformance/commit/56b07a784e1e0c908691b3941faf954ced309cc8))
* **kit:** D1 must not accuse a target of a dependency it does not have ([a24b2eb](https://github.com/ichabodcole/agent-cli-conformance/commit/a24b2eb9ffd6b21277e3d3dcbf4d57d3b3f715fa))

## [0.1.1](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.0...v0.1.1) (2026-08-20)


### Bug Fixes

* **acc:** help must not carry a duration, and the reference implementation carried one ([9a22cc5](https://github.com/ichabodcole/agent-cli-conformance/commit/9a22cc58c2b2ed8b3a3521095933877d97dee989))
* close the review's three overclaims, and make the gate claim true ([8e29ec0](https://github.com/ichabodcole/agent-cli-conformance/commit/8e29ec0c8c1d64db2fe130767f3b9a7cf152ac40))
