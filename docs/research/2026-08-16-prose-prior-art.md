---
type: research
generated: { by: unknown, at: 2026-08-16 }
status: stable
description: What already exists for prose density: the phenomenon, its cause, the guidance, the method of correcting a model, and the measurement.
tags: [prose, documentation]
---

# Prose density: prior art

**Research date:** 2026-08-16
**Question:** Before building more of our own, what already exists — for the phenomenon, its
cause, the content of the guidance, the method of correcting a model, and the measurement?
**Method:** Literature and documentation search against the five questions in the brief. Primary
sources fetched and read where reachable; paywalled and blocked sources are marked as such.
**Companion:** `research/2026-08-16-prose-density.md` (our characterisation),
`.claude/output-styles/plainspoken.md` and `.claude/skills/plainspoken-edit/` (what we built).
**Caveat on coverage:** the session's web-search budget was exhausted partway through. Several
sub-questions were answered by direct fetch of known URLs rather than by search, so absence of a
result here is weaker evidence of absence than usual. Every such gap is named in §8.

---

## 1. Executive summary

### 1.1 The three findings most likely to change what we build

**1. A tell is not a defect, and we had merged them.** Two separate literatures answer two separate
questions, and our documents run them together:

| Question                                  | Verdict                                                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Do LLMs nominalise more than humans?      | 🟢 **Measured.** 1.5–2× (Reinhart et al., _PNAS_ 2025)                                                                                               |
| Is nominalised prose harder for a reader? | 🔴 **Largely unmeasured.** Two studies from 1963–65 using cloze and rote learning, plus one 1998 study whose effect reversed for non-native speakers |

"Avoid nominalisations" is defensible as _stop sounding like an LLM_. It is not defensible as _make
this easier to read_ — and the two motivations produce different edits. The same split applies to
most of our mechanism table. §7 is the reconciliation and it is the single most useful section here.

**2. The instrument is aimed at the wrong mechanism.** The one mechanism with robust evidence for
_reading cost_ in ordinary prose is **centre-embedding** — Martínez, Mollica & Gibson (_Cognition_ 2022) found it depressed recall more than jargon, passive voice or capitalisation, in real legal
prose, for experienced readers. `measure.ts` reports nominalisation density on every run and has **no
centre-embedding detector at all**. It measures the folklore column and is blind to the robust one.
The fix is a locality measure — subject–verb distance, or words before the main verb. §6.5 lists the
changes in order of value.

**3. Our review-beats-priming claim has direct support, and it comes with a sharpening.** Reinhart et
al. prompted instruction-tuned models to imitate a supplied style. The grammatical features did not
move; the tells "persisted across all contexts and genres tested." Their blunt version: "instruction
tuning appears to make the model output less human, not more."

But Boggia measured a **70–72% reduction** in "not X, but Y" from a one-line instruction. So the rule
is not "priming is weak". It is that **named, specific tics respond to instruction and diffuse
distributional properties do not.** That is exactly the division of labour between `plainspoken.md`'s
"Habits to drop" and `plainspoken-edit`'s aggregate measurement, and it is now evidenced rather than
assumed. §5.2.

### 1.2 Answers to the five questions, in one line each

|                                   | Answer                                                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Named and documented?**      | Partly. The _constructions_ are catalogued and some are measured. The _aphoristic register_ is not documented anywhere, and Wikipedia lists "fancy/academic prose" as an **ineffective** AI indicator. §2 |
| **2. Where from?**                | Post-training, measured by base-versus-instruction-tuned comparison. The vocabulary link to human preference is demonstrated; the syntactic one is inferred. §3                                           |
| **3. Prior art for the content?** | Yes, for all five mechanisms. None needs coining. Three of our names should change. §4                                                                                                                    |
| **4. Corrective instruction?**    | Almost nothing directly on point. This is the real gap. §5, §8.1                                                                                                                                          |
| **5. Measurement?**               | Yes, and better than we chose. Dependency locality, Biber Dimension 1, surprisal — with a warning against LLM-surprisal meters. §6                                                                        |

### 1.3 Where our characterisation is wrong

**Five independent primary sources reject word-count sentence limits.** Aristotle ("not too big to be
taken in at a glance"), Gopen & Swan ("we disagree… we have seen 10-word sentences that are virtually
impenetrable"), Williams (his term is **sprawl**, and he shows a 36-word sentence that does not
sprawl), the US Federal Plain Language Guidelines (structural rule, no number at all), and the
readability-formula critical literature. The causal variable is **dependency structure, not word
count**. `plainspoken.md`'s "anything past roughly 30 words should be two sentences" states as a rule
what all five deny. §4.5

**Periodic structure is not a defect; unbounded suspension is.** Aristotle _prefers_ it. Williams
endorses it sparingly and notes that a nominalisation which damages a sentence in subject position
gives a satisfying thump at the end. Anti-locality results say more preverbal material can make a head
_faster_. Mechanisms 1 and 3 are position-dependent, and we state them as uniform. §4.5, §6.2

**Two naming problems.** "Abstraction stacking" collides with the established "noun stack" (adjacent
nouns; Google caps it at two) — Pinker's **metaconcepts** is the safe adoption. And "one topic per
sentence", which we attributed to Simplified Technical English, is a misreading: STE Rule 5.2 is one
_instruction_ per sentence, Rule 6.5 is one _topic_ per **paragraph**. §4.1, §4.7

**Our account of why the register reads as authoritative is close, but the mechanism is inverted.**
We wrote that the prose "sounds authoritative". Zhou et al. (ACL 2024) measured it: models emit an
epistemic marker in only about 5–6% of responses; reward models score **plain statements 4.03,
strengtheners 0.82, weakeners −1.86**; and readers rely on unmarked statements as heavily as on
marked ones. Their phrasing: "the lack of epistemic markers is perceived as confident language."

So models are not trained to sound assertive. **Hedges are penalised, unmarked declaratives win, and
the confidence is the reader's inference rather than the sentence's claim.** That is our
misattribution argument arriving from the other side. It also makes `plainspoken.md`'s "do not hedge
to sound modest" rule redundant at best — the model already under-hedges relative to humans. §3.2c

### 1.4 What we could not find, which is itself the result

**There is no established academic method for writing corrective style instruction.** No study
compares a pre-writing style guide against a post-hoc editorial pass for prose register. No validated
rubric for prose register exists. **We are not behind the state of the art, because there is no state
of the art.** §8.1

**But there is practitioner prior art, and it vindicates the format we chose.** The labs publish
their own corrective style instruction, and it looks like `plainspoken.md`: positive specification for
the register plus a short enumerated list of named tics to suppress. Anthropic's production system
prompts ban specific opener phrases and, in the current models, exactly three words — "genuinely",
"honestly", "straightforward". OpenAI's Model Spec bans "purple prose, hyperbole, self-aggrandizing,
and clichéd phrases" and "excessive hedging". **We reinvented something, and the something is good.**
§5.7

**A negative finding from the same place:** no em-dash instruction and no "not X, but Y" prohibition
appears in any published system prompt, model spec or constitution from any lab. The two tics that
dominate the folklore are absent from every vendor's own corrective instruction.

Two external corroborations of this project's own thesis, both from outside software:

- **Caterpillar Fundamental English was discontinued in 1982** because its guidelines "were not
  enforceable". Its successor inverted the design — a large precise vocabulary plus an enforcing tool,
  instead of a short vague one plus goodwill. That is layer 3 losing to layer 2, measured in industry
  over a decade. §4.7
- **Partial adoption of a controlled language was worse than no adoption.** Chervak & Drury measured
  task error rates on real aircraft maintenance: Simplified English reduced errors, the _hybrid_
  version increased them. Our current state is a hybrid — a new register applied only to new text over
  a corpus written in the old one. §4.7

One structural finding that should shape how we think about all of this: **the assistant register
lives in roughly 5–8% of token positions and is made mostly of discourse markers** (Lin et al., ICLR
2024). 77.7% of token positions are identical between a base and an aligned model. That explains why
named tics respond to instruction and diffuse properties do not, and it predicts the register is
strongest at the opening of a passage — which is checkable against our own corpus. §3.2a

---

## 2. Does the phenomenon have a name, and is it documented?

### 2.1 "Not X, but Y" — yes. Three names exist. Take two of them.

**DOCUMENTED, and partly measured.** The construction has a classical rhetorical name, a
practitioner name, and one direct measurement. They are worth separating because they do different
jobs.

