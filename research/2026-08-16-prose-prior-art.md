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
result here is weaker evidence of absence than usual. Every such gap is named in §7.

---

## 1. Executive summary: the four findings that should change what we build

**1. Our sharpest observation is measured, and it points at instruction tuning.** Reinhart et al.,
PNAS 2025, compared six LLMs against 12,000 matched human texts and found instruction-tuned models
use **nominalisations at 1.5–2× the human rate** and **present participial clauses at 2–5×**, and
describe the result as "a distinct noun-heavy, informationally dense writing style." Two of our
five mechanisms — nominal style and abstraction stacking — are therefore not a hunch. They are the
measured signature of the register. The same paper compares base against instruction-tuned Llama
and concludes the difference comes from instruction tuning, not from the pretraining corpus.

> **Correction added after a separate psycholinguistics survey — see §9.** This finding
> establishes that LLMs nominalise **more than humans**. It does **not** establish that
> nominalisation is **harder to read**, which is a different claim with far weaker support.
> Nominalisation is a well-measured _tell_ and a poorly-evidenced _defect_. Read §9 before
> using it as a reason to rewrite anything.

**2. "Not X, but Y" is a documented tell, and we should adopt its name.** The established term is
**negative parallelism**. Wikipedia's `WP:AIPARALLEL` gives it a section with two named
sub-patterns, one of which is titled exactly "Not X, but Y", with cited specimens going back to 2024. We rediscovered a known thing. Adopt the vocabulary.

**3. Our review-beats-priming claim has direct support, from the same PNAS paper.** Reinhart et al.
prompted models to imitate a supplied style and the grammatical features did not move: the tells
"persisted across all contexts and genres tested." Style instruction failed to fix the exact
properties we are trying to fix. This is the strongest single piece of evidence in the report and
it argues for weighting the review skill over the output style.

**4. Two of our rules are contradicted by the source we are closest to.** Gopen & Swan explicitly
reject word-count sentence limits, and Aristotle — the origin of "periodic" — treats periodic
structure as a _virtue_ and objects only to unbounded periods. Our 30-word rule and our framing of
periodic structure as inherently costly both need rewording. Details in §4.5.

One thing we could not find, which is itself a result: **no established method for writing
corrective style instruction.** There is no literature comparing a pre-writing style guide against
a post-hoc editorial pass for prose register. Our pairing of an output style with a review skill is
not behind the state of the art, because there is no state of the art. It is worth documenting.

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

**This supersedes part of our §2 mechanism table.** Our five mechanisms were derived by reading our
own wiki. Two of them (nominal style, abstraction stacking) turn out to be the measured signature
of instruction-tuned output, which is a much stronger footing than we had. One mechanism the paper
identifies that we missed entirely is the **present participial clause** — the trailing "-ing"
phrase, as in "…, reflecting its continued relevance." Wikipedia catalogues the same thing under
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

### 3.3 The pretraining contribution

**MEASURED, partial.** Shaib et al., EMNLP 2024 (§2.2a): **76% of the syntactic templates found in
model text also occur in the pre-training data, against 35% for human-authored text**, and the
templates "are not overwritten by RLHF". So formulaicity has a pretraining source that post-training
does not remove — which sits alongside, not against, the instruction-tuning results. Different
properties have different origins.

**MEASURED, on em dashes specifically.** Freeburg's argument is that the em dash "is markdown leaking
into prose" — the residue of markdown-saturated training corpora. He lists his own falsifiability
problem: the claim is hard to test without models trained on markdown-minimal corpora.

### 3.4 The "delve comes from Nigerian English annotators" claim

**FOLKLORE. Widely asserted, no evidence located.** Juzek & Ward's COLING 2025 paper is the study
that actually looked for the causes of lexical overrepresentation, and it reports no evidence for a
training-data explanation. We found no measurement supporting the annotator-dialect story in either
direction. Do not repeat it.

### 3.5 What we could not establish about origins

Named in §7. In short: no published work connects preference optimisation to _syntactic_ register the
way Juzek & Ward connect it to vocabulary; and the RLHF-verbosity-and-style literature (length bias,
style-over-substance in judges) is about what reward models _prefer_, not about what generators
subsequently _write_ at the sentence level. Treat the bridge between those two as unbuilt.

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

### 4.6 Developer-documentation style guides, plain language, controlled languages

_(pending — see §7)_

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

Neither is about style, and both are about dialog turns rather than one long document. But the
practical reading is clear enough: **an output style is not a stable guarantee over a long session,
and repetition is the evidenced mitigation.** For our purposes that is another argument for the
review pass, and a small argument for restating the register briefly in a long document's
frontmatter or in the skill invocation rather than relying on a system prompt set at session start.

---

## 6. Measurement

_(pending)_

