// Rebuild data/index.json from data/passages/*.json.  Usage: node gen/build-index.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const dir = new URL("../data/passages/", import.meta.url);
const passages = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
  const p = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  return { id: p.id, date: p.date, title: p.title, level: p.level, style: p.style, topicArea: p.topicArea,
    types: p.groups.map((g) => g.type), total: p.total, generatedAt: p.generatedAt };
}).sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)) || b.id.localeCompare(a.id));
writeFileSync(new URL("../data/index.json", import.meta.url), JSON.stringify({ updatedAt: new Date().toISOString(), passages }, null, 1) + "\n");
console.log(`index: ${passages.length} passages, newest ${passages[0] && passages[0].id}`);
