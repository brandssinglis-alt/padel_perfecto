// Checks scene files before rendering: shape, coordinates on court, sensible timing.
import fs from "node:fs";
const dir = "content/scenes";
let bad = 0;
const onCourt = (p, team) => Array.isArray(p) && p[0] >= 0 && p[0] <= 10 && p[1] >= 0 && p[1] <= 20 &&
  (!team || (team === "A" ? p[1] >= 10 : p[1] <= 10));
// Pro scenes (src/pro/types.ts): positions, shots, timing and text limits.
const PIDS = ["A1", "A2", "B1", "B2"];
const SHOTS = ["forehand", "backhand", "volley", "bigswing", "smash", "serve", "lob"];
const CHAPTERS = ["Level Up", "Shot School", "Court Zones", "Myth or Fact", "Kit Room"];
function validatePro(s, f, errs) {
  for (const k of ["id", "chapter", "series", "level", "hook", "cta"]) if (typeof s[k] !== "string") errs.push(`missing ${k}`);
  if (s.id && !f.startsWith(s.id)) errs.push("file name must start with id");
  if (!CHAPTERS.includes(s.chapter)) errs.push(`chapter must be one of ${CHAPTERS.join(", ")}`);
  if (s.hook && s.hook.length > 60) errs.push("hook over 60 chars");
  if (s.cta && s.cta.length > 60) errs.push("cta over 60 chars");
  for (const k of PIDS) if (!onCourt(s.start?.[k], k[0])) errs.push(`start: ${k} off court or wrong half`);
  if (!Array.isArray(s.beats) || s.beats.length < 2 || s.beats.length > 6) { errs.push("need 2-6 beats"); return; }
  let total = 0;
  s.beats.forEach((b, i) => {
    const at = (x, what) => { if (!(x >= 0 && x <= b.seconds)) errs.push(`beat ${i}: ${what} time ${x} outside 0-${b.seconds}s`); };
    total += b.seconds;
    if (typeof b.text !== "string" || b.text.length > 70) errs.push(`beat ${i}: text missing or over 70 chars`);
    if (b.say !== undefined && (typeof b.say !== "string" || b.say.length > 160)) errs.push(`beat ${i}: say over 160 chars`);
    if (!(b.seconds >= 2 && b.seconds <= 6)) errs.push(`beat ${i}: seconds must be 2-6`);
    for (const k of Object.keys(b.players ?? {})) if (!PIDS.includes(k) || !onCourt(b.players[k], k[0])) errs.push(`beat ${i}: ${k} off court or wrong half`);
    for (const key of b.keys ?? []) { at(key.at, "key"); for (const k of Object.keys(key.to ?? {})) if (!onCourt(key.to[k], k[0])) errs.push(`beat ${i}: key ${k} off court`); }
    for (const sh of b.shots ?? []) {
      if (!PIDS.includes(sh.by)) errs.push(`beat ${i}: shot by unknown player ${sh.by}`);
      if (!SHOTS.includes(sh.type)) errs.push(`beat ${i}: unknown shot type ${sh.type}`);
      at(sh.at, "shot");
      if (sh.to && !onCourt(sh.to)) errs.push(`beat ${i}: shot target off court`);
      if (sh.bounce && !onCourt(sh.bounce)) errs.push(`beat ${i}: bounce off court`);
    }
    for (const g of b.gestures ?? []) { if (!PIDS.includes(g.who)) errs.push(`beat ${i}: gesture by unknown ${g.who}`); at(g.at, "gesture"); }
    for (const c of b.camera ?? []) { if (!["tactics", "follow", "side", "behind"].includes(c.mode)) errs.push(`beat ${i}: unknown camera ${c.mode}`);
      if ((c.mode === "side" || c.mode === "behind") && !PIDS.includes(c.target)) errs.push(`beat ${i}: camera ${c.mode} needs a target player`); at(c.at, "camera"); }
    for (const x of [...(b.badges ?? []), ...(b.bubbles ?? []), ...(b.cards ?? []), ...(b.zones ?? []), ...(b.arrows ?? [])]) if (x.at !== undefined) at(x.at, "overlay");
    if (b.freezeAt !== undefined) at(b.freezeAt, "freeze");
  });
  if (total > 28) errs.push(`beats total ${total}s, keep under 28s`);
}

for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
  const errs = [];
  let s; try { s = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")); } catch (e) { errs.push("invalid JSON"); }
  if (s && s.format === "pro") validatePro(s, f, errs);
  else if (s) {
    for (const k of ["id", "level", "hook", "cta"]) if (typeof s[k] !== "string") errs.push(`missing ${k}`);
    if (s.id && !f.startsWith(s.id)) errs.push("file name must start with id");
    if (s.hook && s.hook.length > 60) errs.push("hook over 60 chars");
    if (!Array.isArray(s.beats) || s.beats.length < 2 || s.beats.length > 6) errs.push("need 2-6 beats");
    let total = 0;
    (s.beats || []).forEach((b, i) => {
      total += b.seconds;
      if (!b.text || b.text.length > 70) errs.push(`beat ${i}: text missing or over 70 chars`);
      if (!(b.seconds >= 2 && b.seconds <= 5)) errs.push(`beat ${i}: seconds must be 2-5`);
      for (const k of ["A1", "A2", "B1", "B2"]) if (!onCourt(b.players?.[k], k[0])) errs.push(`beat ${i}: ${k} off court or wrong half`);
      if (b.ball && !onCourt(b.ball)) errs.push(`beat ${i}: ball off court`);
    });
    if (total > 25) errs.push(`beats total ${total}s, keep under 25s`);
  }
  if (errs.length) { bad++; console.log(`✗ ${f}\n  - ${errs.join("\n  - ")}`); } else console.log(`✓ ${f}`);
}
process.exit(bad ? 1 : 0);
