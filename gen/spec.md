# IELTS Academic Reading — daily passage generator spec (v2)

Every day you write TWO original IELTS Academic Reading passages for a single learner and commit
them to the GitHub Pages site ("雅思阅读日练"):

- the **main passage** (`slot: "main"`), pitched at the learner's adaptive level L, and
- the **Part 3 passage** (`slot: "p3"`), always in Reading Passage 3 style, pitched at
  `P3 = min(9, max(7.0, L + 1))`.

Everything must look and behave like a real Cambridge/IDP/BC Academic Reading passage, but be
**harder than Cambridge IELTS at the same nominal band**: the learner wants to over-train. Write
every passage at the top of its band (denser text, deeper paraphrase, more and better distractors
than the corresponding Cambridge test). Never copy or closely paraphrase any published IELTS
passage; write new text.

## 0. Pipeline (follow in order)

The site is a static GitHub Pages site. Paths below are relative to the repository root.

1. Read state:
   - `config.json` → `apiBase` (the sync API). If it is non-empty, `GET <apiBase>/state` returns
     `{profile, attempts}`: `profile.level` = L (default 6.5), `profile.typeStats` = accuracy per
     question type, `attempts` = the learner's results. If `apiBase` is empty or the request fails,
     use the level of the newest main passage in `data/index.json` (or 6.5) and no type stats.
   - `data/index.json` → earlier passages: `id`, `slot`, `topicArea`, `title`, `types` (to avoid
     repeating topics and to rotate question types).
2. For each of the two passages decide the level (section 2), the passage profile (section 3), the
   topic (section 4) and the question-type mix (section 5). The two passages must have different
   topic areas and different question types.
3. Write each passage and its questions as JSON exactly in the schema of section 7 to
   `data/passages/<id>.json`, and the answer key to `data/keys/<id>.json`.
4. Self-check every answer against the item-writing rules in section 6. For every item, quote the
   exact evidence sentence. If an item is ambiguous (two defensible answers), rewrite the item.
   Then attack your own items as a strong candidate would: if an item can be answered by matching
   words between question and text, or a distractor can be ruled out without reading the text,
   rewrite it.
5. Run `node gen/validate.mjs data/passages/<id>.json data/keys/<id>.json` for each passage. Fix
   every ERROR and re-run until it prints `OK`. Treat WARN lines seriously. Never commit a passage
   that fails.
6. Run `node gen/build-index.mjs`, then commit the five changed files (two passages, two keys,
   `data/index.json`) with the message `Add passages <date>: <main title> / <P3 title>` and push
   to `main`. GitHub Pages redeploys within a few minutes.
7. Reply with a short summary: for each passage its id, level, title and question types.

Document ids, using the date in Asia/Singapore time: main passage `YYYY-MM-DD`, Part 3 passage
`YYYY-MM-DD-p`. If an extra main passage is needed on the same day use `-b`, `-c`, … (never `-p`).

## 1. The learner's level model

- Levels are target bands: 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0.
- Only main passages move the level. The sync API (worker/worker.js) recomputes `profile.level`
  after every first attempt on a main passage using the rule below; Part 3 attempts only update
  the per-type statistics. The generator uses `profile.level` as is. Only if the profile is
  missing, compute it yourself from the main-passage attempts (sorted by `submittedAt`) with the
  same rule, starting from 6.5.
- Rule, applied after each main-passage attempt with accuracy `acc = score/total` at level `L`:
  - acc ≥ 0.85 → L + 0.5
  - acc < 0.50 → L − 0.5
  - last two main attempts both ≥ 0.70 → L + 0.5
  - last two main attempts both < 0.60 → L − 0.5
  - otherwise stay at L. Clamp to [5.0, 9.0].

## 2. What changes with level

Difficulty in the real test comes from the text (length, abstraction, argument structure, lexis)
and from the distance between the question wording and the text (paraphrase, distractors).
It does NOT come from trick questions or factual ambiguity. Use this table — each row is already
set above the Cambridge analogue named in it:

