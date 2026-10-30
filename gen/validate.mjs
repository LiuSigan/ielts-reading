// IELTS daily reading — passage/key validator (spec v2)
// Usage: node validate.mjs passage.json key.json
// Prints ERROR / WARN lines and ends with OK or FAILED (exit code 1).
import { readFileSync } from "node:fs";

const [, , pPath, kPath] = process.argv;
if (!pPath || !kPath) {
  console.error("usage: node validate.mjs passage.json key.json");
  process.exit(2);
}
const P = JSON.parse(readFileSync(pPath, "utf8"));
const K = JSON.parse(readFileSync(kPath, "utf8"));

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

// ---- shared helpers (keep in sync with the page) ----
export function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/-/g, " ")
    .replace(/[.,;:!?"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const isNum = (t) => /^[\d][\d.,%:/]*$/.test(t) || /^[£$€]\d/.test(t);
export function countTokens(ans) {
  const toks = norm(ans).split(" ").filter(Boolean);
  const nums = toks.filter(isNum).length;
  return { words: toks.length - nums, nums, total: toks.length };
}
function withinLimit(ans, g) {
  const c = countTokens(ans);
  if (g.allowNumber) return c.words <= g.maxWords && c.nums <= 1;
  return c.total <= g.maxWords;
}
const squash = (s) => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const hasCJK = (s) => /[一-鿿]/.test(s || "");
const wc = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

const TYPES = ["tfng", "ynng", "mcq", "mcq_multi", "headings", "match_info", "match_features", "sentence_endings",
  "sentence_completion", "summary_completion", "summary_box", "note_completion", "table_completion",
  "flowchart_completion", "diagram_label", "short_answer"];
const WORD_TYPES = ["sentence_completion", "summary_completion", "note_completion", "table_completion",
  "flowchart_completion", "diagram_label", "short_answer"];
const GAP_TYPES = ["sentence_completion", "summary_completion", "summary_box", "note_completion",
  "table_completion", "flowchart_completion"];
const ORDERED = ["tfng", "ynng", "mcq", "sentence_endings", "sentence_completion", "flowchart_completion", "short_answer"];
const LIMITS = {
  "ONE WORD ONLY": [1, false],
  "ONE WORD AND/OR A NUMBER": [1, true],
  "NO MORE THAN TWO WORDS": [2, false],
  "NO MORE THAN TWO WORDS AND/OR A NUMBER": [2, true],
  "NO MORE THAN THREE WORDS": [3, false],
  "NO MORE THAN THREE WORDS AND/OR A NUMBER": [3, true],
};
const LEVELS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
const WORDS_BY_LEVEL = (l) => (l <= 5.5 ? [700, 800] : l <= 6.5 ? [800, 900] : l <= 7.5 ? [880, 980] : [950, 1100]);
const STOP = new Set("a an the of in on at to for from by with and or but as is are was were be been that this these those it its their there which who whom whose than then into onto about over under after before during between".split(" "));
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
const letters = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

// ---- passage ----
for (const f of ["id", "date", "level", "slot", "style", "topicArea", "title", "paragraphs", "groups", "total"]) {
  if (P[f] === undefined || P[f] === "") err(`passage.${f} missing`);
}
if (K.id !== P.id) err(`key.id (${K.id}) != passage.id (${P.id})`);
if (!/^\d{4}-\d{2}-\d{2}(-[b-z])?$/.test(P.id || "")) err(`id must be YYYY-MM-DD or YYYY-MM-DD-b…`);
if (!LEVELS.includes(P.level)) err(`level ${P.level} not in ${LEVELS.join(",")}`);
if (!["P1", "P2", "P3"].includes(P.style)) err(`style must be P1|P2|P3`);
const isP3 = P.slot === "p3";
if (!["main", "p3"].includes(P.slot)) err(`slot must be "main" or "p3"`);
if (isP3 !== /-p$/.test(P.id || "")) err(`Part 3 passages (and only they) use ids ending in -p`);
if (isP3 && P.style !== "P3") err(`Part 3 passage must have style P3`);
if (isP3 && P.level < 7) err(`Part 3 passage level ${P.level} (want ≥ 7.0)`);

const paras = Array.isArray(P.paragraphs) ? P.paragraphs : [];
if (paras.length < 5 || paras.length > 8) err(`paragraph count ${paras.length} (want 5–8)`);
const labels = paras.map((p) => p.label || "");
const labelled = labels.every((l) => l);
const paraKey = (p, i) => p.label || String(i + 1);
const paraMap = new Map(paras.map((p, i) => [paraKey(p, i), squash(p.text)]));
const fullText = paras.map((p) => squash(p.text)).join("\n");
const fullNorm = " " + norm(fullText) + " ";
const words = paras.reduce((s, p) => s + wc(p.text), 0);
const [wmin, wmax] = isP3 ? [Math.max(900, WORDS_BY_LEVEL(P.level)[0]), 1100] : WORDS_BY_LEVEL(P.level);
if (words < wmin * 0.9 || words > wmax * 1.12) err(`passage has ${words} words; level ${P.level} wants ${wmin}–${wmax}`);
else if (words < wmin || words > wmax) warn(`passage has ${words} words; level ${P.level} wants ${wmin}–${wmax}`);
if (labelled && labels.join("") !== letters(paras.length).join("")) err(`paragraph labels must be A, B, C… in order`);
if (labels.some(Boolean) && !labelled) err(`label all paragraphs or none`);

// ---- groups & numbering ----
const groups = Array.isArray(P.groups) ? P.groups : [];
if (groups.length < 2 || groups.length > 4) err(`group count ${groups.length} (want 2–4, normally 3)`);
const types = groups.map((g) => g.type);
types.forEach((t) => !TYPES.includes(t) && err(`unknown group type ${t}`));
if (types.includes("tfng") && types.includes("ynng")) err(`tfng and ynng in one passage`);
if (types.includes("headings") && types.includes("match_info")) err(`headings and match_info in one passage`);
if ((types.includes("headings") || types.includes("match_info")) && !labelled) err(`headings/match_info need labelled paragraphs`);
if (new Set(types).size !== types.length) warn(`repeated group type in one passage`);

let expect = 1;
for (const g of groups) {
  if (g.from !== expect) err(`group ${g.type} starts at ${g.from}, expected ${expect}`);
  if (!(g.to >= g.from)) err(`group ${g.type} has bad range ${g.from}-${g.to}`);
  expect = g.to + 1;
  if (!Array.isArray(g.instructions) || g.instructions.length === 0) err(`group ${g.type} has no instructions`);
}
const total = expect - 1;
if (total !== P.total) err(`numbering ends at ${total} but total=${P.total}`);
if (![13, 14].includes(total)) err(`total questions ${total} (want 13, or 14 at level ≥ 7.5 / Part 3)`);
if (total === 14 && P.level < 7.5 && !isP3) warn(`14 questions below level 7.5`);
if (isP3 && total !== 14) warn(`Part 3 normally has 14 questions`);

// ---- key coverage ----
const A = K.answers || {};
for (let n = 1; n <= total; n++) {
  const a = A[String(n)];
  if (!a) { err(`key missing Q${n}`); continue; }
  if (a.a === undefined || a.a === "") err(`Q${n} has empty answer`);
  if (!a.ev || !a.ev.p || !a.ev.q) err(`Q${n} missing evidence ev.p/ev.q`);
  else {
    const pt = paraMap.get(String(a.ev.p));
    if (!pt) err(`Q${n} evidence paragraph ${a.ev.p} does not exist`);
    else if (!pt.includes(squash(a.ev.q))) err(`Q${n} evidence quote not found verbatim in paragraph ${a.ev.p}: "${String(a.ev.q).slice(0, 70)}…"`);
  }
  if (!hasCJK(a.why)) err(`Q${n} explanation (why) must be Chinese`);
}
Object.keys(A).forEach((n) => (+n < 1 || +n > total) && err(`key has extra answer ${n}`));

const evPos = (n) => {
  const a = A[String(n)];
  return a && a.ev ? fullText.indexOf(squash(a.ev.q)) : -1;
};
const nums = (g) => Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i);
const itemsMatchRange = (g) => {
  const ns = (g.items || []).map((i) => i.n);
  if (ns.join(",") !== nums(g).join(",")) err(`group ${g.type} items ${ns.join(",")} do not match ${g.from}-${g.to}`);
};
const optKeys = (g) => (g.options || []).map((o) => o.k);
const longestCopy = (text) => {
  const t = norm(text).split(" ");
  let best = 0;
  for (let i = 0; i < t.length; i++) {
    for (let j = i + best + 1; j <= t.length; j++) {
      if (fullNorm.includes(" " + t.slice(i, j).join(" ") + " ")) best = j - i;
      else break;
    }
  }
  return best;
};

const copyCheck = (label, text) => {
  const L = longestCopy(text);
  if (L >= 8) err(`${label} repeats ${L} consecutive words of the text — paraphrase it`);
  else if (L >= 6) warn(`${label} repeats ${L} consecutive words of the text`);
};
// A gap whose neighbouring content word sits next to the answer in the text is a giveaway.
const gapContext = (g, body) => {
  const parts = String(body).split(/\[\[(\d+)\]\]/);
  for (let i = 1; i < parts.length; i += 2) {
    const n = +parts[i], a = A[String(n)];
    if (!a || g.type === "summary_box") continue;
    const before = norm(parts[i - 1]).split(" ").filter(Boolean).slice(-2);
    const after = norm(parts[i + 1] || "").split(" ").filter(Boolean).slice(0, 2);
    const ans = norm(a.a);
    const content = (ws) => ws.some((w) => !STOP.has(w) && !isNum(w));
    if (before.length && content(before) && fullNorm.includes(" " + before.join(" ") + " " + ans + " ")) err(`Q${n}: "${before.join(" ")} ___" is copied from the text next to the answer — reword the gap context`);
    if (after.length && content(after) && fullNorm.includes(" " + ans + " " + after.join(" ") + " ")) err(`Q${n}: "___ ${after.join(" ")}" is copied from the text next to the answer — reword the gap context`);
  }
};

// ---- per type ----
for (const g of groups) {
  const ns = nums(g);
  const size = ns.length;
  const ans = ns.map((n) => (A[String(n)] || {}).a);
  const T = g.type;

  if (WORD_TYPES.includes(T)) {
    const lim = LIMITS[g.wordLimit];
    if (!lim) err(`${T}: wordLimit "${g.wordLimit}" not an official wording`);
    else if (lim[0] !== g.maxWords || lim[1] !== !!g.allowNumber) err(`${T}: maxWords/allowNumber do not match "${g.wordLimit}"`);
    const instr = (g.instructions || []).join(" ");
    if (lim && !instr.includes(g.wordLimit)) err(`${T}: instructions must contain "${g.wordLimit}"`);
    ns.forEach((n) => {
      const a = A[String(n)];
      if (!a) return;
      if (!withinLimit(a.a, g)) err(`Q${n} answer "${a.a}" breaks ${g.wordLimit}`);
      (a.alt || []).forEach((x) => !withinLimit(x, g) && err(`Q${n} alt "${x}" breaks ${g.wordLimit}`));
      if (!fullNorm.includes(" " + norm(a.a) + " ")) err(`Q${n} answer "${a.a}" is not copied from the passage`);
    });
  }

  if (GAP_TYPES.includes(T)) {
    let body = "";
    if (T === "sentence_completion") { itemsMatchRange(g); body = (g.items || []).map((i) => i.text).join(" "); }
    if (T === "summary_completion" || T === "summary_box") body = g.text || "";
    if (T === "note_completion") body = (g.lines || []).map((l) => l.text).join(" ");
    if (T === "table_completion") body = [...(g.head || []), ...(g.rows || []).flat()].join(" ");
    if (T === "flowchart_completion") body = (g.steps || []).join(" ");
    if (T === "sentence_completion") (g.items || []).forEach((i) => gapContext(g, i.text));
    else if (T === "table_completion") [...(g.head || []), ...(g.rows || []).flat()].forEach((c) => gapContext(g, c));
    else if (T === "note_completion") (g.lines || []).forEach((l) => gapContext(g, l.text));
    else if (T === "flowchart_completion") (g.steps || []).forEach((st) => gapContext(g, st));
    else gapContext(g, body);
    String(body).split(/\[\[\d+\]\]/).forEach((chunk, i) => copyCheck(`${T} text (part ${i + 1})`, chunk));
    ns.forEach((n) => {
      const c = body.split(`[[${n}]]`).length - 1;
      if (c !== 1) err(`${T}: gap [[${n}]] appears ${c} times`);
    });
    const stray = (body.match(/\[\[(\d+)\]\]/g) || []).map((m) => +m.slice(2, -2)).filter((n) => !ns.includes(n));
    if (stray.length) err(`${T}: stray gaps ${stray.join(",")}`);
    if (T === "sentence_completion") (g.items || []).forEach((i) => (i.text.match(/\[\[/g) || []).length !== 1 && err(`Q${i.n} must have exactly one gap`));
    if (T === "table_completion") {
      const w = (g.head || []).length;
      (g.rows || []).forEach((r, i) => r.length !== w && err(`table row ${i + 1} has ${r.length} cells, head has ${w}`));
    }
  }

  switch (T) {
    case "tfng":
    case "ynng": {
      itemsMatchRange(g);
      const vals = T === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];
      ans.forEach((a, i) => !vals.includes(a) && err(`Q${ns[i]} answer must be ${vals.join("/")}`));
      if (size < 4 || size > 7) err(`${T} group size ${size} (want 4–7)`);
      vals.forEach((v) => {
        const c = ans.filter((a) => a === v).length;
        if (size >= 4 && c === 0) err(`${T}: no ${v} answer in group`);
        if (c > 3) err(`${T}: ${v} used ${c} times (max 3)`);
      });
      (g.items || []).forEach((it) => copyCheck(`Q${it.n}`, it.text));
      break;
    }
    case "mcq": {
      itemsMatchRange(g);
      if (size < 2 || size > 4) err(`mcq group size ${size} (want 2–4)`);
      (g.items || []).forEach((it) => {
        const ks = (it.options || []).map((o) => o.k).join("");
        if (ks !== "ABCD") err(`Q${it.n} options must be A–D`);
        copyCheck(`Q${it.n} stem`, it.text);
        (it.options || []).forEach((o) => copyCheck(`Q${it.n} option ${o.k}`, o.t));
        const lens = (it.options || []).map((o) => wc(o.t));
        if (Math.max(...lens) > 2.5 * Math.min(...lens) + 2) warn(`Q${it.n} option lengths uneven (${lens.join("/")})`);
      });
      ans.forEach((a, i) => !"ABCD".includes(a || "x") && err(`Q${ns[i]} answer must be A–D`));
      break;
    }
    case "mcq_multi": {
      if (![2, 3].includes(g.pick) || size !== g.pick) err(`mcq_multi: pick=${g.pick} but ${size} numbers`);
      const want = g.pick === 2 ? 5 : 7;
      if (optKeys(g).join("") !== letters(want).join("")) err(`mcq_multi: pick ${g.pick} needs options A–${letters(want).pop()}`);
      if (new Set(ans).size !== ans.length) err(`mcq_multi: answers must be distinct letters`);
      ans.forEach((a, i) => !optKeys(g).includes(a) && err(`Q${ns[i]} answer ${a} not an option`));
      if (!g.text) err(`mcq_multi: missing question text`);
      (g.options || []).forEach((o) => copyCheck(`mcq_multi option ${o.k}`, o.t));
      break;
    }
    case "headings": {
      itemsMatchRange(g);
      if (size < 4 || size > 7) err(`headings group size ${size} (want 4–7)`);
      const ks = optKeys(g);
      if (ks.join(",") !== ROMAN.slice(0, ks.length).join(",")) err(`headings options must be i, ii, iii…`);
      const need = size + 3 + (g.example ? 1 : 0);
      if (ks.length < need) err(`headings: ${ks.length} headings for ${size} items${g.example ? " + example" : ""} (want ≥ ${need})`);
      if (new Set(ans).size !== ans.length) err(`headings: a heading is used twice`);
      if (g.example && ans.includes(g.example.k)) err(`headings: example heading reused`);
      ans.forEach((a, i) => !ks.includes(a) && err(`Q${ns[i]} heading ${a} not in list`));
      const ps = (g.items || []).map((i) => i.para);
      if (new Set(ps).size !== ps.length) err(`headings: paragraph repeated`);
      ps.forEach((p) => !labels.includes(p) && err(`headings: paragraph ${p} does not exist`));
      if (g.example && ps.includes(g.example.para)) err(`headings: example paragraph also asked`);
      (g.items || []).forEach((it) => { const a = A[String(it.n)]; if (a && a.ev && a.ev.p !== it.para) err(`Q${it.n} evidence must be in paragraph ${it.para}`); });
      break;
    }
    case "match_info": {
      itemsMatchRange(g);
      ans.forEach((a, i) => !labels.includes(a) && err(`Q${ns[i]} answer ${a} is not a paragraph letter`));
      ns.forEach((n) => { const a = A[String(n)]; if (a && a.ev && a.ev.p !== a.a) err(`Q${n} evidence paragraph ${a.ev.p} != answer ${a.a}`); });
      if (!(g.instructions || []).join(" ").includes("NB")) warn(`match_info: add "NB You may use any letter more than once."`);
      (g.items || []).forEach((it) => copyCheck(`Q${it.n}`, it.text));
      break;
    }
    case "match_features": {
      itemsMatchRange(g);
      const ks = optKeys(g);
      if (ks.length < 4 || ks.length > 7) err(`match_features: ${ks.length} options (want 4–6, max 7)`);
      if (ks.every((k) => ans.includes(k))) err(`match_features: every option is used — add at least one option that is never the answer`);
      if (size >= 4 && new Set(ans).size === ans.length) warn(`match_features: with 4+ items, use one option twice`);
      (g.items || []).forEach((it) => copyCheck(`Q${it.n}`, it.text));
      if (ks.join("") !== letters(ks.length).join("")) err(`match_features options must be A, B, C…`);
      ans.forEach((a, i) => !ks.includes(a) && err(`Q${ns[i]} answer ${a} not an option`));
      const reused = new Set(ans).size < ans.length;
      if (reused && !(g.instructions || []).join(" ").includes("NB")) err(`match_features: letters reused but no NB note`);
      if (!g.listTitle) err(`match_features: listTitle missing`);
      break;
    }
    case "sentence_endings": {
      itemsMatchRange(g);
      const ks = optKeys(g);
      if (ks.length < size + 3) err(`sentence_endings: ${ks.length} endings for ${size} beginnings (want ≥ ${size + 3})`);
      (g.items || []).forEach((it) => copyCheck(`Q${it.n}`, it.text));
      (g.options || []).forEach((o) => copyCheck(`ending ${o.k}`, o.t));
      if (ks.join("") !== letters(ks.length).join("")) err(`sentence_endings options must be A, B, C…`);
      if (new Set(ans).size !== ans.length) err(`sentence_endings: an ending is used twice`);
      ans.forEach((a, i) => !ks.includes(a) && err(`Q${ns[i]} answer ${a} not an option`));
      break;
    }
    case "summary_box": {
      const ks = optKeys(g);
      if (ks.length < size + 5) err(`summary_box: ${ks.length} options for ${size} gaps (want ≥ ${size + 5})`);
      if (ks.join("") !== letters(ks.length).join("")) err(`summary_box options must be A, B, C…`);
      ans.forEach((a, i) => !ks.includes(a) && err(`Q${ns[i]} answer ${a} not an option`));
      if (new Set(ans).size !== ans.length) warn(`summary_box: an option is used twice`);
      break;
    }
    case "diagram_label": {
      const s = String(g.svg || "");
      if (!/^<svg[\s>]/.test(s.trim())) err(`diagram_label: svg must start with <svg`);
      if (/<script|on[a-z]+\s*=|foreignObject|href\s*=\s*["']?(https?:|javascript:)/i.test(s)) err(`diagram_label: svg contains scripts/handlers/external refs`);
      ns.forEach((n) => !new RegExp(`>\\s*${n}\\s*<`).test(s) && err(`diagram_label: svg has no label box for ${n}`));
      if (size < 3 || size > 6) err(`diagram_label group size ${size} (want 3–6)`);
      break;
    }
    case "short_answer":
      itemsMatchRange(g);
      (g.items || []).forEach((it) => { if (!/\?\s*$/.test(it.text)) warn(`Q${it.n} short answer should be a question`); copyCheck(`Q${it.n}`, it.text); });
      break;
  }

  if (ORDERED.includes(T)) {
    const pos = ns.map(evPos);
    for (let i = 1; i < pos.length; i++) if (pos[i] >= 0 && pos[i - 1] >= 0 && pos[i] < pos[i - 1]) warn(`${T}: Q${ns[i]} comes before Q${ns[i - 1]} in the text (ordered type)`);
  }
}

// ---- spread & extras ----
const usedParas = new Set(Object.values(A).map((a) => a && a.ev && String(a.ev.p)));
if (usedParas.size < Math.ceil(paras.length * 0.6)) warn(`questions only test ${usedParas.size}/${paras.length} paragraphs`);
const v = Array.isArray(P.vocab) ? P.vocab.length : 0;
if (v < 8 || v > 12) warn(`vocab has ${v} entries (want 8–12)`);

console.log(`${P.id} · level ${P.level} · ${words} words · ${total} Qs · ${types.join(", ")}`);
warns.forEach((m) => console.log("WARN  " + m));
errors.forEach((m) => console.log("ERROR " + m));
if (errors.length) { console.log(`FAILED (${errors.length} errors)`); process.exit(1); }
console.log("OK");
