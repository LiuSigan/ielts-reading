// Cloudflare Worker: stores attempts and the difficulty profile for the IELTS reading site.
// Bindings: KV namespace IELTS, secret WRITE_KEY. Optional var ALLOW_ORIGIN (default "*").
// GET  /state            → { profile, attempts }
// POST /check            → { ok: true }               (verifies X-Key)
// POST /attempt  {...}   → { attempt, profile, change }
// POST /level    {level} → { profile }
const LEVEL_MIN = 5, LEVEL_MAX = 9, DEFAULT_LEVEL = 6.5;
const clampLevel = (l) => Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(l * 2) / 2));

// Same rule as index.html — keep them in sync.
function nextLevel(L, acc, prevAcc) {
  if (acc >= 0.85) return [clampLevel(L + 0.5), "正确率达到 85%，难度升半档"];
  if (acc < 0.5) return [clampLevel(L - 0.5), "正确率低于 50%，难度降半档"];
  if (prevAcc != null && acc >= 0.7 && prevAcc >= 0.7) return [clampLevel(L + 0.5), "连续两篇正确率不低于 70%，难度升半档"];
  if (prevAcc != null && acc < 0.6 && prevAcc < 0.6) return [clampLevel(L - 0.5), "连续两篇正确率低于 60%，难度降半档"];
  return [L, "正确率在 50%–85% 之间，保持当前难度"];
}
function applyAttempt(profile, attempts, a) {
  // Only Part 2 ("main") passages move the level; Part 1 and Part 3 only add to the type stats.
  const fixed = a.adaptive === false || (a.slot && a.slot !== "main");
  const prev = attempts.filter((x) => x.passageId !== a.passageId && (!x.slot || x.slot === "main")).sort((x, y) => String(y.submittedAt).localeCompare(String(x.submittedAt)))[0];
  const fromL = profile && typeof profile.level === "number" ? profile.level : DEFAULT_LEVEL;
  const acc = a.score / a.total;
  const [toL, why] = fixed ? [fromL, "只有 Part 2 参与难度调整"] : nextLevel(fromL, acc, prev ? prev.score / prev.total : null);
  const ts = { ...((profile && profile.typeStats) || {}) };
  for (const [t, v] of Object.entries(a.byType || {})) { const o = ts[t] || { c: 0, t: 0 }; ts[t] = { c: o.c + v.c, t: o.t + v.t }; }
  const hist = ((profile && profile.history) || []).concat([{ id: a.passageId, acc: Math.round(acc * 1000) / 1000, from: fromL, to: toL, why, at: a.submittedAt }]).slice(-300);
  return { profile: { ...(profile || {}), level: toL, typeStats: ts, history: hist, updatedAt: a.submittedAt }, change: { from: fromL, to: toL, why } };
}

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Key",
      "Access-Control-Max-Age": "86400",
    };
    const json = (o, status = 200) => new Response(JSON.stringify(o), {
      status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const { pathname } = new URL(req.url);
    const load = async (k, d) => { const v = await env.IELTS.get(k); return v ? JSON.parse(v) : d; };

    if (req.method === "GET" && pathname === "/state") {
      const [profile, attempts] = await Promise.all([load("profile", null), load("attempts", [])]);
      return json({ profile, attempts });
    }
    if (req.method !== "POST") return json({ error: "not found" }, 404);
    if (!env.WRITE_KEY || req.headers.get("X-Key") !== env.WRITE_KEY) return json({ error: "bad key" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

    if (pathname === "/check") return json({ ok: true });

    if (pathname === "/attempt") {
      const a = body;
      const ok = typeof a.passageId === "string" && /^\d{4}-\d{2}-\d{2}(-[a-z])?$/.test(a.passageId)
        && Number.isInteger(a.score) && Number.isInteger(a.total) && a.total > 0 && a.score >= 0 && a.score <= a.total;
      if (!ok) return json({ error: "bad attempt" }, 400);
      if (JSON.stringify(a).length > 20000) return json({ error: "too large" }, 413);
      const [profile, attempts] = await Promise.all([load("profile", null), load("attempts", [])]);
      const existing = attempts.find((x) => x.passageId === a.passageId);
      if (existing) return json({ attempt: existing, profile, change: null, duplicate: true });
      const out = applyAttempt(profile, attempts, a);
      attempts.push(a);
      await Promise.all([env.IELTS.put("attempts", JSON.stringify(attempts)), env.IELTS.put("profile", JSON.stringify(out.profile))]);
      return json({ attempt: a, profile: out.profile, change: out.change });
    }

    if (pathname === "/level") {
      const to = clampLevel(Number(body.level));
      if (!Number.isFinite(to)) return json({ error: "bad level" }, 400);
      const profile = await load("profile", null);
      const from = profile && typeof profile.level === "number" ? profile.level : DEFAULT_LEVEL;
      const now = new Date().toISOString();
      const hist = ((profile && profile.history) || []).concat([{ id: "manual", from, to, why: "手动调整", at: now }]).slice(-300);
      const next = { ...(profile || {}), level: to, history: hist, updatedAt: now };
      await env.IELTS.put("profile", JSON.stringify(next));
      return json({ profile: next });
    }
    return json({ error: "not found" }, 404);
  },
};