**The classical name is epanorthosis** (Latin _correctio_): immediate, emphatic self-correction of
a term just uttered. Catalogued by Cicero and Quintilian, classified by Fontanier as a figure of
thought, and present in Lausberg's _Handbook of Literary Rhetoric_.
[Epanorthosis](https://en.wikipedia.org/wiki/Epanorthosis). Its stock example is "Thousands — no,
millions!"; a modern one given there is "This is not a course. It is a journey of transformation."
This is the right term for the _device_.

**The practitioner name is negative parallelism.** The primary artefact is
[Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), a
WikiProject AI Cleanup advice page. It has a `===Negative parallelisms===` section with the
shortcut `WP:AIPARALLEL` and three sub-patterns, one of which is titled exactly **"Not X, but Y"**:

| Sub-pattern                | Our name for it              | Their examples                                 |
| -------------------------- | ---------------------------- | ---------------------------------------------- |
| **Not just X, but also Y** | —                            | "Not only … but …", "It is not just …, it's …" |
| **Not X, but Y**           | antithesis as a closing move | "It's not …, it's …", "no …, no …, just …"     |
| **X rather than Y**        | —                            | noted as "particularly common in Grok output"  |

The page's own gloss is close to our misattribution argument, from a different angle:

> When LLMs describe a subject, their output may seem as though it is clearing up a common
> misconception, or as though the audience may be reaching an incomplete or incorrect conclusion
> about that subject.

**The peer-reviewed hook is Russell, Karpinska & Iyyer (ACL 2025)**, whose Table 3 codes what
expert annotators actually said when identifying AI text. Their largest category is _Sentence
Structure_ at **35.9%** of explanations, defined verbatim as:

> AI-generated sentences follow predictable patterns (e.g., high frequency of "not only … but
> also …", or consistently listing three items), while human-written sentences vary more in terms
> of length.

Their published detection guide (Table 12) lists _"it's not about ___ it's about \___"_ and _"not
only ___ but also"_ under Phrases. Note precisely what 35.9% measures: how often annotators
_invoked the category_, not how often the construction appears. It measures the folklore's
salience among people who are demonstrably good at the task, which is a real signal and not a
frequency count.

**The one direct frequency count is equivocal and its author says so.** Boggia, "Artificial
Epanorthosis: Why large language models overuse a classical rhetorical figure, and how to mitigate
it", [arXiv:2607.21498](https://arxiv.org/abs/2607.21498) (July 2026, single author, not peer
reviewed). Density per 10,000 words, human → LLM, by genre:

| Genre             | Human | LLM  | Ratio         |
| ----------------- | ----- | ---- | ------------- |
| oratory           | 14.9  | 33.5 | 2.2× (p=0.03) |
| academic abstract | 3.6   | 7.8  | 2.2× (p=0.28) |
| argument          | 17.2  | 22.0 | 1.3× (p=0.37) |
| encyclopedic      | 1.2   | 1.4  | ~1× (p=1.00)  |
| journalism        | 2.4   | 2.0  | 0.9×          |
| narrative         | 7.5   | 4.1  | 0.5×          |
| informal Q&A      | 8.2   | 1.3  | **0.2×**      |

The paper's own framing is "mis-calibration by register in **both directions**." Its limitations
section states: "Under a strict correction neither marginal result survives, so the measurement is
a first signal rather than a settled effect." Its detector scores precision 0.82 on model text but
**0.17 on human text**, meaning the human baseline is the noisy side of the ratio. Human oratory,
argument and narrative baselines are 19th- and early-20th-century public-domain texts, so register
is matched but era is not.

A widely repeated figure of **"about three times more frequently than humans"** appears in the
Wikipedia article [Negative parallelism](https://en.wikipedia.org/wiki/Negative_parallelism),
sourced entirely to one paywalled _Atlantic_ piece (Oremus, 12 July 2026). We could not reach the
underlying analysis, and the number does not reconcile with Boggia's. **Do not cite the 3× figure.**

**Verdict for us.** We reinvented a named thing, and its name is available at two levels. Rename
the `measure.ts` tic from `antithesis closer (not X, but/it's Y)` to **`negative parallelism`**,
and use **epanorthosis** in prose when the classical device is meant. But temper the claim in
`plainspoken.md`: the best available count says the over-production is register-dependent and, in
encyclopedic prose specifically — which is what our wiki is — **LLM and human rates were
indistinguishable**. The construction is a real habit worth editing out of a technical document
because it costs the reader a second pass. It is not established that it is an AI tell _in our
genre_.

### 2.2 The syntactic register — measured, and it matches two of our mechanisms

**MEASURED.** Reinhart, Markey, Laudenbach, Pantusen, Yurko, Weinberg & Brown, "Do LLMs write like
humans? Variation in grammatical and rhetorical styles", _PNAS_ 122(8), 2025.
[doi:10.1073/pnas.2422455122](https://doi.org/10.1073/pnas.2422455122) ·
[PMC11874169](https://pmc.ncbi.nlm.nih.gov/articles/PMC11874169/)

Design: a 12,000-text human corpus across six genres (academic, news, fiction, spoken, blogs,
scripts) plus COCA, against six models — GPT-4o, GPT-4o mini, and four Llama 3 variants including
_base and instruction-tuned pairs_.

Findings that bear directly on our mechanism table:

| Feature                     | Finding                                                      | Our mechanism                |
| --------------------------- | ------------------------------------------------------------ | ---------------------------- |
| Nominalisations             | LLMs at **1.5–2× human rate**                                | Nominal style                |
| Present participial clauses | Instruction-tuned at **2–5× human rate**                     | not in our table — see below |
| "That"-clauses as subjects  | Instruction-tuned at **2.6× human rate**                     | Periodic structure (partly)  |
| Agentless passive           | GPT-4o at roughly **half** the human rate                    | —                            |
| Overall                     | "a distinct noun-heavy, informationally dense writing style" | Abstraction stacking         |

A random-forest classifier on grammatical features alone reached 66% accuracy, with only 4.2% of
LLM texts misclassified as human.

**This supersedes part of our §2 mechanism table.** We derived our five mechanisms by reading our own
wiki. Two of them — nominal style and abstraction stacking — turn out to be the measured signature of
instruction-tuned output. That is a much stronger footing than we had.

The paper also identifies one mechanism we missed entirely: the **present participial clause**, the
trailing "-ing" phrase, as in "…, reflecting its continued relevance." Wikipedia catalogues the same
thing under
[`WP:SUPERFICIAL`](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) ("superficial
analyses"), noting it is "often done by attaching a present participle ('-ing') phrase at the end
of sentences." At 2–5× the human rate it is the largest single grammatical deviation the PNAS
paper found, and it is regex-visible. **Recommend adding it as a sixth mechanism and a sixth tic.**

The paper scores its corpora on **Douglas Biber's** lexical, grammatical and rhetorical feature
set, which is the standard instrument for this and is discussed again in §6. Its other relevant
finding: LLMs **underuse** hedging qualifiers and intensifiers. Our `plainspoken.md` rule "do not
hedge to sound modest" is therefore pushing in a direction the model already goes. It is not wrong,
but it is not where the leverage is.

Reinhart maintains a curated, current bibliography of this whole literature at
[refsmmat.com/notebooks/llm-style.html](https://www.refsmmat.com/notebooks/llm-style.html)
(updated 8 June 2026). **Use it as the index rather than re-running this search.**

### 2.2a Corroborating measurements of the same register

All MEASURED, all pointing the same way — informationally dense, nominal, formulaic — and several
attributing it specifically to instruction tuning:

- **Shaib, Elazar, Li & Wallace, "Detection and Measurement of Syntactic Templates in Generated
  Text", EMNLP 2024** ([arXiv:2407.00211](https://arxiv.org/abs/2407.00211)). Defines _syntactic
  templates_: repeated part-of-speech sequences, beyond n-gram repetition. Models produce templated
  text at a higher rate than human references. **76% of templates found in model text also occur in
  pre-training data, against 35% for human-authored text**, and the templates are not overwritten
  by RLHF. This is the best formal handle on "formulaicity" and the closest existing analogue to
  what we called a mannerism visible only in aggregate.
- **Padmakumar & He, "Does Writing with Language Models Reduce Content Diversity?", ICLR 2024**
  ([arXiv:2309.05196](https://arxiv.org/abs/2309.05196)). Controlled experiment on argumentative
  essays with three conditions. Statistically significant diversity reduction **with InstructGPT
  but not with base GPT-3**.
- **Jiang & Hyland, "Lexical bundles in LLM-generated texts", _Applied Linguistics_ 46(3):375–391**
  ([doi:10.1093/applin/amae052](https://doi.org/10.1093/applin/amae052)). ChatGPT essays contain
  _fewer_ lexical bundles but with a higher type/token ratio, "suggesting that its bundles are more
  rigid and formulaic"; noun- and preposition-based bundles are more prevalent.
- **Milička, Marklová & Cvrček, "Benchmark of stylistic variation in LLM-generated texts"**
  ([arXiv:2509.10179](https://arxiv.org/abs/2509.10179)). Replicates Reinhart's method across GPT,
  Gemini and Claude on the BE21 corpus using Biber's original six dimensions. Confirms the shift on
  Dimension 1 (involved → informational); magnitude varies sharply by model.
- **Mizumoto, Yasuda & Tamura, _Applied Corpus Linguistics_ 4(3):100106, 2024**
  ([doi:10.1016/j.acorp.2024.100106](https://doi.org/10.1016/j.acorp.2024.100106)). ChatGPT essays:
  higher syntactic complexity, **more nominalization**, fewer errors; human essays: more modals and
  epistemic markers.
- **Goulart et al., _Journal of Second Language Writing_ 66:101160, 2024**
  ([doi:10.1016/j.jslw.2024.101160](https://doi.org/10.1016/j.jslw.2024.101160)). Biber
  multidimensional analysis, student vs GPT-3.5: AI texts "more informationally dense, explicit, and
  less involved."

### 2.3 The aphoristic register itself — no, and the folklore says we may be wrong

We found **no source, academic or practitioner, that names an aphoristic or gnomic register as
characteristic of LLM output.** The catalogued tells are lexical (specific overused words),
constructional (negative parallelism, rule of three, participial closers), typographic (em dashes,
emoji, markdown), and rhetorical-but-shallow (superficial analysis, vague attribution, puffery).
Compression that reads as authoritative is not on anyone's list.

Worse for our framing, the Wikipedia page lists **"'Fancy', 'academic', or 'formal' prose"** under
_Ineffective indicators_, with a reason that lands on us:

> While LLMs disproportionately favor certain words and phrases, many of which are longer and have
> more difficult readability scores than some of their synonyms, these are _specific words_. The
> correlation does not extend to all formal, academic, or "fancy"-sounding prose.

It also lists "'Bland' or 'robotic' prose" as ineffective, citing Murray & Tersigni (2024).

**Read this as a correction to our framing, not to our problem.** The wiki prose we set out to fix
is genuinely dense, and the reader who reported rereading it was reporting something real. What we
cannot claim is that the _density_ is an AI tell. The measured AI tells are nominalisation rate,
participial clauses and vocabulary — which our prose also has. Density and AI-ness are two
overlapping claims and we had merged them.

### 2.4 Em dashes — measured, and less universal than the folklore

**MEASURED, with a caveat that undermines the folk version.** E. M. Freeburg, "The Last
Fingerprint: How Markdown Training Shapes LLM Prose", arXiv:2603.27006 (preprint, not peer
reviewed). [https://arxiv.org/abs/2603.27006](https://arxiv.org/abs/2603.27006)

Twelve models across five providers, three prompting conditions, against a human baseline of eight
published essays (57,232 words).

|                  | Unconstrained                              | Markdown suppressed | Em dash prohibited |
| ---------------- | ------------------------------------------ | ------------------- | ------------------ |
| GPT-4.1          | 10.62                                      | 9.10                | **3.86**           |
| DeepSeek V3      | 8.66                                       | 4.75                | **1.57**           |
| Claude Opus 4.6  | 8.46                                       | 0.19                | 0.00               |
| GPT-5.4          | 0.75                                       | 0.15                | 0.00               |
| _human baseline_ | _mean 3.23, median 3.83, range 0.33–17.12_ |                     |                    |

Two things fall out. First, **the tell is model-specific and generation-specific**, not a property
of LLMs: GPT-5.4 unconstrained sits well below the human mean. Second, and directly relevant to
question 4, **explicit prohibition failed on two of four models** — GPT-4.1 kept 3.86 per thousand
words after being told not to. The author's own stated limitation is that the human range spans
50×, which makes "overuse" hard to define against a universal norm.

Independent corroboration of the model-specificity: the _Economist_'s July 2026 analysis, as cited
by the Wikipedia page, "found that of contemporary models only Claude used em dashes more than
professional writers, and ChatGPT used them less." (Paywalled; not read directly.)

**The peer-reviewed evidence runs the other way entirely.** Russell et al.'s Table 3 category
_Grammar & Punctuation_ (24.8% of annotator explanations) reads verbatim: "AI-generated text is
usually grammatically perfect (**also avoiding dashes and ellipses**), while human-written text
often contains minor errors." Their expert annotators used dashes as a sign of _human_ writing. One
sample explanation: "There's a lot of variety in the article's grammar use, with dashes, brackets,
quotes intermixed with sentences."

Wikipedia's own hedge is careful and worth copying: LLM output uses em dashes more often than
"**nonprofessional** human-written text of the same genre", and the sign "is most useful when taken
in combination with other indicators, not by itself." It also names a better tell than frequency:
AI em dashes are usually **spaced**, against typographic convention.

**Consequence for `plainspoken.md`.** Our "em-dash pivot" rule targets a _structure_ — a claim,
then a dash, then the qualification that is the real point — and that structure is a genuine reread
cost. Keep the rule. Drop any implication that em-dash frequency itself is an AI tell; the best
evidence available says it is not, or is model-specific enough not to generalise.

### 2.5 Human detection of the register — measured

**MEASURED.** Russell, Karpinska & Iyyer, "People who frequently use ChatGPT for writing tasks are
accurate and robust detectors of AI-generated text", ACL 2025, pp. 5342–5373.
[https://aclanthology.org/2025.acl-long.267/](https://aclanthology.org/2025.acl-long.267/) ·
[arXiv:2501.15654](https://arxiv.org/abs/2501.15654)

300 non-fiction English articles, annotators asked to classify and explain. A majority vote of five
frequent-LLM-users misclassified **1 of 300**. Cues cited were both "specific lexical clues ('AI
vocabulary')" and "more complex phenomena" including formality, originality and clarity. Human
experts beat automated detectors and resisted paraphrase and "humanization" evasion.

---

## 3. Where does it come from?

The short answer is **post-training, not pretraining**, and the evidence for that is unusually
direct because several studies compare base against instruction-tuned versions of the same model.

### 3.1 The base-versus-instruction-tuned comparisons

**MEASURED.** Reinhart et al., PNAS 2025 (§2.2), tested four Llama 3 variants including base and
instruction-tuned pairs. Base models "used grammatical features at rates closely resembling human
writing"; instruction-tuned models showed the deviations. The authors' conclusions, verbatim:

> instruction tuning appears to make the model output less human, not more

> differences in style are not simply due to the selection of texts for training the base models,
> but due to the instruction-tuning process

They extend the same finding to vocabulary: word-choice biases were "introduced by the instruction
tuning process, not simply by bias in the texts composing the training sets."

**MEASURED.** Padmakumar & He, ICLR 2024 (§2.2a): content-diversity reduction was statistically
significant with InstructGPT and **not** with base GPT-3.

**MEASURED.** Freeburg (§2.4) ran the one base/instruct em-dash comparison available, on Llama 3.1
8B: base 0.49 per thousand words, instruction-tuned 0.00. Note the direction — here post-training
_suppressed_ the habit. The author lists this as a limitation, since it is the only base comparison
he could obtain and it runs opposite to the story.

**Assessment.** Three independent measurements say the register is a post-training artefact. One of
them says the direction is not always the same. Take "post-training shapes it" as established and
"post-training always amplifies it" as not.

### 3.2 Human preference as the mechanism

**MEASURED, and this is the mechanistic result.** Juzek & Ward, "Word Overuse and Alignment in Large
Language Models: The Influence of Learning from Human Feedback",
[arXiv:2508.01930](https://arxiv.org/abs/2508.01930) (Aug 2025). They emulated the learning-from-
human-feedback procedure with human participants and found that **participants systematically prefer
text variants that include the overused words.** The overuse is not an artefact of the optimiser; it
is what the annotators picked.

Their earlier paper, "Why Does ChatGPT 'Delve' So Much? Exploring the Sources of Lexical
Overrepresentation in Large Language Models", COLING 2025
([arXiv:2412.11385](https://arxiv.org/abs/2412.11385)), identifies 21 focal words and reports finding
**no evidence** that architecture, algorithm or training data cause the overuse, pointing at RLHF by
elimination.

This is as close as the literature gets to answering our origin question, and it answers it for
_vocabulary_. Nobody has run the equivalent experiment for a syntactic property. **The inference
"annotators prefer nominal, dense, confident-sounding prose, therefore RLHF produces it" is not
demonstrated.** It is plausible and it is consistent with the base/instruct comparisons above, and
it is an inference.

### 3.2a Where the register actually lives: 5–8% of token positions

🟢 **MEASURED, and this is the most useful single result for building anything.** Lin, Ravichander,
Lu, Dziri, Sclar, Chandu, Bhagavatula & Choi, "The Unlocking Spell on Base LLMs", ICLR 2024,
[arXiv:2312.01552](https://arxiv.org/abs/2312.01552). Token-distribution-shift analysis between base
and aligned pairs (Llama-2-7b against -chat and Vicuna; Mistral-7B against -Instruct):

- **77.7% of token positions are unshifted** — the base model's top-1 choice is identical.
- **92.2% fall within the base model's top 3.**
- Only **5–8% of positions are genuinely shifted**, and the shifted tokens are **discourse markers
  and framing devices**: "However", "cannot", "Here", "To", "Instead", "Remember". Not content
  tokens.
- The shift is **front-loaded**. KL divergence between base and aligned distributions decreases over
  decoding steps, and the mean base-rank of aligned tokens drops below 5 after position 5.

**Read plainly: the assistant register is a thin veneer, it is made of connective tissue, and it is
concentrated in the opening tokens.** Two things follow for us. First, it explains why a diffuse
style instruction fails while a named-tic instruction works (§5.2) — the tics _are_ the discourse
markers, and they are the only part that moved. Second, it predicts the register is strongest at the
start of a passage. That is a testable claim about our own corpus, and `measure.ts` could check it by
position.

### 3.2b What reward models and judges prefer

A large, solid, quantitative literature, all 🟢 MEASURED. It is real, and it sits one inferential
step away from our question.

**Length is the dominant style variable, and on one dataset it is almost the whole reward.** Singhal,
Goyal, Xu & Durrett, "A Long Way to Go: Investigating Length Correlations in RLHF", COLM 2024,
[arXiv:2310.03716](https://arxiv.org/abs/2310.03716). Reward-model score correlates with response
length at Pearson **0.72 (WebGPT), 0.55 (Stack Exchange), 0.67 (RLCD)**. The fraction of PPO's reward
gain attributable to _non-length_ features is **2.0% on WebGPT**. A purely length-based reward
reproduces nearly all of standard PPO's win rate.

Corroborated on real human votes rather than reward-model proxies:
[LMSYS/LMArena's style-control analysis](https://www.lmsys.org/blog/2024-08-28-style-control/) fits a
Bradley–Terry model with style covariates and finds **length 0.249**, markdown list 0.031, header
0.024, bold 0.019. Their conclusion: "length was the dominant style factor. All other markdown
effects are second order." **The style effect is present in human votes, upstream of LLM-as-judge.**

**Format bias is measurable and cheap to inject.** Zhang et al., "From Lists to Emojis: How Format
Bias Affects Model Alignment", ACL 2025, [arXiv:2409.11704](https://arxiv.org/abs/2409.11704). Their
method is clean: take a response containing a format pattern, remove the pattern, compare the
otherwise-identical pair. GPT-4-Turbo as judge prefers the formatted version — **lists 86.75%,
exclamation marks 87.25%, emoji 80.5%, bold 75.75%**, where 50% would be unbiased. Adding **0.70%
biased data** to a clean reward model moves bold preference from 57.5% to 88.0%.

**Style outweighs substance in judges, by large margins.** Feuer et al., "Style Outweighs Substance",
ICLR 2025, [arXiv:2409.15268](https://arxiv.org/abs/2409.15268). Given five equally weighted explicit
criteria, each criterion's correlation with the overall verdict is **style r = 0.999** and
**conciseness r = 0.114**. In their perturbation ablation, introducing a factual error costs 13% of
the score; rewriting in an obnoxious tone costs **96%**. Wu & Aji
([arXiv:2307.03025](https://arxiv.org/abs/2307.03025)) find GPT-4 rates an answer carrying three
minor factual errors at full length (1206 Elo) **above** a fully correct short answer (1096 Elo), and
rates a factually perfect answer with grammatical errors at 771 Elo.

**The bridge is unbuilt, and we should say so rather than imply it.** These papers establish what
reward models and judges _prefer_. None establishes what a generator subsequently _writes at the
sentence level_. Length bias is not nominalisation, and "judges prefer confident-sounding answers" is
not "generators produce periodic sentences". The obvious experiment — train matched models with and
without a debiased reward, then run stylometrics on free-form output — **has not been run**, even
though ODIN, R-DPO and DivPO all have debiased reward models available. Treat §3.2b as _consistent
with_ the register story and _not evidence for_ it.

### 3.2c Hedging: the finding is subtler than "RLHF rewards swagger"

🟢 **MEASURED, and it corrects one of our own rules.** Zhou, Hwang, Ren & Sap, "Relying on the
Unreliable: The Impact of Language Models' Reluctance to Express Uncertainty", ACL 2024,
[arXiv:2401.06730](https://arxiv.org/abs/2401.06730). Nine models, 125,244 queries, regex detection
over 76 strengtheners and 105 weakeners.

- Only about **5–6% of responses contain any epistemic marker at all.**
- Among generations expressing certainty, **only 53% are correct.**
- Users rely on strengthener-marked answers about **90%** of the time — **and on plain unmarked
  statements about 90% of the time too.** The paper's phrasing: "the lack of epistemic markers is
  perceived as confident language."
- Reward-model probe, mean reward: **plain statements 4.03, strengtheners 0.82, weakeners −1.86.**
- In the human preference datasets, plain text is preferred over strengthened text **9% more often**,
  and weakeners are preferred 8–9% _less_ often. The authors: annotators "don't have a bias _for_
  certainty, rather there is a bias _against_ weakeners."

**So the mechanism is not that models are trained to sound assertive. Hedges are penalised, unmarked
declaratives win, and readers read an unmarked declarative as confident.**

That is a better account of our own observation than the one in the density note. An aphorism is an
unmarked declarative carrying no epistemic marker, which is exactly why it reads as authoritative —
and the reader's inference of confidence is _their_ inference, not a claim the sentence made. It is
also close to our misattribution argument arriving from the other side: the sentence supplies no
signal about its own epistemic status, so the reader supplies one.

Related, and both 🟢 MEASURED. Sharma et al. (Anthropic), "Towards Understanding Sycophancy in
Language Models", ICLR 2024, [arXiv:2310.13548](https://arxiv.org/abs/2310.13548), §4.1: a Bayesian
logistic regression over 23 features of 15K preference pairs ranks **"Authoritative" second of 23**
in predicting human preference and **"Concise" twenty-first**. The maximum single-feature effect is
about 6 percentage points, and the paper plots rather than tabulates the coefficients, so do not cite
a number from it. Leng et al., ICLR 2025
([arXiv:2410.09724](https://arxiv.org/abs/2410.09724)), give the controlled comparison: RLHF models,
whether PPO or DPO, are more overconfident than their SFT counterparts, and reward models prefer high
stated confidence regardless of answer quality.

### 3.3 The pretraining contribution

**MEASURED, partial.** Shaib et al., EMNLP 2024 (§2.2a): **76% of the syntactic templates found in
model text also occur in the pre-training data, against 35% for human-authored text**, and the
templates "are not overwritten by RLHF". So formulaicity has a pretraining source that post-training
does not remove — which sits alongside, not against, the instruction-tuning results. Different
properties have different origins.

**MEASURED, on em dashes specifically.** Freeburg's argument is that the em dash "is markdown leaking
into prose" — the residue of markdown-saturated training corpora. He lists his own falsifiability
problem: the claim is hard to test without models trained on markdown-minimal corpora.

**SPECULATION, and worth naming as such because it is our own instinct too.** The idea that the
register comes from over-representation of SEO, listicle or self-help prose in pretraining has **no
published study behind it at all.** The instruments now exist — Myntti et al.
([arXiv:2504.01542](https://arxiv.org/abs/2504.01542)) classified HPLT v2 English by CORE register
and trained matched 100B-token models per register — but no register census of Common Crawl has been
published. Mild counter-evidence from that same paper: _Informational Persuasion_, the
marketing-and-promotional register, was the second-worst-performing pretraining data they tested.

(A note on a paper often cited as if it settled this: Elazar et al., "What's In My Big Data?", ICLR
2024, is a **data-quality audit, not a register analysis**. It reports duplication, PII and
contamination. It does not give genre proportions.)

### 3.4 The "delve comes from Nigerian English annotators" claim

**FOLKLORE, traced to a single uncited sentence, and contradicted by the only public data.** This is
worth documenting properly because it is the cleanest example in this whole area of a claim that
became consensus without ever having a source.

The _measured_ half is solid. Kobak, González-Márquez, Horvát & Lause, "Delving into LLM-assisted
writing in biomedical publications through excess vocabulary", _Science Advances_ 11(27), 2025
([arXiv:2406.07016](https://arxiv.org/abs/2406.07016)), applied an excess-vocabulary method borrowed
from excess-mortality epidemiology to 15M+ PubMed abstracts. "Delves" has an excess ratio of **28.0**;
at least **13.5% of 2024 abstracts** show LLM processing. Their most interesting finding for us is
not about delve at all:

> The excess vocabulary during the Covid pandemic consisted almost entirely of **content words**
> (such as respiratory, remdesivir, etc.), whereas the excess vocabulary in 2024 consisted almost
> entirely of **style words**.

454 excess words in 2024, **379 of them style words, 66% verbs**. The 2024 style signal is roughly
double the Covid content-word signal.

The _causal_ half has no source. Traced: the hypothesis originates in one sentence of Alex Hern's
_Guardian_ TechScape column, 16 April 2024 — "In Nigeria, 'delve' is much more frequently used in
business English than it is in England or the US" — with **no citation, corpus, link or data**. Every
downstream repetition leads back to it.

Against it: **Ouyang et al.'s InstructGPT paper, Appendix B.3, Table 12**
([arXiv:2203.02155](https://arxiv.org/abs/2203.02155)), the only public labeler demographics, surveyed
19 labelers — Filipino 22%, Bangladeshi 22%, American 17%, then several at 5% each. **Zero Nigerians.**
Juzek & Ward's COLING 2025 paper cites Hern by name and tests the hypothesis against the ICE corpus:
"Our initial analysis of ICE does not support this hypothesis." (Honest caveat: ICE is ~1M words per
variety and "delve" runs at 1–3 per million, so that single-word test is underpowered. GloWbE, at
1.9bn words including Nigeria, is the right instrument and nobody has used it.)

A conflation worth correcting: the TIME reporting on Sama's Kenyan workers is routinely cited as
support. Those workers were doing **toxicity labelling for a safety classifier**, not ranking response
quality for a preference model. Only the latter could plausibly shape writing style.

**Verdict: "delve is overused" is robustly measured. "Because Nigerian annotators" is one uncited
newspaper sentence, contradicted by the only public demographic data. Do not repeat it.** Juzek &
Ward's own proposed mechanism is different and explicitly speculative — rushed evaluators judging on
surface word presence rather than content.

### 3.5 What we could not establish about origins

Full list in §8. The short version: **no paper operationalises "the LLM register" as a construct and
traces it to a specific training signal.** The stylometric literature measures _that_ LLM prose
differs and _how_. The RLHF literature measures _what reward models prefer_. Nothing connects a
specific reward-model bias to a specific stylistic marker in generated prose, and the obvious
experiment — debias the reward, then run stylometrics on the output — has not been run despite the
debiased reward models existing.

One further complication worth carrying, because it cuts against the simple "aligned models converge
on the same words" story. Guo, Shang & Clavel
([arXiv:2412.10271](https://arxiv.org/abs/2412.10271), TACL) find across six base/instruct pairs that
instruction-tuned versions show **higher lexical diversity** than their base counterparts while
showing **reductions in syntactic and semantic diversity**. The convergence is structural, not
vocabulary-level. Vocabulary richness actually rises.

And the mechanism behind diversity collapse is genuinely contested — typicality bias in the
preference data (Zhang et al.'s Verbalized Sampling fits a typicality weight of α̂ = 0.57 ± 0.07,
p < 10⁻¹⁴, on 6,874 correctness-matched HelpSteer pairs), reverse-KL mode-seeking, cross-entropy SFT
itself, and the chat template's structural tokens are four live candidates. Any account presenting
"RLHF causes mode collapse" as a settled single-mechanism story is overclaiming.

---

## 4. Prior art for the content of the guidance

Every one of our five mechanisms has an established name. Three of them have a name that is better
than ours. Two of our rules are contradicted by the sources they descend from.

### 4.1 The mechanism table, renamed

| #   | Our name                   | Established name                                                                                                             | Primary source                                                                                               |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Periodic structure         | **Periodic sentence / periodic style** (Gk. _lexis katestrammene_, against _lexis eiromene_, the running or strung-on style) | Aristotle, _Rhetoric_ III.9 · Williams, _Style_ 11e Lesson 10 calls it "periodic or suspended"               |
| 2   | Center-embedding           | **Center-embedding**; in the prose-advice tradition, **subject–verb separation**                                             | Gopen & Swan 1990 principle 1 · Williams, _Style_ Lesson 10 "Avoid interrupting the subject-verb connection" |
| 3   | Nominal style              | **Nominalization**; popularly **"zombie nouns"**                                                                             | Williams, _Style_ Lesson 3 · Helen Sword, _Stylish Academic Writing_ (Harvard UP, 2012)                      |
| 4   | Abstraction stacking       | **Metaconcepts** — "concepts about concepts"                                                                                 | Pinker, "Why Academics Stink at Writing"                                                                     |
| 5   | Undeclared compression     | **Gnome** / _sententia_ (the form) + **chunking** under the **curse of knowledge** (the failure)                             | Aristotle, _Rhetoric_ II.21 1394a · Pinker, ibid.                                                            |
| 6   | _(missing from our table)_ | **Present participial clause**, sentence-final                                                                               | Reinhart et al. PNAS 2025 · `WP:SUPERFICIAL`                                                                 |

**Adopt 1, 2, 3 as-is** — they are our names already, and they are correct.

**Adopt "metaconcepts" for mechanism 4.** Pinker names the exact thing: "concepts about concepts,
such as approach, assumption, concept, condition, context, framework, issue, level, model,
perspective, process, prospect, role, strategy, subject, tendency, and variable." That list is a
ready-made word list for `measure.ts`, which currently has no check for mechanism 4 at all. There is
also a collision to avoid: **"noun stack" / "noun string" already means something else** in style
guides (adjacent nouns, "prejudice-reduction model"), which is not what we mean by abstraction
stacking.

**Mechanism 5 is our best result and it is 2,300 years old.** Aristotle, _Rhetoric_ II.21, 1394a,
defines _gnome_ as maxims being "the premises or conclusions of enthymemes without the syllogism" —
a maxim becomes a full enthymeme "when the why and wherefore are added." That is our definition,
exactly: a short memorable phrase standing in for an argument that has been removed. Silva Rhetoricae
defines _gnome_ and _sententia_ identically as "short, pithy sayings"
([gnome](http://rhetoric.byu.edu/Figures/G/gnome.htm),
[sententia](http://rhetoric.byu.edu/Figures/S/sententia.htm)).

The rhetorical tradition names the _form_ but not the _failure mode_. For the failure mode, Pinker's
**chunking** is exact:

> To work around the limitations of short-term memory, the mind can package ideas into bigger and
> bigger units, which the psychologist George Miller dubbed "chunks."
>
> A failure to realize that my chunks may not be the same as your chunks can explain why we baffle
> our readers with so much shorthand, jargon, and alphabet soup.

That is our acronym-versus-aphorism argument in someone else's words, and it arrives at the same
place: shorthand, jargon and alphabet soup are the same phenomenon as the compressed phrase. The
umbrella is the **curse of knowledge**, coined in Camerer, Loewenstein & Weber (1989),
_Journal of Political Economy_ 97(5):1232–1254
([PDF](https://www.cmu.edu/dietrich/sds/docs/loewenstein/CurseknowledgeEconSet.pdf)) and MEASURED
there and in Newton's 1990 tappers-and-listeners study. Pinker's gloss: "a difficulty in imagining
what it is like for someone else not to know something that you know."

Gopen & Swan reach the same diagnosis independently: "Often this happens when the connections are so
clear in the writer's mind that they seem unnecessary to state."

**Do not reach for "enthymeme."** The Stanford Encyclopedia entry explicitly rejects the popular
"suppressed premise" reading
([source](https://plato.stanford.edu/entries/aristotle-rhetoric/enthymeme-inference.html)). _Gnome_
is defensible; _enthymeme_ invites correction.

**What our vocabulary keeps.** The acronym-versus-aphorism framing — that an acronym _announces_ its
compression and an aphorism hides it, so the reader misattributes the confusion to themselves — is
not in any source we found. Pinker gets to chunking and stops at "we baffle our readers." The
misattribution step, and the practical test that follows from it ("would this sentence be improved
by being an acronym?"), appear to be ours. **Keep them, and now cite Pinker underneath.**

### 4.2 Gopen & Swan: the closest existing statement of mechanisms 1–3

George D. Gopen & Judith A. Swan, "The Science of Scientific Writing", _American Scientist_ 78(6),
1990, pp. 550–558. [JSTOR](https://www.jstor.org/stable/29774235) ·
[PDF](https://www.gatsby.ucl.ac.uk/~pel/misc/gopen_swan.pdf)

Their seven structural principles, verbatim:

> 1. Follow a grammatical subject as soon as possible with its verb.
> 2. Place in the stress position the "new information" you want the reader to emphasize.
> 3. Place the person or thing whose "story" a sentence is telling at the beginning of the sentence,
>    in the topic position.
> 4. Place appropriate "old information" (material already stated in the discourse) in the topic
>    position for linkage backward and contextualization forward.
> 5. Articulate the action of every clause or sentence in its verb.
> 6. In general, provide context for your reader before asking that reader to consider anything new.
> 7. In general, try to ensure that the relative emphases of the substance coincide with the relative
>    expectations for emphasis raised by the structure.

Principle **1** is our mechanism 2. Principle **5** is our mechanism 3. On subject–verb separation:

> Readers expect a grammatical subject to be followed immediately by the verb. Anything of length
> that intervenes between subject and verb is read as an interruption, and therefore as something of
> lesser importance.

**PRESCRIPTIVE ASSERTION, and they say so themselves:**

> None of these reader-expectation principles should be considered "rules." Slavish adherence to
> them will succeed no better than has slavish adherence to avoiding split infinitives or to using
> the active voice instead of the passive.

### 4.3 Williams, _Style_

PRESCRIPTIVE ASSERTION throughout; Williams offers no measured evidence.

Editions differ enough to matter for citation. _Style: Toward Clarity and Grace_ (Chicago, 1990,
ISBN 978-0-226-89915-2) has ten chapters; _Style: Lessons in Clarity and Grace_ 11e (Pearson, 2014,
ISBN 978-0-321-89868-5) has twelve lessons. The 11th-edition headings are **"Principle of Clarity 1:
Make Main Characters Subjects"** and **"Principle of Clarity 2: Make Important Actions Verbs."** His
primary terms are **characters** and **actions**.

- **Nominalization** — Lesson 3, pp. 32–33, with a named procedure "Diagnosis and Revision:
  Characters and Actions" and five common patterns (pp. 36–37).
- **Old before new** — Lessons 5 and 6; he calls it "this old-before-new principle" and uses
  **stress** (Lesson 6, §"Another New Term: Stress", p. 83). Note that **"topic position" as a fixed
  phrase is Gopen's, not Williams's**.
- **Subject–verb separation** — Lesson 10 ("Shape"), _not_ a clarity lesson. "Rule of Thumb 1: Get to
  the subject quickly", "Rule of Thumb 2: Get to the verb and object quickly", with the bullet
  "Avoid interrupting the subject-verb connection" (p. 147).

Free, citable summaries that credit both Williams and Gopen: Duke's Scientific Writing Resource
(CC BY-NC-SA),
[ten principles](https://sites.duke.edu/scientificwriting/williams-ten-principles-for-writing-clearly/)
and [subjects and actions](https://sites.duke.edu/scientificwriting/lesson-1-subjects-and-actions/);
Boston University,
[sentence clarity](https://www.bu.edu/teaching-writing/resources/sentence-clarity-characters-and-actions/).

### 4.4 Vale and proselint: prior art for the _tool_, not just the guidance

We should have checked this before writing `measure.ts`.

**[Vale](https://docs.vale.sh/topics/styles)** is the de facto prose linter for documentation CI. It
has eleven extension-point types, three of which matter to us:

- `existence` / `substitution` — regex rules, which is what our `TICS` array is.
- `sequence` — pattern ordering **with part-of-speech tagging**, which is what mechanisms 1, 2 and 6
  actually need and which regex cannot express.
- `metric` — "Check the readability (or other metrics) of your content using custom formulas",
  which could express a p90 sentence-length gate.

It ships style packages for Google's and Microsoft's developer documentation style guides, so
adopting it would import §4.6's rules for free rather than re-deriving them.

**[proselint](https://github.com/amperser/proselint)** implements 60+ checks drawn from Garner,
Pinker, Orwell, Strunk & White and others: clichés, archaisms, **hedging language**, weasel words,
jargon, redundancy. It does **not** check nominalisations, passive voice or sentence length.

**Assessment.** `measure.ts` does one thing neither tool does, and it is the thing our own note
argued was the point: it reports an **aggregate distribution** — p90 sentence length, nominalisations
per 100 words, a ranked minimap across files — rather than firing per-sentence diagnostics. Vale is
a linter; a linter answers "is this line bad", and our whole §7 argument is that the signal is a
distribution invisible from inside any one sentence. So the tool is not redundant. But the
regex-tic half of it duplicates Vale's `existence` rules exactly, and Vale's `sequence` type with
POS tagging would let us check subject–verb distance, which we currently cannot. **Worth
considering: keep `measure.ts` for the aggregate, port the tic list to a Vale style for the
per-sentence half.**

### 4.5 Where our characterisation is wrong

**Three independent primary sources reject word-count sentence limits.** This is the most direct
contradiction the search turned up, and it hits both `plainspoken.md` ("Anything past roughly 30
words should be two sentences") and `measure.ts` (`LONG = 30`, and the non-zero exit when p90 > 28).

Gopen & Swan:

> The creators of readability formulas would have us believe there exists some fixed number of words
> (the favorite is 29) past which a sentence is too hard to read. We disagree… We have seen 10-word
> sentences that are virtually impenetrable and… 100-word sentences that flow effortlessly.

Their replacement criterion is structural: "A sentence is too long when it has more viable candidates
for stress positions than there are stress positions available."

Williams reaches the same place with a different word. His term for the defect is **sprawl**, and he
demonstrates a 36-word sentence that does not sprawl (and, in the 1990 book, an 18-clause Hooker
sentence).

Aristotle, on the period: it must be "not too big to be taken in at a glance", and if too long the
hearer is "left behind" — a bound on _suspension_, not on words.

**What to do.** Keep the length measurement; it is a cheap proxy and our own note already says to
report it rather than target it. But `plainspoken.md`'s "past roughly 30 words should be two
sentences" states as a rule the thing all three sources explicitly deny. Reword it as a **flag**, not
a threshold: long sentences are where sprawl usually lives, so look there. And the `p90 > 28`
non-zero exit is now on weaker ground than it was — it is defensible as a _habit_ signal, which is
how the code comment already justifies it, but it should not be described as a correctness gate.

**Periodic structure is not a defect; unbounded suspension is.** Aristotle _prefers_ the periodic
style, calling it "satisfying and easy to follow… the hearer always feels that he is grasping
something and has reached some definite conclusion", and says it aids memory. Williams gives an
explicit exception in Lesson 10 for the "periodic or suspended" style, where piled-up subordinate
clauses heighten a concluding main clause. He also notes the reversal for mechanism 3: a
nominalization that damages a sentence in subject position gives a satisfying climactic thump at the
_end_.

**So mechanisms 1 and 3 are position-dependent, not uniformly costly**, and our documents state them
as uniform. Recommend renaming mechanism 1 to something like **unbounded suspension**, and adding
Williams's qualification to mechanism 3.

**Nominalization has a documented set of legitimate uses.** Williams's Lesson 3 has a section "A
Qualification: Useful Nominalizations" (pp. 42–43) listing four cases where the nominalization should
stay — including **when it names a concept already familiar to the reader**. That is close to being
the inverse of our mechanism 5: a nominalization that names a shared chunk is honest compression, and
one that names an unshared chunk is not. `plainspoken-edit` currently has no such exemption and will
over-flag.

### 4.6 Developer-documentation style guides: fewer numbers than their reputation suggests

All PRESCRIPTIVE ASSERTION. None of these guides cites a study for any threshold.

**Google.** The "fewer than 26 words" figure is real but lives on the
[accessibility page](https://developers.google.com/style/accessibility): "Use shorter sentences. Try
to use fewer than 26 words per sentence." The
[translation/global-audience page](https://developers.google.com/style/translation) says "Write
shorter sentences" with **no number**, and gives the one numeric noun rule: "don't use more than two
nouns as modifiers of another noun." It also states our mechanism 2 directly — "Try to keep the main
subject and verb as close to the beginning of the sentence as possible."

[Active voice](https://developers.google.com/style/voice) is nuanced rather than absolute, with
explicit exceptions: to emphasise an object, to de-emphasise an actor ("Over 50 conflicts were
found" is preferred over "You created over 50 conflicts"), or when responsibility does not matter.

The entire [sentence-structure page](https://developers.google.com/style/sentence-structure) is one
rule, and it is our "point first" rule inverted for instructions: "If you want to tell the reader to
do something, try to mention the circumstance, conditions, or goal before you provide the
instruction. Mentioning the circumstance first lets the reader skip the instruction if it doesn't
apply."

Google's actual anti-nominalisation material is in **Technical Writing One**, not the style guide:
[short sentences](https://developers.google.com/tech-writing/one/short-sentences) gives "Focus each
sentence on a single idea, thought, or concept" and the de-nominalising example "An input value
greater than 100 causes the triggering of logging." → "An input value greater than 100 triggers
logging."

**Microsoft.** [Top 10 tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice):
#1 "Use bigger ideas, fewer words"; #5 "Be brief — prune every excess word"; #10 "Avoid weak phrasing
like _there is_, _there are_, and _there were_." The brand voice principles are "Warm and relaxed",
"Crisp and clear", "Ready to lend a hand". Its one measurable sentence rule is on the
[global writing tips page](https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips):
"Avoid linking more than three phrases or clauses by using coordinate conjunctions such as _and_,
_or_, or _but_. Better yet, avoid linking more than two." Also "Avoid modifier stacks" and "Use words
ending in _-ing_ carefully."

**Red Hat** is the most measurable guide surveyed, but its numbers govern headings (3–11 words) and
short descriptions (50–300 characters), not sentences. It is also the only one with a genuinely
useful nuance: it _permits_ passive voice in prerequisites.
[Supplementary style guide](https://redhat-documentation.github.io/supplementary-style-guide/)

**Apple** has essentially no sentence-level rules. **IBM Style** is behind an IBMid gate and its rule
text is not publicly retrievable.

**Diátaxis does give prose-level guidance, but only as per-type sentence patterns, and it publishes
no numeric rule at all.** The four "The language of…" sections are the whole of it — how-to guides
"Use conditional imperatives"
([source](https://diataxis.fr/how-to-guides/#the-language-of-how-to-guides)); tutorials use
first-person plural; reference "State facts about the machinery and its behaviour". Our density note
quotes it correctly: [diataxis.fr/tutorials](https://diataxis.fr/tutorials/) has "Ruthlessly minimise
explanation" as a section heading, glossed "A tutorial is not the place for explanation."

It also rejects measurement outright, for exactly the qualities we are trying to measure
([diataxis.fr/quality](https://diataxis.fr/quality/)): "Instead of taking measurements, we must make
judgements."

**That is a direct challenge to `measure.ts`, from the framework our density note maps onto.** The
defensible reply is the one our own skill already makes: the measurement is a minimap that decides
_where to read_, and the judgment stays with the reader. Say it explicitly. A reader who knows
Diátaxis will notice the tension.

**Consequence for us.** Our 30-word threshold has no external authority. Google's 26 is the closest
published figure and is framed as accessibility. Cite it as an adopted convention (§4.5).

### 4.7 Controlled languages: ASD-STE100, and the one measured result

**PRESCRIPTIVE BY CONSTRUCTION.** These are engineering constraints for safety-critical maintenance
procedures read by non-native speakers. Nothing in the specification cites a study for the choice of
20 words over 25.

The specification is free: [ASD-STE100 Issue 9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
(2025-01-15), 53 writing rules in 9 sections. The ones that bear on our mechanisms:

| Rule              | Text                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| 5.1 (procedural)  | "Write short sentences. Use a maximum of **20 words** in each sentence."                                    |
| 6.3 (descriptive) | "Write short sentences. Use a maximum of **25 words** in each sentence."                                    |
| 6.6               | "Make sure that no paragraph has more than **six sentences**."                                              |
| 2.1               | "Write multi-word nouns of no more than **three words**."                                                   |
| 3.6               | "Use the active voice. In descriptive writing, you can use the passive voice only if the agent is unknown." |
| 3.7               | Use an approved verb for an action, **not a nominalization**.                                               |

The dictionary is officially ~900 approved words, one meaning and one part of speech each. (A direct
count of Issue 9 gives roughly 800 approved and 1,290 unapproved; the discrepancy is unresolved and
recorded rather than smoothed.)

**A correction to our own reading.** "One topic per sentence" is not an STE rule. Rule 5.2 is one
_instruction_ per sentence; Rule 6.5 is one _topic_ per **paragraph**. And "-ing" is not banned —
Rule 3.5 permits it as a technical noun or as a modifier within one.

**The measured evidence base for controlled language is two significant studies and one null.** Kuhn
2014's survey ([_Computational Linguistics_ 40(1)](https://aclanthology.org/J14-1005.pdf)) is the
authority for that count. The best result is worth knowing because it is counter-intuitive:

- 🟢 **Chervak & Drury 2003** ([doi:10.3233/oer-2003-3204](https://doi.org/10.3233/oer-2003-3204))
  measured **task error rates** on real aircraft maintenance work. "Task errors were reduced with
  Simplified English but increased with the hybrid version… Simplified English can be recommended,
  but hybrid instructions should be avoided." **Partial adoption was worse than no adoption.**
- ⚠️ O'Brien & Roturier 2007
  ([MT Summit](https://aclanthology.org/2007.mtsummit-papers.46.pdf)): noun-cluster rules disagreed
  across studies, and rewriting into active voice **degraded** machine-translation output in 3 of 12
  cases. The rules with measured effect are the mechanical ones — spelling, punctuation, sentence
  length, dangling pronouns — not the stylistic ones.
- ⚠️ **Caterpillar Fundamental English was discontinued in 1982** because its guidelines "were not
  enforceable". Its successor inverted the design: roughly 70,000 precise terms plus an enforcing
  tool, instead of under 1,000 vague terms plus goodwill.

**The Chervak & Drury result is the one to carry over, and it is uncomfortable for us.** A style
applied inconsistently across a corpus performed _worse_ than not applying it. Our current state is
exactly that: a `Plainspoken` output style that affects only newly written text, over a wiki written
in the old register. The finding is from maintenance procedures and does not transfer cleanly, but it
is a reason to run the edit pass over the existing corpus rather than let the two registers sit side
by side indefinitely.

**The Caterpillar result is the same argument our own three-layer model makes.** Unenforceable
guidance was abandoned; the replacement was a large precise vocabulary plus a checker. That is layer
3 losing to layer 2, measured in industry over a decade, and it is the closest external corroboration
of this project's own thesis that we found anywhere in this search.

### 4.8 Plain language: the movement's own systematic review says its rules are unevidenced

**The question "is there measured evidence that plain language improves comprehension" has a
published answer, and the answer is mostly no.**

🟢 **MEASURED — systematic review.** Stoll, Kerwer, Lieb & Chasiotis (2022), "Plain language
summaries: A systematic review of theory, guidelines and empirical research", _PLoS ONE_
17(6):e0268789, [doi:10.1371/journal.pone.0268789](https://doi.org/10.1371/journal.pone.0268789).
7,714 records screened, 90 included, 33 empirical. Verbatim:

> We did not find empirical evidence to support most of the criteria we identified in the PLS
> writing guidelines. We conclude that although considerable work on establishing and investigating
> PLSs is available, empirical evidence on criteria for high-quality PLSs remains scarce.

🟢 **MEASURED — and the split is preference versus comprehension.** Two randomised trials from the
same group:

- **Stallwood et al. 2023**, _JAMA Pediatrics_ 177(9):956–965,
  [doi:10.1001/jamapediatrics.2023.2686](https://doi.org/10.1001/jamapediatrics.2023.2686), N=268.
  **Null on comprehension** — "No significant difference was found in understanding scores" —
  positive on accessibility, satisfaction and preference.
- **Sayfi et al. 2024**, _J Clin Epidemiol_ 165:111219,
  [doi:10.1016/j.jclinepi.2023.11.009](https://doi.org/10.1016/j.jclinepi.2023.11.009), N=488. About
  a 20-point gain on one test document, **null on the other**.

The honest reading: plain-language rewriting can produce large comprehension gains but does so
inconsistently, depending on how bad the original was. **Preference gains are consistent throughout.**

**This is a finding we should hold onto for our own work.** The reader who reported rereading our
wiki was reporting a preference-and-effort experience, and that is the outcome plain language
reliably improves. Comprehension gains are the claim that does not replicate. Our density note is
careful about this already — it says the prose is accurate and expensive, not wrong — and this
literature supports that separation.

🟢 **MEASURED — the studies that do hold up are about structure, not length.** Charrow & Charrow
(1979), _Columbia Law Review_ 79(7):1306,
[doi:10.2307/1121842](https://doi.org/10.2307/1121842) — paraphrase testing with real jurors,
establishing that nominalisations, embeddings and misplaced phrases measurably depress comprehension.
And Martínez, Mollica & Gibson, whose 2023 PNAS paper
([doi:10.1073/pnas.2302672120](https://doi.org/10.1073/pnas.2302672120)) shows **lawyers themselves**
recall legalese worse and rate simplified contracts equally enforceable.

**The legislation is weaker than its reputation.** The
[Plain Writing Act of 2010](https://www.govinfo.gov/content/pkg/PLAW-111publ274/html/PLAW-111publ274.htm)
defines plain writing circularly — "clear, concise, well-organized, and follows other best practices
appropriate to the subject or field and intended audience" — with no metric and no testing
requirement; SEC. 3(2)(C) exempts regulations, and SEC. 6 forecloses judicial review.

**ISO 24495-1:2023's four principles are reader-outcome criteria, not sentence rules.** Readers get
what they need (_relevant_); can easily find it (_findable_); can easily understand it
(_understandable_); can easily use it (_usable_).
[ISO catalogue](https://www.iso.org/standard/78907.html) — paywalled, verified second-hand from two
independent sources. **Anyone citing ISO 24495-1 to justify a sentence-length cap is over-reading
it.**

**The US federal guidelines give no number.** "Write short sentences" is stated structurally — "Express
only one idea in each sentence" — not numerically. (Note: `plainlanguage.gov` was retired after OMB
memo M-23-22 and now redirects to [digital.gov](https://digital.gov/guides/plain-language); the
original content survives in the read-only archive at
[GSA/plainlanguage.gov](https://github.com/GSA/plainlanguage.gov).) Two of its pages are direct hits
on our mechanisms: "Keep the subject, verb, and object close together" (mechanism 2) and "Avoid hidden
verbs", where **"hidden verbs" is PLAIN's name for nominalisation** (mechanism 3).

**Where the numbers actually come from, and why one of them should not be repeated:**

| Source                 | Target        | Basis                                     |
| ---------------------- | ------------- | ----------------------------------------- |
| GOV.UK                 | 25 words      | ⚠️ see below                              |
| Plain English Campaign | 15–20 average | "Most experts would agree…" — no citation |
| EU DGT                 | 20 average    | —                                         |
| US federal             | none          | structural rule only                      |

⚠️ **The GOV.UK number rests on an effectively unsourced claim.** Its
[stated basis](https://insidegovuk.blog.gov.uk/2014/08/04/sentence-length-why-25-words-is-our-limit/)
is that at 14-word average sentences readers understand more than 90% and at 43 words comprehension
drops below 10%, attributed to a trade-press consultancy with no identifiable sample, instrument or
corpus. **This is the single most-quoted number in plain-language advocacy and it is unverifiable.**
Treat anything downstream of it as unsupported.

The EU's [How to write clearly](https://op.europa.eu/s/n9L3) is the most sophisticated of the four.
It frames its ten items as "hints, not rules", contains a centre-embedding rule ("Don't bury important
information in the middle of the sentence") and a nominalisation rule ("Cut out excess nouns"), and
uniquely warns that splitting sentences can destroy cohesion: "remember to include link words… so the
coherence doesn't get lost."

**That last warning applies directly to `plainspoken-edit`.** Our rewrites split long sentences. The
mechanism by which splitting _harms_ comprehension — removing the connective ("because", "however",
"unless") and forcing the reader to infer the logical relation — is the same mechanism by which
optimising a readability score degrades text. The skill should require that a split preserves the
connective, and it currently does not say so.

---

## 5. Corrective instruction: what is actually known

This is the question we had least basis for, and the honest headline is that **nobody has studied
the thing we are doing.** There is no work comparing a pre-writing style guide against a post-hoc
editorial pass for prose register. What exists is a set of adjacent results that constrain the
design, and they are worth having.

### 5.1 Negative instruction is weak — and this one is genuinely evidenced

The folk wisdom is right, and it is better supported than most folk wisdom in this area.

**MEASURED — inverse scaling on negated prompts.** Jang, Ye & Seo, "Can Large Language Models
Truly Understand Prompts? A Case Study with Negated Prompts",
[arXiv:2209.12711](https://arxiv.org/abs/2209.12711) (2022). Task performance on negated prompts
gets _worse_ as models get larger — an inverse scaling law that held for pretrained models,
InstructGPT, few-shot prompting, and models fine-tuned on negated prompts. Old, pre-modern models,
and the tasks are classification rather than composition. Cite it as evidence that negation is a
structurally hard input, not as a measurement of current models writing prose.

**MEASURED — explicit prohibition of a style tic fails on some models.** Freeburg's em-dash study
(§2.4) is the closest thing to a direct test of our case. "Do not use em dashes", appended to a
markdown-suppression instruction, took GPT-4.1 from 9.10 to 3.86 per thousand words and DeepSeek V3
from 4.75 to 1.57. Neither reached zero. Claude Opus 4.6 and GPT-5.4 did. **Prohibition of a named,
regex-visible, single-token habit was partially ignored by half the models tested.** Our habits are
harder to name than an em dash.

**MEASURED — but instruction _does_ work on the construction we care about most.** Boggia's
mitigation experiment (§2.1) is the counterweight and should not be buried. A one-line instruction
cut epanorthosis density by **70–72%** in Italian (oratory 39.6 → 10.9, p=0.03; argument 56.9 →
17.2, p=0.004). Same caveats as the rest of that paper — pilot scale, single author — but it is the
only direct measurement of instructing a model out of "not X, but Y", and the effect was large.

**PRESCRIPTIVE, from the vendor.** Anthropic's
[prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
opens its formatting-control section with "**Tell Claude what to do instead of what not to do**",
worked as: instead of "Do not use markdown in your response", try "Your response should be composed
of smoothly flowing prose paragraphs." No study is cited.

**Worth noticing, because it is the most useful thing in that page:** the sample prompt Anthropic
supplies four paragraphs later, for the exact task of suppressing formatting, is itself full of
negative instruction — "Avoid using **bold** and _italics_", "DO NOT use ordered lists", "NEVER
output a series of overly short bullet points". The vendor's own advice and the vendor's own
worked example disagree. Read that as the practical position: **positive specification carries the
register, and a short list of named prohibitions carries the specific tics.** That is, coincidentally
or not, the shape `plainspoken.md` already has — "Rules" positive, "Habits to drop" negative. No
change indicated.

### 5.2 Style instruction does not fix the grammatical signature

**MEASURED, and this is the single most load-bearing result in the report.** Reinhart et al. (§2.2)
prompted instruction-tuned models to "write 500 more words in the same style, tone, and diction" as
a supplied human text. The grammatical features did not move. Their finding: the models "struggle to
match the stylistic variation present in human communication", and the deviations "persisted across
all contexts and genres tested". The paper's blunt version is "**instruction tuning appears to make
the model output less human, not more**", and the lexical _and_ grammatical tells are attributed to
instruction tuning rather than to the pretraining corpus.

This is direct support for the hypothesis in §7 of the density note — that a style rule read once
competes badly against the model's prior — with one sharpening we should adopt. It is not that
priming is weak in general. It is that **priming was tested against exactly our targets
(nominalisation rate, participial clauses, information density) and did not move them.** That is a
stronger claim than we made, and it is somebody else's measurement.

The correct inference is not "abandon the output style". Boggia's 70% reduction shows a _named,
specific_ construction responds to instruction. Reinhart's null shows a _diffuse register property_
does not. `plainspoken.md` contains both kinds of rule. Expect the named tics ("not X, but Y", the
em-dash pivot, "which is exactly the…") to respond, and expect the distributional properties
(nominalisation density, sentence-length tail) not to. **The review pass is what covers the second
kind, and that division is now evidenced rather than assumed.**

### 5.3 Rules versus examples versus rubrics

Thin, and the one direct comparison is from an adjacent domain.

**MEASURED, adjacent domain.** Bohr, "Show and Tell: Prompt Strategies for Style Control in
Multi-Turn LLM Code Generation", [arXiv:2511.13972](https://arxiv.org/abs/2511.13972) (Nov 2025,
preprint). Compared instruction-based prompts, example-based prompts, and both combined, over 160
paired programs in a two-turn generate-then-revise protocol. Results:

| Strategy          | Initial effect | Held under revision |
| ----------------- | -------------- | ------------------- |
| Combined          | strongest      | strongest           |
| Instructions only | large          | moderate            |
| Examples only     | modest         | **none**            |

Its stated conclusion is that "initial prompt effectiveness and expansion discipline are separate
aspects" of prompt design. Code style, not prose, and a preprint — but it is the only head-to-head
we found, and it says examples alone are the weakest option and combined is best. `plainspoken.md`
is already rules-plus-worked-examples. No change indicated.

**MEASURED — more rules is not better.** Jaroslawicz, Whiting, Shah & Maamari, "How Many
Instructions Can LLMs Follow at Once?", [arXiv:2507.11538](https://arxiv.org/abs/2507.11538) (July
2025). IFScale: 500 keyword-inclusion instructions in a business-report writing task, 20 frontier
models across seven providers. **The best models reach only 68% accuracy at 500 instructions**, and
the paper identifies a **primacy bias** — earlier instructions are followed preferentially.
Keyword inclusion is a much easier target than a style register, so treat the numbers as a ceiling.
The design implication is direct: a style document should be short and front-load what matters.
`plainspoken.md` is 102 lines with six rules and four named habits. That is on the right side of
this finding, and it is an argument against growing it.

**Not found.** No study comparing prose style rules against a scored rubric for controlling
generation. No study on whether a style rubric produces better generation than a style narrative.

### 5.4 Post-hoc editing versus generation-time constraint

No head-to-head exists for prose register. Four results bear on it.

**MEASURED, supportive.** Bai et al., "Constitutional AI: Harmlessness from AI Feedback",
[arXiv:2212.08073](https://arxiv.org/abs/2212.08073) (2022). The canonical "review pass against a
written list of principles" architecture, and directly ancestral to what `plainspoken-edit` does:
sample, critique against a written principle, revise. Their reported finding that **generating an
explicit critique improves the result over generating a revision directly** is the closest published
support for the shape of our skill — naming the mechanism before rewriting is not ceremony.

**MEASURED, supportive.** Madaan et al., "Self-Refine: Iterative Refinement with Self-Feedback",
[arXiv:2303.17651](https://arxiv.org/abs/2303.17651) (NeurIPS 2023). Generate, self-feedback,
refine, up to four iterations, one model throughout. About **20% absolute improvement on average**
across seven tasks over single-pass generation, preferred by humans and automatic metrics.

**MEASURED, the important caveat.** Huang et al., "Large Language Models Cannot Self-Correct
Reasoning Yet", [arXiv:2310.01798](https://arxiv.org/abs/2310.01798) (ICLR 2024). _Intrinsic_
self-correction — no external feedback — fails on reasoning, and can make results worse. The
distinction that matters for us is **whether the review pass has an external signal**. Ours does:
`measure.ts` runs first and reports a distribution the model did not produce. That is the difference
between the Self-Refine setting and the Huang setting, and it is why the skill's instruction to run
the measurement before reading anything is load-bearing rather than stylistic.

**MEASURED, the sobering one.** Baumler, Bao, Nghiem, Yang, Carpuat & Daumé III, "Can You Make It
Sound Like You? Post-Editing LLM-Generated Text for Personal Style",
[arXiv:2604.24444](https://arxiv.org/abs/2604.24444) (April 2026). 81 participants manually revised
LLM drafts toward their own voice. Editing moved the text measurably toward their unassisted
writing — and **the edited text still sat closer in style to LLM output than to their own**, with
_reduced_ stylistic diversity. Participants perceived their edits as authentic to their voice while
measurable LLM traces persisted.

That last result is the one to act on. **A reviewer's sense that they fixed a document is not
evidence that they did.** It is an argument for keeping `measure.ts` as the arbiter of the aggregate
and reporting its numbers before and after an edit pass, rather than letting the reviewer's judgment
close the loop.

### 5.5 LLM-as-judge for style: use it, but not alone and not on itself

**MEASURED — judges are biased toward the register we are trying to remove.** Dubois, Galambosi,
Liang & Hashimoto, "Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators",
[arXiv:2404.04475](https://arxiv.org/abs/2404.04475) (2024). Regressing out length raised Spearman
correlation with human preference from 0.94 to 0.98, which is a measure of how much of the raw
signal was length.

**MEASURED — judges prefer their own writing.** Panickssery, Bowman & Feng, "LLM Evaluators
Recognize and Favor Their Own Generations",
[arXiv:2404.13076](https://arxiv.org/abs/2404.13076) (2024). Evaluators score their own outputs
higher than others' where human annotators rate them equal, and the strength of the bias correlates
linearly with self-recognition ability.

Both matter for `plainspoken-edit`, which asks a model to judge prose that a model wrote. The
mitigation we already have is the right one: **the mechanical measurement is not a judgment**, and
the skill reads it before reading the prose. What we should not do is add an LLM-scored style rubric
and treat its number as an outcome measure.

**Not found.** No validated rubric for prose register. Work on rubric reliability is active and
unsettled — LLM judges agree with humans better on holistic than on analytic multi-trait scoring,
and judge reliability is sensitive to prompt and rubric wording — but we located nothing specific
to style register.

### 5.6 System-prompt persistence

**MEASURED.** Li, Liu, Bashkansky, Bau, Viégas, Pfister & Wattenberg, "Measuring and Controlling
Instruction (In)Stability in Language Model Dialogs",
[arXiv:2402.10962](https://arxiv.org/abs/2402.10962) (COLM 2024). Significant **instruction drift
within eight rounds** of self-chat for LLaMA2-chat-70B and GPT-3.5. Attributed to attention decay
over long exchanges. Mitigations tested: **system-prompt repetition** works better at high turn
counts; their `split-softmax` method works better early.

**MEASURED.** Laban, Hayashi, Zhou & Neville, "LLMs Get Lost in Multi-Turn Conversation",
[arXiv:2505.06120](https://arxiv.org/abs/2505.06120) (2025). Degradation across six analytical
generation tasks in multi-turn settings, driven by premature commitment and anchoring.

Neither is about style, and both concern dialog turns rather than one long document. The practical
reading is still clear: **an output style is not a stable guarantee over a long session, and
repetition is the evidenced mitigation.**

For us that is another argument for the review pass. It is also a small argument for restating the
register briefly at the point of use — in a long document's frontmatter, or in the skill invocation —
rather than relying on a system prompt set once at session start.

### 5.7 The best prior art for `plainspoken.md` is the labs' own published system prompts

This is the answer to "has anyone written corrective style instruction that works", and we missed it
because it is not in a paper.

**Anthropic publishes its production system prompts**
([release notes](https://platform.claude.com/docs/en/release-notes/system-prompts)), and they are the
most explicit anti-formulaic-style corpus in existence. They are named-tic prohibitions, in
production, at scale — exactly the shape of `plainspoken.md`'s "Habits to drop":

- Claude Sonnet 3.5: "responds directly to all human messages **without unnecessary affirmations or
  filler phrases like 'Certainly!', 'Of course!', 'Absolutely!', 'Great!', 'Sure!'**"
- Claude Opus/Sonnet 4: "**never starts its response by saying a question or idea or observation was
  good, great, fascinating, profound, excellent**, or any other positive adjective."
- Claude Sonnet 4.5 onward: "For reports, documents, technical documentation, and explanations,
  Claude should instead **write in prose and paragraphs without any lists**."
- Claude Opus 4.6 / Opus 5: "**avoids saying 'genuinely', 'honestly', or 'straightforward'**… which
  come off as disingenuous."

**Note what that last one is.** It is a banned-word list of exactly three words, shipped because those
three words are a tell. It is `plainspoken.md`'s "which is exactly the…" rule, from the vendor, and it
is strong evidence that a short enumerated list of named tics is the format that actually gets used in
production.

**The OpenAI Model Spec** ([model-spec.openai.com](https://model-spec.openai.com/), CC0) states the
same thing as policy. Under "Be clear and direct": avoid "**'purple prose,' hyperbole,
self-aggrandizing, and clichéd phrases** that do not add to the clarity of communication." Under "Be
thorough but efficient": avoid "**excessive hedging** (e.g., 'there's no one-size-fits-all
solution')".

**And the ChatGPT release notes are the closest thing to a public changelog of style corrections:**

- 16 Mar 2026: reduces "**teaser-style phrasing** (e.g., 'If you want…', 'You'll never believe…')."
- 3 Mar 2026: reduces "unnecessary dead ends, **caveats, and overly declarative phrasing**… These are
  nuanced problems that don't always show up in benchmarks."
- 28 May 2026: "fewer overly long or **bullet-heavy** responses."

**Two conclusions for us.**

First, **our approach has more prior art than the academic literature suggested — it is just
practitioner prior art.** The vendors independently converged on the same format: positive
specification for the register, plus a short enumerated list of named tics to suppress. That is what
`plainspoken.md` already is. This is the strongest available answer to "are we reinventing
something", and the answer is yes, but the thing we reinvented is a good thing that nobody wrote a
paper about.

Second, a **negative finding worth having: no em-dash instruction and no "not X, but Y" prohibition
appears in any published system prompt, model spec or constitution from any lab.** The two tics that
dominate the folklore are absent from every vendor's own corrective instruction. Our `plainspoken.md`
lists both. That is either an edge we have or a sign that they are not worth the words, and we cannot
tell which from here.

---

## 6. Measurement

Our rejection of readability formulas is correct and better supported than we knew. What we chose
instead is aimed at the wrong mechanism. Both conclusions come from the same literature.

### 6.1 Readability formulas: the critique is authoritative and comes from inside the movement

🟢 The formulas are **correlational grade-placement tools, never causal models of comprehension.**
Optimising against them can actively harm text: chopping a coherent sentence removes the connective
("because", "however", "unless") and forces the reader to infer the logical relation, which improves
the score while degrading understanding.

Primary critiques:

- **Redish**, twice, and she is cited _by_ the plain-language movement:
  [doi:10.1109/tpc.1981.6447824](https://doi.org/10.1109/tpc.1981.6447824) and "Readability formulas
  have even more limitations than Klare discusses", _ACM Journal of Computer Documentation_ 2000,
  [doi:10.1145/344599.344637](https://doi.org/10.1145/344599.344637).
- **Bruce, Rubin & Starr** (1981), "Why readability formulas fail",
  [doi:10.1109/tpc.1981.6447826](https://doi.org/10.1109/tpc.1981.6447826).
- **Bailin & Grafstein** (2016), _Readability: Text and Context_ — the linguistic-assumptions
  critique.
- **Lenzner** (2013), [doi:10.1177/0049124113513436](https://doi.org/10.1177/0049124113513436).

**Our §6 exclusion in the density note stands unchanged.** Report a grade level if someone asks;
never target it.

### 6.2 The instrument we should be using: dependency locality

🟢 **This is the strongest citation in the entire report, and it is for a mechanism we do not
measure.** Martínez, Mollica & Gibson (2022), "Poor writing, not specialized concepts, drives
processing difficulty in legal language", _Cognition_ 224:105070,
[doi:10.1016/j.cognition.2022.105070](https://doi.org/10.1016/j.cognition.2022.105070). A ~10M-word
corpus analysis plus two experiments (N=184) on **real legal prose**, not constructed stimuli:

> excerpts containing these features were recalled and comprehended at lower rates than excerpts
> without these features, even for experienced readers, and that center-embedded clauses inhibited
> recall more-so than other features

**Centre-embedding beat jargon, passive voice and non-standard capitalisation.** It is the one
mechanism in our table that is established for ordinary prose and that outperformed everything else
tested against it.

The supporting apparatus:

- **Gibson (1998)**, Dependency Locality Theory, _Cognition_ 68(1):1–76,
  [doi:10.1016/S0010-0277(98)00034-1](<https://doi.org/10.1016/S0010-0277(98)00034-1>) ·
  [PDF](https://tedlab.mit.edu/tedlab_website/researchpapers/Gibson_1998_Cogn.pdf). Integration cost
  scales with **new discourse referents intervening**, not with word count. Reading-time validation:
  Grodner & Gibson (2005).
- **Futrell, Mahowald & Gibson (2015)**, PNAS 112(33):10336–10341,
  [doi:10.1073/pnas.1502134112](https://doi.org/10.1073/pnas.1502134112). Real sentences in 37
  languages have shorter dependency lengths than structure-preserving random baselines.
- The classic constructed-stimulus work stands behind it — Miller & Isard 1964, Blaubergs & Braine
  1974 — and Gibson's methodological point is that the single/double-embedded pair is lexically and
  semantically matched, so the cost is structural rather than garden-pathing.

⚠️ **The counter-evidence, which we should carry rather than hide.** _Anti-locality_ is real:
Konieczny (2000), [doi:10.1023/A:1026528912821](https://doi.org/10.1023/A:1026528912821), found
German clause-final verbs read **faster** when a relative clause intervened; Vasishth & Lewis (2006),
_Language_ 82(4):767–794 ([PDF](https://www.ling.uni-potsdam.de/~vasishth/pdfs/Vasishth-Lewis-Language2006.pdf)),
confirmed it in Hindi. Distance produces two opposed forces — activation decay against
reactivation and anticipation — and which wins is empirical per construction and per language.
English is SVO so locality mostly holds here. **"Suspension equals cost" is not a safe universal**,
which is the second independent reason to soften our mechanism 1.

### 6.3 Surprisal, and why an LLM is a poor difficulty meter

🟢 **Very robust.** Hale (2001), [ACL](https://aclanthology.org/N01-1021/); Levy (2008),
"Expectation-based syntactic comprehension", _Cognition_
([PDF](https://www.mit.edu/~rplevy/papers/levy-2008-cognition.pdf)); **Smith & Levy (2013)**,
[doi:10.1016/j.cognition.2013.02.013](https://doi.org/10.1016/j.cognition.2013.02.013) — reading time
is **linear in surprisal over roughly six orders of magnitude, with no threshold**; Shain et al.
(2024), PNAS, [doi:10.1073/pnas.2307876121](https://doi.org/10.1073/pnas.2307876121); Wilcox et al.
(2023), TACL, across 11 languages.

⚠️ **Oh & Schuler (2023)**, TACL, [aclanthology.org/2023.tacl-1.20](https://aclanthology.org/2023.tacl-1.20/):
**better language models fit human reading times worse.** This matters to us directly. The obvious
cheap instrument — score a document by per-token surprisal under a good LM — is systematically
mis-calibrated in the direction of underestimating difficulty, because a strong model finds our
compressed sentences easy precisely where a human does not. **Do not build an LLM-surprisal
difficulty meter.**

### 6.4 The register instrument: Biber multidimensional analysis

This is what the LLM-style literature actually uses, and adopting it would put our measurement on the
same axis as the published work.

**Douglas Biber's** feature set and factor solution — Dimension 1 is "involved versus informational
production" — is the instrument in Reinhart et al. (PNAS 2025), Milička et al.
([arXiv:2509.10179](https://arxiv.org/abs/2509.10179)), Goulart et al. (2024) and Dawkins et al.
([arXiv:2506.09975](https://arxiv.org/abs/2506.09975)). All four report LLM text shifted toward the
informational pole. **Biber Dimension 1 is, as far as this search found, the closest thing to a
validated numeric scale for the property our density note calls "register".**

Related instruments, none validated against reading time on its own: L2 Syntactic Complexity Analyzer
(Lu), TAASSC and TAALES (Kyle), Coh-Metrix (Graesser & McNamara, which does carry a
`left-embeddedness` index). Concreteness norms — Brysbaert, Warriner & Kuperman (2014), 40,000
English lemmas — are available and tempting for mechanism 4, but see §6.5's caveat before using them.

⚠️ **We did not verify current maintenance status or licensing for any of these.** Coh-Metrix in
particular has been intermittently unavailable. Before adopting one, check that it still installs;
the practical alternative is a spaCy dependency parse, from which mean dependency distance and
subject–verb distance both fall out directly and which we know is maintained.

### 6.5 What this says about `measure.ts`

**The instrument is aimed at the wrong end of the evidence.** It reports nominalisation density on
every run and has **no centre-embedding detector at all**. It measures the mechanism with the weakest
support and is blind to the mechanism with the strongest.

| Mechanism                  | As a _tell_                   | As a _reading cost_                                                                                                                    |
| -------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Centre-embedding**       | not measured                  | 🟢 **Robust.** Replicated since 1964; lexically matched; beat every other feature in Martínez et al. 2022                              |
| **Nominal style**          | 🟢 1.5–2× human (Reinhart)    | 🔴 folklore — see §7                                                                                                                   |
| **Abstraction stacking**   | 🟢 part of the same signature | 🟡 concreteness effects are _single-word_ lexical-decision effects, fragile under controls, and do not transfer to syntactic packaging |
| **Periodic structure**     | not measured                  | 🟡 contested — storage cost predicts it, anti-locality complicates it                                                                  |
| **Undeclared compression** | no frequency count located    | no reading-cost study located — but the category is Aristotle's, not ours; see below and §4                                            |

Concrete changes, in order of value:

1. **Add a locality measure.** Words before the main verb is already named in the density note's §6
   as "the best single proxy for periodic structure"; it is a better proxy for **subject–verb
   distance**, which is the evidenced mechanism. A dependency parse would give mean dependency
   distance properly; a POS-tagged approximation would give most of it. Vale's `sequence`
   extension point has POS tagging built in (§4.4).
2. **Demote the nominalisation count to a secondary signal**, reported as a _tell_ rather than a
   defect, with the reason stated.
3. **Add a metaconcept word list** for mechanism 4, using Pinker's enumeration (§4.1). It is currently
   unmeasured.
4. **Add the sentence-final present participial clause** as a tic (§2.2). Regex-visible, and the
   largest measured deviation in the PNAS study.
5. **Keep the p90 aggregate**, and describe it as what the code comment already says it is — a habit
   signal — rather than a threshold with authority behind it.

---

## 7. Reconciliation: a tell is not a defect

The two literatures in this report reach opposite verdicts on nominalisation, and both are correct,
because they answer different questions. Keeping them apart is the most useful single thing in this
document.

| Question                                  | Verdict                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| Do LLMs nominalise more than humans?      | 🟢 **Measured.** 1.5–2× (Reinhart et al., PNAS 2025) |
| Is nominalised prose harder for a reader? | 🔴 **Largely unmeasured.** See below                 |

The reading-cost literature for nominalisation is three studies:

- Coleman & Blumenfeld (1963),
  [doi:10.2466/pr0.1963.13.3.651](https://doi.org/10.2466/pr0.1963.13.3.651) — **cloze restoration**,
  9.63 words against 10.80. Significant, and tiny.
- Coleman (1965), [doi:10.1037/h0022472](https://doi.org/10.1037/h0022472) — the measure is **rote
  learning**, not comprehension. (Note: this is sometimes cited as "Coleman 1964", conflating two
  different papers.)
- Spyridakis & Isakson (1998),
  [doi:10.2190/01HD-MHU1-QNX9-R3YE](https://doi.org/10.2190/01HD-MHU1-QNX9-R3YE) — mixed, and
  **reversed by population**: "denominalized text is most effective in helping native speakers focus
  on more important information, but for nonnative speakers, nominalized text may not work well."

Every one confounds nominalisation with word length, word frequency and sentence length. **No modern
reading-time or eye-tracking evidence isolates it.**

And Martínez, Mollica & Gibson (2022) — the study usually cited as validating the plain-language
checklist — manipulated jargon, centre-embedding, passive voice and capitalisation. It **did not test
nominalisation at all**.

So "avoid nominalisations" is defensible as _stop sounding like an LLM_. It is not defensible as
_make this easier to read_, and the two motivations lead to different edits.

### The mechanism is locality, not nominality

The honest substitute, and it is better supported than what it replaces: **keep syntactic
dependencies short, and avoid centre-embedding.** Nominalised bureaucratic prose usually violates
that anyway, which is why the heuristic works — it catches the real thing by correlation. When the
heuristic and the mechanism disagree, follow the mechanism.

### Correction: undeclared compression is Aristotle's category, not ours

Recorded because this document contradicted itself. §4 already mapped mechanism 5 to Aristotle's
_gnome_; the table above, written later, still called it ours with no prior art. §4 was right.

_Rhetoric_ II.21, verified against Perseus: maxims are "the premises or conclusions of enthymemes
**without the syllogism**" — a conclusion with its reasoning removed. That is the mechanism
exactly.

He also supplies the explanation the misattribution argument was reaching for. A maxim pleases
because the speaker "hits upon the opinions which they specially hold": it works by matching what
the hearer **already believes**. So it lands on a reader who holds the argument and fails on one
who does not — and the sentence is identical in both cases, which is why the second reader
concludes the fault is theirs.

One usage condition worth keeping. Maxims suit "one who is advanced in years, and in regard to
things in which one has experience," and deployed about unfamiliar subjects they reveal
"foolishness and lack of education." A maxim is earned by experience the audience recognises.

### What this changes

The evidence tiers per mechanism are in §6.5, and the instrument changes that follow from them are
there too. Three things that belong here rather than there:

1. **Reword the guidance, do not delete it.** "Use verbs, not abstract nouns" stays in
   `plainspoken.md`. Relabel it as a convention with a stated reason: it correlates with long
   dependencies, and it is how LLM prose is recognised. What it must stop claiming is that the
   reader finds it harder, because that claim is not supported.
2. **Soften the periodic rule.** Two independent literatures now say the same thing from different
   directions — the rhetorical tradition (Aristotle, Williams) says periodicity is a virtue used
   sparingly, and the psycholinguistic tradition (anti-locality) says suspension is not reliably a
   cost. §1.3 and §6.2 are the same correction arriving twice.
3. **Keep the compression framing, and mark it as ours.** No prior art was located for the
   acronym-versus-aphorism argument or for the misattribution claim underneath it. That is not a
   licence to assert it. It is a reason to label it as untested and watch whether it earns its place
   against real annotated rereads — which is what step 1 of the density note's §8 was already going
   to produce.

---

## 8. What we could not find

Each of these is a gap in the literature or a source we could not reach, not a gap in the search
plan. Where a gap means we are _not behind_, that is said.

### 8.1 Genuine gaps in the literature

**No established method for writing corrective style instruction.** No study compares a pre-writing
style guide against a post-hoc editorial pass for prose register. No validated rubric for prose
register exists. No study compares style rules against a scored rubric for controlling generation.
**We are not behind the state of the art here, because there is no state of the art.** Our pairing of
an output style with a review skill, with a mechanical measurement in front of the review, is worth
documenting as an approach rather than replaced with someone else's.

**No study measures negative-parallelism frequency at adequate scale.** Boggia (§2.1) is the only
direct count and disclaims settled status. No diachronic study of "not only… but also" frequency
pre- and post-2022 exists — the obvious analogue to the "delve" work, and nobody has run it.

**No published work connects preference optimisation to _syntactic_ register.** Juzek & Ward made
the causal link for vocabulary by emulating the feedback procedure with human participants. Nobody
has run the equivalent for a grammatical property. The inference "annotators prefer dense
confident-sounding prose, therefore RLHF produces it" is plausible, consistent with the base/instruct
comparisons in §3.1, and **not demonstrated**.

**No post-hoc stylometry of debiased-reward models.** ODIN, R-DPO, Product-of-Experts debiasing and
DivPO all produce reward models with a style bias removed. Every one of them reports win rates and
diversity metrics. **None ran stylometrics on the resulting prose.** This is the single cheapest
unrun experiment in the area.

**No published register or genre census of any large pretraining corpus.** The classifier
infrastructure exists and HPLT 3.0 now ships register labels, but the census has not been done. So
the SEO/listicle/self-help hypothesis for the register's origin is **pure speculation** — no study
exists, in either direction.

**No leaked or published rater guideline about formatting or writing style.** The documented leaks
concern content safety and source whitelists. The only public statement that style guides exist in
rater instructions is a labelling vendor's own marketing.

**No GloWbE analysis of "delve" across English varieties.** The right instrument for the
Nigerian-English claim (1.9bn words, 20 countries) has never been pointed at it. The claim is
therefore neither confirmed nor properly refuted, only unsupported.

**No lab publication mentions em dashes.** The GPT-5.1 em-dash claim rests entirely on a social-media
post, not on any OpenAI publication, model spec or release note.

**No modern reading-time or eye-tracking evidence isolates nominalisation.** The entire base is
Coleman & Blumenfeld (1963, cloze restoration, 9.63 against 10.80 words — significant and tiny),
Coleman (1965, rote learning), and Spyridakis & Isakson (1998, mixed and **reversed by population**:
"denominalized text is most effective in helping native speakers focus on more important information,
but for nonnative speakers, nominalized text may not work well"). Every one confounds nominalisation
with word length, word frequency and sentence length.

**No application of "gnomic", "sententious" or "aphoristic" as a technical register label for LLM
output.** The rhetorical vocabulary that _has_ been applied is epanorthosis, correctio, antithesis and
negative parallelism. Our register framing has no precedent, for better or worse.

**No prior art for "undeclared compression" as a failure mode.** Pinker's chunking is the mechanism;
the misattribution consequence — the reader concluding the fault is theirs — appears nowhere we
looked.

### 8.2 Sources we could not reach

- **The Atlantic** (Oremus, 12 July 2026) — the sole source for the widely repeated "3× more
  frequently than humans" negative-parallelism figure. Paywalled; archive.org, the CDX API and
  Memento all failed. **The figure is unverified and does not reconcile with Boggia's numbers.**
- **The Economist**, "How to spot AI writing", 30 July 2026 — paywalled. The em-dash study it reports
  is not named.
- **Washington Post**, Merrill, Chen & Kumer, 13 November 2025 — 403. Wikipedia cites it for real
  counts, so it probably contains the best available em-dash and vocabulary numbers.
- **ISO 24495-1:2023** — paywalled (~CHF 100). Its four principles are verified second-hand from two
  independent sources that agree verbatim; the standard's internal wording is unread.
- **IBM Style** — behind an IBMid gate, 401/403.
- **Kimble's compilation** of plain-language studies and the deMaine review — SSRN 403, Plain Language
  Network defunct. The frequently cited "~50 studies" count is **unverified**; do not repeat it.
- Full texts of Miller & Isard (1964), Konieczny (2000) and Frank et al. (2016) — publisher blocks;
  abstracts and metadata only.
- Williams's _Style_ — verified against unauthorised scans of an in-copyright Pearson text. Wording
  is confirmed; cite the ISBNs, not the PDFs.

### 8.3 Unresolved discrepancies, recorded rather than smoothed

- **ASD-STE100 dictionary size.** The official figure is ~900 approved words; a direct count of Issue
  9 gives roughly 800 approved and 1,290 unapproved. Unresolved.
- **Em-dash direction.** Freeburg and Wikipedia say LLMs overuse em dashes (against _nonprofessional_
  writers); Russell et al.'s expert annotators used dashes as a marker of _human_ writing. Both are
  measured. They are probably measuring different populations and model generations, and we did not
  resolve it.
- **Base-versus-instruct direction.** Reinhart and Padmakumar & He find post-training amplifies the
  register; Freeburg's one em-dash comparison finds post-training _suppressed_ the habit. Take
  "post-training shapes it" as established and "post-training always amplifies it" as not.

### 8.4 Method caveat

The session's web-search budget (200 calls) was exhausted partway through this work. Later
sub-questions were answered by direct fetch of URLs already discovered rather than by fresh search.
**Absence of a result in §8.1 is therefore weaker evidence of absence than it would normally be**,
particularly for §8.1's first item, which is the one we would most like to be wrong about.

---

## 9. Evidence index

**Read these six first.** They carry most of the report's weight:

1. Reinhart et al., _PNAS_ 122(8), 2025 — the measured register, base against instruction-tuned, and
   the null result on style prompting.
   [doi:10.1073/pnas.2422455122](https://doi.org/10.1073/pnas.2422455122)
2. Martínez, Mollica & Gibson, _Cognition_ 224:105070, 2022 — centre-embedding beats everything else
   in real prose. [doi:10.1016/j.cognition.2022.105070](https://doi.org/10.1016/j.cognition.2022.105070)
3. Lin et al., ICLR 2024 — the register is 5–8% of token positions, mostly discourse markers.
   [arXiv:2312.01552](https://arxiv.org/abs/2312.01552)
4. Zhou, Hwang, Ren & Sap, ACL 2024 — hedges are penalised, unmarked declaratives read as confident.
   [arXiv:2401.06730](https://arxiv.org/abs/2401.06730)
5. Gopen & Swan, _American Scientist_ 78(6), 1990 — the seven principles, and the explicit rejection
   of word-count limits. [PDF](https://www.gatsby.ucl.ac.uk/~pel/misc/gopen_swan.pdf)
6. Wikipedia:Signs of AI writing — the practitioner catalogue, including its own "Ineffective
   indicators" section. [WP:AIPARALLEL](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)

**And read one non-paper:** Anthropic's
[published system prompts](https://platform.claude.com/docs/en/release-notes/system-prompts). They
are the closest existing artefact to `plainspoken.md` and the only corrective style instruction in
this report that is known to be deployed at scale.

**Standing bibliography.** Reinhart maintains a current index of the LLM-style literature at
[refsmmat.com/notebooks/llm-style.html](https://www.refsmmat.com/notebooks/llm-style.html) (updated
8 June 2026). Start there rather than re-running this search.

**Primary sources read in full or in substantial part:** Wikipedia:Signs of AI writing (wikitext,
1,830 lines); Reinhart et al. 2025 (PMC); Russell, Karpinska & Iyyer ACL 2025; Freeburg
arXiv:2603.27006 (HTML, full results tables); Jang, Ye & Seo arXiv:2209.12711; Li et al.
arXiv:2402.10962; Jaroslawicz et al. arXiv:2507.11538; Bohr arXiv:2511.13972; Panickssery et al.
arXiv:2404.13076; Baumler et al. arXiv:2604.24444; Juzek & Ward arXiv:2508.01930; Anthropic prompting
best practices (full page); Vale styles documentation; proselint README; diataxis.fr tutorials.

**Sources read via agent report rather than directly:** Lin et al. 2312.01552; Singhal et al.
2310.03716; Zhang et al. 2409.11704; Feuer et al. 2409.15268; Wu & Aji 2307.03025; Zhou et al.
2401.06730; Sharma et al. 2310.13548; Leng et al. 2410.09724; Kirk et al. 2310.06452; Guo et al.
2412.10271; Ouyang et al. 2203.02155 Table 12; Gudibande et al. 2305.15717; Myntti et al. 2504.01542;
LMSYS style-control blog; OpenAI Model Spec and ChatGPT release notes; Anthropic system prompts,
"Claude's Character" and the Constitution; Aristotle _Rhetoric_ II.21 and III.9;
Gopen & Swan 1990; Williams _Style_ 11e and _Toward Clarity and Grace_; Pinker "Why Academics Stink
at Writing"; Camerer, Loewenstein & Weber 1989; Gibson 1998; Futrell et al. 2015; Konieczny 2000;
Vasishth & Lewis 2006; Smith & Levy 2013; Oh & Schuler 2023; Coleman & Blumenfeld 1963; Coleman 1965;
Spyridakis & Isakson 1998; Charrow & Charrow 1979; Martínez et al. 2022 and 2023; Stoll et al. 2022;
Stallwood et al. 2023; Sayfi et al. 2024; Kuhn 2014; Chervak & Drury 2003; O'Brien & Roturier 2007;
ASD-STE100 Issue 9; Plain Writing Act of 2010; Federal Plain Language Guidelines (GitHub archive);
Google, Microsoft, Red Hat and Apple style guides; Shaib et al. 2024; Padmakumar & He 2024; Jiang &
Hyland; Milička et al. 2025; Kobak et al. 2025; Liang et al. 2024; Geng & Trotta 2024 and 2025.

**Repository state:** read-only throughout except for this file. No commit, no checkout, no change
to `plainspoken.md`, `plainspoken-edit/` or `2026-08-16-prose-density.md`.
