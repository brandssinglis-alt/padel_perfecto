// Makes each pro scene's cover image (content/covers/<id>.png, 1080x1920) with the brand kit's cover design.
// The video opens on it for a moment, and it is the cover image used when posting.
//   node covers.mjs [ids]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // the container's global Playwright
import fs from "node:fs";
const KEY = { "Level Up": "level-up", "Shot School": "shot-school", "Court Zones": "court-zones", "Myth or Fact": "myth-or-fact", "Kit Room": "kit-room" };
const wanted = process.argv.slice(2);
const scenes = fs.readdirSync("content/scenes").filter((f) => f.endsWith(".json") && (!wanted.length || wanted.some((w) => f.startsWith(w))))
  .map((f) => JSON.parse(fs.readFileSync(`content/scenes/${f}`, "utf8"))).filter((s) => s.format === "pro" && s.cover);
const js = fs.readFileSync("src/brand/brand.js", "utf8");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Inter:wght@400;600;800&display=swap"><style>html,body{margin:0}svg{display:block}</style></head><body><div id=o></div><script>${js}</script></body></html>`);
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
fs.mkdirSync("content/covers", { recursive: true });
for (const s of scenes) {
  const n = Number((s.series.match(/#(\d+)/) || [])[1] || 1);
  const opts = { sample: { n, lines: s.cover.lines, hi: s.cover.hi ?? s.cover.lines.length - 1 }, tag: s.series.toUpperCase().replace(" #", "  #") };
  await p.evaluate(([ch, opts]) => { const o = document.getElementById("o"); o.innerHTML = PP.cover("pp", ch, opts); const v = o.firstChild; v.setAttribute("width", 1080); v.setAttribute("height", 1920); PP.fit(document); }, [KEY[s.chapter], opts]);
  await p.screenshot({ path: `content/covers/${s.id}.png`, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  console.log(`content/covers/${s.id}.png`);
}
await b.close();