---

## 7. What we could not find

_(pending)_

---

## 8. Evidence index

_(pending)_

---

## 9. Reconciliation: a tell is not a defect

Added after a separate survey of the psycholinguistics literature. That survey and the sources in
§2 reach opposite verdicts on nominalisation, and both are correct, because they answer different
questions. Keeping them apart is the most useful thing in this document.

| Question                                  | Verdict                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| Do LLMs nominalise more than humans?      | 🟢 **Measured.** 1.5–2× (Reinhart et al., PNAS 2025) |
| Is nominalised prose harder for a reader? | 🔴 **Largely unmeasured.** See below                 |

The reading-cost literature for nominalisation is two studies from 1963–65 using **cloze scores
and rote learning** (Coleman & Blumenfeld 1963; Coleman 1965), plus one 1998 recall study whose
effect was mixed and partly reversed for non-native speakers (Spyridakis & Isakson). Every one
confounds nominalisation with word length, word frequency and sentence length. **No modern
reading-time or eye-tracking evidence isolates it.** And Martínez, Mollica & Gibson (2022,
_Cognition_) — the study usually cited as validating the plain-language checklist — manipulated
jargon, centre-embedding, passive voice and capitalisation, and **did not test nominalisation at
all**.

So "avoid nominalisations" is defensible as _stop sounding like an LLM_. It is not defensible as
_make this easier to read_, and the two motivations lead to different edits.

### The mechanism is locality, not nominality

The honest substitute, and it is better supported than what it replaces: **keep syntactic
dependencies short, and avoid centre-embedding.** Nominalised bureaucratic prose usually violates
that anyway, which is why the heuristic works — it catches the real thing by correlation. When the
heuristic and the mechanism disagree, follow the mechanism.

### Evidence tiers for our five mechanisms

| Mechanism                  | As a _tell_                   | As a _reading cost_                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Centre-embedding**       | not measured                  | 🟢 **Robust.** Replicated since 1964; lexically matched and ambiguity-free; beat every other feature tested in Martínez et al. 2022                                                                                                                                                                                                      |
| **Nominal style**          | 🟢 1.5–2× human               | 🔴 folklore (above)                                                                                                                                                                                                                                                                                                                      |
| **Abstraction stacking**   | 🟢 part of the same signature | 🟡 concreteness effects are **single-word** lexical-decision effects, fragile under controls for frequency and age of acquisition, and do not transfer to syntactic packaging. _"The destruction of the city"_ is not more abstract than _"they destroyed the city."_                                                                    |
| **Periodic structure**     | not measured                  | 🟡 **contested.** Storage cost predicts it, but **anti-locality** is real — in head-final languages more preverbal material can make the head _faster_ (Konieczny 2000; Vasishth & Lewis 2006), and Levy 2008 derives that from surprisal. English is SVO so locality mostly holds here, but "suspension = cost" is not a safe universal |
| **Undeclared compression** | no evidence located           | no evidence located — ours                                                                                                                                                                                                                                                                                                               |

**The instrument is aimed at the wrong end of this table.** `measure.ts` reports nominalisation
density on every run, and has no centre-embedding detector at all. It measures the folklore column
and is blind to the robust one.

### What this changes

1. **Add a locality measure** — dependency distance, or words before the main verb — and demote
   the nominalisation count to a secondary signal reported as a _tell_, not a defect.
2. **Reword the guidance.** "Use verbs, not abstract nouns" stays, relabelled as convention with a
   stated reason: it correlates with long dependencies, and it is how LLM prose is recognised.
3. **Soften the periodic rule**, which §1.4 already flagged from a different direction. Two
   independent literatures now say the same thing.
4. **Keep the compression framing, and mark it as ours.** No prior art was located for it. That is
   not a licence to assert it — it is a reason to label it as untested and watch whether it earns
   its place.

### The numbers a linter may legitimately cite

Only three sentence-level figures in the surveyed style guides trace to a real authority:

- **Google: "fewer than 26 words per sentence"** — and it appears on the **accessibility** page,
  not the global-audience page, which says only "write shorter sentences" with no number.
- **Google: at most two nouns modifying another noun.**
- **Microsoft: link at most three coordinated clauses, preferably two.**

Paragraph caps: Google "5 or 6 sentences", Microsoft "3 to 7 lines". Red Hat is the most
measurable guide overall but its numbers govern headings and short descriptions, not sentences.

**Diátaxis publishes no numeric rule and explicitly rejects measurement** for the qualities it
addresses. Its prose guidance is per-type sentence _patterns_ only.

Our 30-word threshold has no external authority. Google's 26 is the closest published figure and
it is framed as accessibility. Cite it as an adopted convention, not a finding — and note that
Gopen & Swan reject word-count limits outright (§4.5).