| Level | Harder than | Words | Text type | Paraphrase in items | Distractors |
|---|---|---|---|---|---|
| 5.0–5.5 | a Cambridge Passage 1 | 700–800 | descriptive / historical / process, mostly chronological, concrete, but with one paragraph of discussion | moderate: synonyms of every key noun and verb, clause reordering | every MCQ option drawn from the text; NOT GIVEN items share entities with the text |
| 6.0–6.5 | a Cambridge Passage 2 | 800–900 | descriptive + discussion; 2–3 named researchers with different emphases | heavy: whole-clause paraphrase; locating needs reading across two sentences | at least two plausible wrong options per MCQ; NOT GIVEN close to a stated fact |
| 7.0–7.5 | a Cambridge Passage 3 | 880–980 | discursive; contrasting views of 3–5 researchers; hedged claims; concessions | very heavy: nominalisation, inference from two places in a paragraph | every option is a partial truth or a misattribution; FALSE vs NOT GIVEN turns on a qualifier |
| 8.0–9.0 | the hardest Cambridge Passage 3 | 950–1100 | abstract / argumentative (philosophy of science, cognition, economics of …); the writer's own stance develops across the text | abstract restatement, writer's attitude, implication, reference across paragraphs | near-miss options, reversed causation, scope traps (some/most/all, may/will, tends to/always) |

Part 3 passages use the 7.0+ rows only and follow section 3's Part 3 profile.

Sentence length, academic vocabulary (AWL) density and the proportion of abstract nouns rise with
level. Keep the English natural and edited: it should read like a well-written article from New
Scientist, The Economist, Aeon, a university press book or a museum journal, adapted for the test.

## 3. Passage format

- Title (2–8 words) and optionally a one-line standfirst/subtitle in italics, as real passages have.
- 5–8 paragraphs. Label them A, B, C… (`label`) whenever the questions include `headings` or
  `match_info`; otherwise labels are optional (still allowed).
- At least one paragraph should contain numbers/dates/names that questions can target.
- No headings inside the text. No bullet lists. No first-person learner address.
- For `diagram_label` the passage must describe a physical object/process in enough detail
  that each label is recoverable from the text.
- Plant competition for every answer: the paragraph that holds an answer should also mention a
  second date, figure, name or term of the same kind that a careless reader could pick instead.

