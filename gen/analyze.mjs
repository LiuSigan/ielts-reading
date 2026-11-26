// IELTS daily reading — error review helper (spec v6)
// Usage: node gen/analyze.mjs [--last N] [--since YYYY-MM-DD] [--state state.json]
// Reads the learner's attempts from the sync API (config.json apiBase) or a saved state file,
// keeps the FIRST attempt per passage, and prints every wrong or blank item with:
//   question type, the item / gap context, the learner's answer (with option text),
//   the correct answer (with option text), the evidence quote and the key's explanation.
// Read-only: it never writes to the API.
import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const last = Number(opt("--last") || 0);
const since = opt("--since");
const stateFile = opt("--state");

const root = new URL("..", import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(root + "config.json", "utf8"));

let state;
if (stateFile) state = JSON.parse(readFileSync(stateFile, "utf8"));
else {
  const r = await fetch(cfg.apiBase.replace(/\/$/, "") + "/state", { cache: "no-store" });
  if (!r.ok) { console.error("state request failed: " + r.status); process.exit(1); }
  state = await r.json();
}

const first = new Map();
for (const a of [...(state.attempts || [])].sort((x, y) => String(x.submittedAt).localeCompare(String(y.submittedAt))))
  if (!first.has(a.passageId)) first.set(a.passageId, a);
let attempts = [...first.values()];
if (since) attempts = attempts.filter((a) => String(a.submittedAt).slice(0, 10) >= since);
if (last) attempts = attempts.slice(-last);

const short = (s, n = 160) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

function gapContext(text, n) {
  const t = String(text || "");
  const i = t.indexOf(`[[${n}]]`);
  if (i < 0) return "";
  return short(t.slice(Math.max(0, i - 90), i + 90).replace(/\[\[(\d+)\]\]/g, (m, d) => (d == n ? "____" : `(${d})`)), 200);
}

function locate(P, n) {
  for (const g of P.groups || []) {
    if (n < g.from || n > g.to) continue;
    const item = (g.items || []).find((it) => it.n === n);
    let ctx = "";
    if (item && item.text) ctx = short(item.text);
    else if (item && item.para) ctx = "paragraph " + item.para;
    else if (g.text) ctx = gapContext(g.text, n);
    else if (g.lines) ctx = gapContext(g.lines.map((l) => l.text).join(" / "), n);
    else if (g.steps) ctx = gapContext(g.steps.join(" → "), n);
    else if (g.rows) ctx = gapContext(g.rows.map((r) => r.join(" | ")).join(" // "), n);
    if (g.type === "mcq_multi") ctx = short(g.text);
    const options = (item && item.options) || g.options || [];
    return { g, ctx, options };
  }
  return null;
}

const optText = (options, k) => {
  if (!k) return "";
  return String(k).split(/[,\s]+/).filter(Boolean).map((x) => {
    const o = options.find((o) => String(o.k).toLowerCase() === x.toLowerCase());
    return o ? `${x} "${short(o.t, 90)}"` : x;
  }).join(" + ");
};

const totals = {};
for (const a of attempts) {
  const pPath = `${root}data/passages/${a.passageId}.json`, kPath = `${root}data/keys/${a.passageId}.json`;
  const mins = a.durationSec ? Math.round(a.durationSec / 60) + " min" : "?";
  console.log(`\n=== ${a.passageId} [${a.slot}] level ${a.level} · ${a.score}/${a.total} · ${mins} · ${String(a.submittedAt).slice(0, 10)} · ${a.title || ""}`);
  for (const [t, v] of Object.entries(a.byType || {})) {
    const o = (totals[t] ||= { c: 0, t: 0 }); o.c += v.c; o.t += v.t;
  }
  console.log("    by type: " + Object.entries(a.byType || {}).map(([t, v]) => `${t} ${v.c}/${v.t}`).join(", "));
  if (!existsSync(pPath) || !existsSync(kPath)) { console.log("    (passage or key file missing)"); continue; }
  const P = JSON.parse(readFileSync(pPath, "utf8")), K = JSON.parse(readFileSync(kPath, "utf8"));
  const answers = a.answers || {};
  for (const n of a.wrong || []) {
    const loc = locate(P, n);
    const key = (K.answers || {})[String(n)] || {};
    const given = answers[String(n)];
    const type = loc ? loc.g.type : "?";
    const opts = loc ? loc.options : [];
    const choice = ["match_info", "tfng", "ynng"].includes(type) || !opts.length ? (given || "(blank)") : (optText(opts, given) || "(blank)");
    const right = ["match_info", "tfng", "ynng"].includes(type) || !opts.length ? key.a + (key.alt && key.alt.length ? ` (alt: ${key.alt.join(", ")})` : "") : optText(opts, key.a);
    console.log(`  Q${n} [${type}] ${loc ? loc.ctx : ""}`);
    console.log(`     chose: ${choice}   correct: ${right}`);
    if (key.ev) console.log(`     evidence (${key.ev.p}): ${short(key.ev.q, 200)}`);
    if (key.why) console.log(`     key: ${short(key.why, 260)}`);
  }
}

console.log("\n=== totals over the attempts shown");
for (const [t, v] of Object.entries(totals).sort((x, y) => x[1].c / x[1].t - y[1].c / y[1].t))
  console.log(`  ${t.padEnd(22)} ${v.c}/${v.t}  ${Math.round((100 * v.c) / v.t)}%`);
