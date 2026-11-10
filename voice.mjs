// Voiceover clips for scenes marked "voiced": true.
// Each spoken line (hook, every beat's text, cta) is cached as content/voice/<hash>.mp3,
// keyed by voice + text, so editing one line only re-voices that line.
//
//   node voice.mjs [ids]    lists the clips still missing, as JSON lines {file, text, voiceId}
//                           With ELEVENLABS_API_KEY set, it generates them directly instead.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOICE_DIR = "content/voice";
export const voiceConfig = () => JSON.parse(fs.readFileSync(`${VOICE_DIR}/config.json`, "utf8"));

// Text as it should be spoken (TTS reads "3 m" badly).
export const spoken = (t) => t.replace(/(\d)\s?m\b/g, "$1 metre").replace(/\bP\b/g, "your partner");

export const clipFile = (voiceId, text) =>
  crypto.createHash("sha1").update(`${voiceId}\n${spoken(text)}`).digest("hex").slice(0, 16) + ".mp3";

// Lines of a scene in play order: intro (hook), one per beat, outro (cta).
export const sceneLines = (scene) => {
  const { voiceId } = voiceConfig();
  const line = (text) => ({ text: spoken(text), voiceId, file: clipFile(voiceId, text) });
  return { intro: line(scene.hook), beats: scene.beats.map((b) => line(b.text)), outro: line(scene.cta) };
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dir = "content/scenes";
  const wanted = process.argv.slice(2);
  const { model } = voiceConfig();
  const missing = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    if (wanted.length && !wanted.some((w) => f.startsWith(w))) continue;
    const scene = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
    if (!scene.voiced) continue;
    const l = sceneLines(scene);
    for (const x of [l.intro, ...l.beats, l.outro]) if (!fs.existsSync(`${VOICE_DIR}/${x.file}`)) missing.set(x.file, x);
  }
  const key = process.env.ELEVENLABS_API_KEY;
  for (const x of missing.values()) {
    if (!key) { console.log(JSON.stringify(x)); continue; }
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${x.voiceId}?output_format=mp3_44100_128`, {
      method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: x.text, model_id: model }) });
    if (!r.ok) { console.error(`failed ${x.file}: ${r.status} ${await r.text()}`); process.exitCode = 1; continue; }
    fs.writeFileSync(`${VOICE_DIR}/${x.file}`, Buffer.from(await r.arrayBuffer()));
    console.error(`made ${x.file}: ${x.text}`);
  }
  if (!missing.size) console.error("all voice clips present");
}