Part 3 profile (`slot: "p3"`, `style: "P3"`):
- 900–1100 words, 6–8 paragraphs, 14 questions (13 allowed), `suggestedMinutes: 20`.
- An argumentative or theoretical text: a debate between positions, a challenge to a received
  view, or a writer who weighs evidence and reaches a qualified conclusion. Include the writer's
  own stance (so `ynng` and attitude MCQs are possible), concessions ("Admittedly…", "This is not
  to say…") and at least one paragraph whose main idea is only clear from its last sentence.
- Typical mix: `ynng` or `mcq` (including one "What is the writer's main purpose…" or "Which of
  the following is the most suitable title…" item) + `sentence_endings` / `summary_box` /
  `match_features` / `mcq_multi`. Completion types are allowed but must use the harder word
  limits (ONE WORD ONLY / NO MORE THAN TWO WORDS).

## 4. Topic

Typical Academic Reading areas: archaeology & history of technology, biology & ecology, earth
science & climate, psychology & cognition, linguistics, economics & business history, urban
planning & architecture, health & medicine, education, arts & cultural history, materials &
engineering, astronomy, agriculture & food, philosophy of science, sociology.
Pick an area not used in the last 5 passages (of either slot) and a specific angle (e.g. not
"bees" but "how honeybee colonies choose a new nest site"). The content must be factually
plausible; when you mention real facts keep them accurate, otherwise use invented but realistic
researchers (e.g. "Dr Hannah Reyes of the University of Otago") — never invent quotes for real
people.

## 5. Question types and mix

16 types (ids used in the JSON):

| id | Name | Answer form | Order follows text? |
|---|---|---|---|
| tfng | TRUE / FALSE / NOT GIVEN | TRUE/FALSE/NOT GIVEN | yes |
| ynng | YES / NO / NOT GIVEN (writer's views/claims) | YES/NO/NOT GIVEN | yes |
| mcq | Multiple choice, one answer A–D | letter | yes |
| mcq_multi | Choose TWO (or THREE) letters A–E (A–G) | letters, any order | n/a |
| headings | Matching headings (list i–xi) | roman numeral | no |
| match_info | Which paragraph contains the following information | paragraph letter | no |
| match_features | Match statements to people/dates/places (list A–F) | letter | no |
| sentence_endings | Complete each sentence with the correct ending A–H | letter | yes |
| sentence_completion | Complete the sentences (words from text) | words | yes |
| summary_completion | Complete the summary (words from text) | words | usually |
| summary_box | Complete the summary using the list of words A–L | letter | usually |
| note_completion | Complete the notes (words from text) | words | usually |
| table_completion | Complete the table (words from text) | words | usually |
| flowchart_completion | Complete the flow-chart (words from text) | words | yes |
| diagram_label | Label the diagram (words from text) | words | no |
| short_answer | Answer the questions (words from text) | words | yes |

Mix rules:
- 3 groups per passage (2 or 4 allowed), numbered continuously 1..13 (or 1..14). Each group has
  3–7 items (`headings` 4–7, `mcq` 2–4, `mcq_multi` 2 or 3 numbers).
- Main passage: combine one "locate & check" type (tfng/ynng/mcq/match_*), one completion type
  and one matching/global type, as real passages do. Part 3: see section 3.
- `ynng` only on texts that state the writer's opinions/claims; `tfng` on factual texts.
  Never both in one passage. `headings` and `match_info` not both in one passage.
- Coverage: across the last 8 passages every type should appear at least once. Prefer, in order:
  (a) types absent from the last 8 passages, (b) the learner's weakest types (lowest accuracy in
  `profile.typeStats` with ≥ 3 items attempted), (c) types typical of the level band
  (5.0–6.0: tfng, completion types, short_answer, match_info, flowchart, diagram;
  6.5–7.0: headings, match_features, mcq, summary_box, sentence_completion;
  ≥ 7.5: ynng, mcq, mcq_multi, sentence_endings, summary_box, match_features).
- Do not reuse exactly the same three types as the previous passage of the same slot, and do not
  give the two passages of one day any type in common.

## 6. Item-writing rules (the quality bar)

General
- Every item is answerable from the passage alone, with exactly one defensible answer.
- Items for ordered types follow the order of information in the text.
- Paraphrase everything. No item, option, ending or summary sentence may repeat 6 or more
  consecutive words of the text (the validator rejects 8+). In completion tasks the words around
  each gap must also be reworded (not "held in tanks of [[11]] seawater" when the text says "held
  in tanks of aerated seawater") — the validator rejects a gap whose neighbouring content word
  sits next to the answer in the text.
- Spread items across the whole passage; one group should not test only one paragraph.
- Use official instruction wording (section 8).

TRUE/FALSE/NOT GIVEN & YES/NO/NOT GIVEN
- TRUE/YES: the statement is a paraphrase of the text, ideally combining two clauses or
  generalising correctly from an example. FALSE/NO: the text directly contradicts it (opposite
  fact, wrong comparison, wrong qualifier such as all/some, always/sometimes, wrong time).
  NOT GIVEN: the text discusses the same entities but gives no information either way; it must be
  tempting (a plausible extra detail, a cause, a comparison or a future outcome that is not
  stated). At least one NOT GIVEN should look like a FALSE and one FALSE should look like a
  NOT GIVEN.
- In a group of 4–7 items each of the three answers appears at least once, no answer more than 3
  times, and the answers are not in a guessable pattern.

Multiple choice
- 4 options of similar length and grammar. Every distractor uses words or ideas from the passage
  and is wrong for a reason a strong candidate must read for: wrong person, wrong time,
  overgeneralised, reversed cause, true but not the answer to this question. No "all of the above".
- `mcq_multi`: 5 options for TWO answers, 7 for THREE; the correct ones come from different
  parts of the text; every wrong option is mentioned in the text.

Matching (more options than items, always)
- `headings`: at least 3 more headings than paragraphs to match (plus the example's heading if
  an example is given); headings capture the main idea of the whole paragraph, not one detail;
  at least three distractor headings share vocabulary with, or describe a detail of, a paragraph.
  An example (`example`) may be given for the first paragraph; then that heading is not used
  again. Each heading used at most once.
- `match_info`: items describe a type of information ("a reference to…", "an explanation of…",
  "an example of…"); include the note "NB You may use any letter more than once." Not every
  paragraph needs to be used; at least one paragraph should contain a near-match for an item.
- `match_features`: 4–6 options; at least one option is never used and, when there are 4+
  items, at least one is used twice (add the NB note); options that are never used must still be
  people/things discussed in the text.
- `sentence_endings`: at least 3 more endings than beginnings; every ending is grammatically
  possible with every beginning, and every unused ending states something the text says about a
  different subject.

Completion (sentence/summary/note/table/flowchart/diagram/short_answer)
- Answers are words copied EXACTLY from the passage (same form and spelling), within the
  stated word limit, and they fit grammatically. Numbers can be written as figures.
- The word limit is one of: `ONE WORD ONLY`, `ONE WORD AND/OR A NUMBER`, `NO MORE THAN TWO WORDS`,
  `NO MORE THAN TWO WORDS AND/OR A NUMBER`, `NO MORE THAN THREE WORDS`,
  `NO MORE THAN THREE WORDS AND/OR A NUMBER`. Use maxWords/allowNumber to match. Prefer the
  tighter limits at level ≥ 7.0.
- List genuine variants in `alt` (e.g. "18th century" / "eighteenth century", British/US
  spelling, singular when the text has both). Do not list wrong-form variants.
- `summary_box`: at least 5 more options than gaps (e.g. 12 options A–L for 6 gaps), mostly the
  same word class; options paraphrase the text, they are not copied from it, and at least three
  wrong options are words that fit the gap grammatically and relate to the topic.
- Summaries/notes/tables cover a section of the text, not the whole of it.

Explanations (shown to the learner after submission, in Simplified Chinese)
- `ev.p` = paragraph label (or index "1","2"… when unlabelled), `ev.q` = an exact quote of the
  evidence sentence or clause (must be a substring of that paragraph's text).
- `why` = 1–3 Chinese sentences: where the answer is, the paraphrase pairs
  ("题干 X ↔ 原文 Y"), and why the most tempting wrong answer is wrong.
- `vocab`: 8–12 useful academic words or phrases from the passage with Chinese meanings.

## 7. JSON schema

`data/passages/<id>.json`:
```json
{
  "id": "2026-10-30",
  "date": "2026-10-30",
  "level": 6.5,
  "slot": "main",                // "main" (adaptive) | "p3" (daily Part 3, id ends in -p)
  "style": "P2",                 // P1 | P2 | P3, from the level table; always P3 for slot "p3"
  "topicArea": "biology & ecology",
  "title": "…",
  "subtitle": "…",               // optional, "" if none
  "paragraphs": [ {"label": "A", "text": "…"} ],   // label "" when unlabelled
  "groups": [ GROUP, … ],
  "total": 13,                   // 14 for Part 3
  "suggestedMinutes": 20,
  "vocab": [ {"w": "mitigate", "zh": "减轻；缓和"} ],
  "generatedAt": "2026-10-30T06:50:00+08:00",
  "spec": "v2"
}
```
Every GROUP has `type`, `from`, `to`, `instructions` (array of strings, official wording) and
type-specific fields. Gap markers inside text are `[[n]]` where n is the question number.

- tfng / ynng / match_info / short_answer:
  `{"items": [{"n": 1, "text": "…"}]}` (+ for short_answer: `"wordLimit", "maxWords", "allowNumber"`)
- mcq: `{"items": [{"n": 6, "text": "stem", "options": [{"k":"A","t":"…"}, …4]}]}`
- mcq_multi: `{"pick": 2, "text": "Which TWO … ?", "options": [{"k":"A","t":"…"}, …5]}` — numbers `from..to`
- headings: `{"options": [{"k":"i","t":"…"}, …], "example": {"para":"A","k":"iii"} | null,
  "items": [{"n": 1, "para": "B"}]}`
- match_features: `{"listTitle": "List of Researchers", "options": [{"k":"A","t":"…"}], "reuse": true,
  "items": [{"n": 9, "text": "…"}]}`
- sentence_endings: `{"options": [{"k":"A","t":"…"}], "items": [{"n": 9, "text": "beginning"}]}`
- sentence_completion: `{"wordLimit","maxWords","allowNumber", "items": [{"n": 1, "text": "… [[1]] …"}]}`
- summary_completion: `{"wordLimit","maxWords","allowNumber", "title": "…", "text": "paragraph with [[n]] gaps"}`
- summary_box: `{"title": "…", "text": "… [[n]] …", "options": [{"k":"A","t":"…"}, …10]}`
- note_completion: `{"wordLimit","maxWords","allowNumber", "title": "…",
  "lines": [{"text": "…", "indent": 0}, {"text": "– … [[3]] …", "indent": 1}]}`
- table_completion: `{"wordLimit","maxWords","allowNumber", "title": "…",
  "head": ["…","…"], "rows": [["…","… [[4]] …"]]}`
- flowchart_completion: `{"wordLimit","maxWords","allowNumber", "title": "…", "steps": ["… [[5]] …", "…"]}`
- diagram_label: `{"wordLimit","maxWords","allowNumber", "title": "…", "svg": "<svg …>…</svg>"}`
  The SVG (viewBox about 0 0 600 360, no scripts, no external refs, no foreignObject) draws the
  object with simple shapes and contains, at each blank, a small box with the bold question number
  in it plus a leader line. Use `currentColor`-free explicit colours: strokes #334155, fills
  #f1f5f9 / #ffffff, text #0f172a, font-family sans-serif, font-size ≥ 13.

`data/keys/<id>.json`:
```json
{
  "id": "2026-10-30",
  "answers": {
    "1": {"a": "NOT GIVEN", "alt": [], "ev": {"p": "B", "q": "exact quote"}, "why": "中文解析"},
    "7": {"a": "C", "ev": {...}, "why": "…"}
  }
}
```
For mcq_multi give each number in `from..to` one of the correct letters (any order); the page
grades the set. For NOT GIVEN, `ev.q` is the sentence that discusses the topic most closely.

## 8. Official instruction wording

- tfng: "Do the following statements agree with the information given in the reading passage?",
  "In boxes {from}–{to} on your answer sheet, write", "TRUE if the statement agrees with the information",
  "FALSE if the statement contradicts the information", "NOT GIVEN if there is no information on this"
- ynng: "Do the following statements agree with the claims of the writer in the reading passage?",
  "YES if the statement agrees with the claims of the writer", "NO if the statement contradicts the claims of the writer",
  "NOT GIVEN if it is impossible to say what the writer thinks about this"
- headings: "The reading passage has {k} paragraphs, A–{X}.", "Choose the correct heading for paragraphs {…} from the list of headings below."
- match_info: "The reading passage has {k} paragraphs, A–{X}.", "Which paragraph contains the following information?", "NB You may use any letter more than once."
- match_features: "Look at the following statements (Questions …) and the list of … below.", "Match each statement with the correct …, A–E."
- sentence_endings: "Complete each sentence with the correct ending, A–{X}, below."
- mcq: "Choose the correct letter, A, B, C or D."
- mcq_multi: "Choose TWO letters, A–E."
- summary_box: "Complete the summary using the list of words, A–{X}, below."
- completion types: "Complete the {sentences|summary|notes|table|flow-chart|diagram} below.",
  "Choose {WORD LIMIT} from the passage for each answer."
- short_answer: "Answer the questions below.", "Choose {WORD LIMIT} from the passage for each answer."
