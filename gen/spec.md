# IELTS Academic Reading — daily passage generator spec (v1)

You are writing ONE original IELTS Academic Reading passage with 13 questions (14 at level ≥ 7.5)
for a single learner, and committing it to the GitHub Pages site. The learner practises with it on the
"雅思阅读日练" site. Everything must look and behave like a real Cambridge/IDP/BC Academic
Reading passage. Never copy or closely paraphrase any published IELTS passage; write new text.

## 0. Pipeline (follow in order)

The site is a static GitHub Pages site. Paths below are relative to the repository root.

1. Read state:
   - `config.json` → `apiBase` (the sync API). If it is non-empty, `GET <apiBase>/state` returns
     `{profile, attempts}`: `profile.level` = next target band (default 6.5), `profile.typeStats` =
     accuracy per question type, `attempts` = the learner's results. If `apiBase` is empty or the
     request fails, use level 6.5 (or the level of the newest passage) and no type stats.
   - `data/index.json` → earlier passages: `id`, `topicArea`, `title`, `types` (to avoid repeating
     topics and to rotate question types).
2. Decide the level (section 2), the passage profile (section 3), the topic (section 4) and the
   question-type mix (section 5).
3. Write the passage and questions as JSON exactly in the schema of section 7 to
   `data/passages/<id>.json`, and the answer key to `data/keys/<id>.json`.
4. Self-check every answer against the item-writing rules in section 6. For every item, quote the
   exact evidence sentence. If an item is ambiguous (two defensible answers), rewrite the item.
5. Run `node gen/validate.mjs data/passages/<id>.json data/keys/<id>.json`. Fix every ERROR and
   re-run until it prints `OK`. Treat WARN lines seriously. Never commit a passage that fails.
6. Run `node gen/build-index.mjs`, then commit the three changed files
   (`data/passages/<id>.json`, `data/keys/<id>.json`, `data/index.json`) with the message
   `Add passage <id>: <title>` and push to `main`. GitHub Pages redeploys within a few minutes.
7. Reply with a 3-line summary: id, level, title, question types.

Document id: the date in Asia/Singapore time, `YYYY-MM-DD`. If that file already exists, append
`-b`, `-c`, …

## 1. The learner's level model

- Levels are target bands: 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0.
- The sync API (worker/worker.js) recomputes `profile.level` after every first attempt using the
  rule below. The generator uses `profile.level` as is. Only if the profile is missing, compute it
  yourself from `attempts` (sorted by `submittedAt`) with the same rule, starting from 6.5.
- Rule, applied after each attempt with accuracy `acc = score/total` on a passage of level `L`:
  - acc ≥ 0.85 → L + 0.5
  - acc < 0.50 → L − 0.5
  - last two attempts both ≥ 0.70 → L + 0.5
  - last two attempts both < 0.60 → L − 0.5
  - otherwise stay at L. Clamp to [5.0, 9.0].

## 2. What changes with level

Difficulty in the real test comes from the text (length, abstraction, argument structure, lexis)
and from the distance between the question wording and the text (paraphrase, distractors).
It does NOT come from trick questions. Use this table:

| Level | Real-test analogue | Words | Text type | Paraphrase in items | Distractors |
|---|---|---|---|---|---|
| 5.0–5.5 | easy Passage 1 | 650–750 | descriptive / historical / process, chronological, concrete | light: synonyms of key nouns, word order changes; answers easy to locate | few; NOT GIVEN items clearly unmentioned |
| 6.0–6.5 | Passage 1–2 | 750–850 | descriptive + some discussion; 1–2 named researchers | moderate: synonyms + restructured clauses; locating needs scanning across a paragraph | one plausible wrong option per MCQ; NOT GIVEN close to text topic |
| 7.0–7.5 | Passage 2–3 | 850–950 | discursive; contrasting views of 3–5 researchers; hedged claims | heavy: whole-clause paraphrase, nominalisation, inference from two sentences | every MCQ option refers to something in the text; FALSE vs NOT GIVEN needs care |
| 8.0–9.0 | hard Passage 3 | 900–1000 | abstract / argumentative (philosophy of science, cognition, economics of …); writer's own stance | very heavy: abstract restatement, writer's attitude, implication | near-miss options, partial truths, qualifier traps (some/all, may/will) |

