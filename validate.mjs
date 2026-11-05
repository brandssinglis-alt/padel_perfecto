// Checks scene files before rendering: shape, coordinates on court, sensible timing.
import fs from "node:fs";
const dir = "content/scenes";
let bad = 0;
const onCourt = (p, team) => Array.isArray(p) && p[0] >= 0 && p[0] <= 10 && p[1] >= 0 && p[1] <= 20 &&
  (!team || (team === "A" ? p[1] >= 10 : p[1] <= 10));
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
  const errs = [];
  let s; try { s = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")); } catch (e) { errs.push("invalid JSON"); }
  if (s) {
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