Sentence length, academic vocabulary (AWL) density and the proportion of abstract nouns rise with
level. Keep the English natural and edited: it should read like a well-written article from New
Scientist, The Economist, a university press book or a museum journal, adapted for the test.

## 3. Passage format

- Title (2–8 words) and optionally a one-line standfirst/subtitle in italics, as real passages have.
- 5–8 paragraphs. Label them A, B, C… (`label`) whenever the questions include `headings` or
  `match_info`; otherwise labels are optional (still allowed).
- At least one paragraph should contain numbers/dates/names that questions can target.
- No headings inside the text. No bullet lists. No first-person learner address.
- For `diagram_label` the passage must describe a physical object/process in enough detail
  that each label is recoverable from the text.

## 4. Topic

Typical Academic Reading areas: archaeology & history of technology, biology & ecology, earth
science & climate, psychology & cognition, linguistics, economics & business history, urban
planning & architecture, health & medicine, education, arts & cultural history, materials &
engineering, astronomy, agriculture & food.
Pick an area not used in the last 5 passages and a specific angle (e.g. not "bees" but
"how honeybee colonies choose a new nest site"). The content must be factually plausible; when
you mention real facts keep them accurate, otherwise use invented but realistic researchers
(e.g. "Dr Hannah Reyes of the University of Otago") — never invent quotes for real people.

## 5. Question types and mix

16 types (ids used in the JSON):

| id | Name | Answer form | Order follows text? |
|---|---|---|---|
| tfng | TRUE / FALSE / NOT GIVEN | TRUE/FALSE/NOT GIVEN | yes |
| ynng | YES / NO / NOT GIVEN (writer's views/claims) | YES/NO/NOT GIVEN | yes |
| mcq | Multiple choice, one answer A–D | letter | yes |
| mcq_multi | Choose TWO (or THREE) letters A–E (A–G) | letters, any order | n/a |
| headings | Matching headings (list i–x) | roman numeral | no |
| match_info | Which paragraph contains the following information | paragraph letter | no |
| match_features | Match statements to people/dates/places (list A–E) | letter | no |
| sentence_endings | Complete each sentence with the correct ending A–G | letter | yes |
| sentence_completion | Complete the sentences (words from text) | words | yes |
| summary_completion | Complete the summary (words from text) | words | usually |
| summary_box | Complete the summary using the list of words A–J | letter | usually |
| note_completion | Complete the notes (words from text) | words | usually |
| table_completion | Complete the table (words from text) | words | usually |
| flowchart_completion | Complete the flow-chart (words from text) | words | yes |
| diagram_label | Label the diagram (words from text) | words | no |
| short_answer | Answer the questions (words from text) | words | yes |

Mix rules:
- 3 groups per passage (2 or 4 allowed), numbered continuously 1..13 (or 1..14). Each group has
  3–7 items (`headings` 4–7, `mcq` 2–4, `mcq_multi` 2 or 3 numbers).
- Combine one "locate & check" type (tfng/ynng/mcq/match_*), one completion type and one
  matching/global type, as real passages do.
- `ynng` only on texts that state the writer's opinions/claims; `tfng` on factual texts.
  Never both in one passage. `headings` and `match_info` not both in one passage.
- Coverage: across the last 8 passages every type should appear at least once. Prefer, in order:
  (a) types absent from the last 8 passages, (b) the learner's weakest types (lowest accuracy in
  `profile.typeStats` with ≥ 3 items attempted), (c) types typical of the level band
  (5.0–6.0: tfng, completion types, short_answer, match_info, flowchart, diagram;
  6.5–7.0: headings, match_features, mcq, summary_box, sentence_completion;
  ≥ 7.5: ynng, mcq, mcq_multi, sentence_endings, summary_box, match_features).
- Do not reuse exactly the same three types as the previous passage.

## 6. Item-writing rules (the quality bar)

General
- Every item is answerable from the passage alone, with exactly one defensible answer.
- Items for ordered types follow the order of information in the text.
- Item wording paraphrases the text at the level's intensity; never lift the answer sentence
  verbatim except for the answer words themselves in completion tasks. In completion tasks the
  words around each gap must also be reworded (not "held in tanks of [[11]] seawater" when the
  text says "held in tanks of aerated seawater").
- Spread items across the whole passage; one group should not test only one paragraph.
- Use official instruction wording (section 8).

TRUE/FALSE/NOT GIVEN & YES/NO/NOT GIVEN
- TRUE/YES: the statement is a paraphrase of the text. FALSE/NO: the text directly contradicts
  it (opposite fact, wrong comparison, wrong qualifier such as all/some, always/sometimes).
  NOT GIVEN: the text discusses the topic but gives no information either way; it must be tempting
  (same entities, a plausible extra detail, a cause/comparison not stated).
- In a group of 4–7 items each of the three answers appears at least once, no answer more
  than 3 times, and the answers are not in a guessable pattern.

Multiple choice
- 4 options of similar length and grammar. Distractors use words/ideas from the passage but are
  wrong (wrong person, wrong time, overgeneralised, reversed cause). No "all of the above".
- `mcq_multi`: 5 options for TWO answers, 7 for THREE; the correct ones come from different
  parts of the text.

Matching
- `headings`: 2–3 more headings than paragraphs to match; headings capture the main idea of the
  whole paragraph, not one detail; at least two distractor headings share vocabulary with a
  paragraph. An example (`example`) may be given for the first paragraph; then that heading is
  not used again. Each heading used at most once.
- `match_info`: items describe a type of information ("a reference to…", "an explanation of…",
  "an example of…"); include the note "NB You may use any letter more than once." Not every
  paragraph needs to be used.
- `match_features`: 3–5 options; items paraphrase claims; some options may be used more than
  once (add the NB note) or not at all.
- `sentence_endings`: 2–3 more endings than beginnings; every ending is grammatically possible
  with every beginning, so grammar cannot give the answer away.

Completion (sentence/summary/note/table/flowchart/diagram/short_answer)
- Answers are words copied EXACTLY from the passage (same form and spelling), within the
  stated word limit, and they fit grammatically. Numbers can be written as figures.
- The word limit is one of: `ONE WORD ONLY`, `ONE WORD AND/OR A NUMBER`, `NO MORE THAN TWO WORDS`,
  `NO MORE THAN TWO WORDS AND/OR A NUMBER`, `NO MORE THAN THREE WORDS`,
  `NO MORE THAN THREE WORDS AND/OR A NUMBER`. Use maxWords/allowNumber to match.
- List genuine variants in `alt` (e.g. "18th century" / "eighteenth century", British/US
  spelling, singular when the text has both). Do not list wrong-form variants.
- `summary_box`: 10 options (A–J) for 5–6 gaps, mostly the same word class; options paraphrase
  the text, they are not copied from it.
- Summaries/notes/tables cover a section of the text, not the whole of it.

Explanations (shown to the learner after submission, in Simplified Chinese)
- `ev.p` = paragraph label (or index "1","2"… when unlabelled), `ev.q` = an exact quote of the
  evidence sentence or clause (must be a substring of that paragraph's text).
- `why` = 1–3 Chinese sentences: where the answer is, the paraphrase pairs
  ("题干 X ↔ 原文 Y"), and for FALSE/NOT GIVEN/distractors why the tempting option is wrong.
- `vocab`: 8–12 useful academic words or phrases from the passage with Chinese meanings.

## 7. JSON schema

`data/passages/<id>.json`:
```json
{
  "id": "2026-10-30",
  "date": "2026-10-30",
  "level": 6.5,
  "style": "P2",                 // P1 | P2 | P3, from the level table
  "topicArea": "biology & ecology",
  "title": "…",
  "subtitle": "…",               // optional, "" if none
  "paragraphs": [ {"label": "A", "text": "…"} ],   // label "" when unlabelled
  "groups": [ GROUP, … ],
  "total": 13,
  "suggestedMinutes": 20,
  "vocab": [ {"w": "mitigate", "zh": "减轻；缓和"} ],
  "generatedAt": "2026-10-30T06:50:00+08:00",
  "spec": "v1"
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
- summary_box: "Complete the summary using the list of words, A–J, below."
- completion types: "Complete the {sentences|summary|notes|table|flow-chart|diagram} below.",
  "Choose {WORD LIMIT} from the passage for each answer."
- short_answer: "Answer the questions below.", "Choose {WORD LIMIT} from the passage for each answer."
