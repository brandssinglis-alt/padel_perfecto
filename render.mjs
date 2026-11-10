// Renders every scene in content/scenes (or the ids passed as args) to out/<id>.mp4
// Scenes marked "voiced": true get their voiceover clips from content/voice (see voice.mjs),
// and each part is stretched so the speech fits.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { VOICE_DIR, sceneLines } from "./voice.mjs";

const INTRO_S = 2.2, OUTRO_S = 2.5; // keep in step with src/Court.tsx
const browserExecutable = process.env.REMOTION_CHROME || undefined;
const dir = "content/scenes";
const wanted = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"))
  .filter(f => !wanted.length || wanted.some(w => f.startsWith(w)));

const duration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "csv=p=0", path.join(VOICE_DIR, file)]).toString().trim());

const addVoice = (scene) => {
  const l = sceneLines(scene);
  const all = [l.intro, ...l.beats, l.outro];
  const missing = all.filter(x => !fs.existsSync(path.join(VOICE_DIR, x.file)));
  if (missing.length) throw new Error(`${scene.id}: ${missing.length} voice clips missing, run node voice.mjs ${scene.id}`);
  // Speech starts a moment into each part; leave a short pause after it.
  scene.introSeconds = Math.max(INTRO_S, 0.3 + duration(l.intro.file) + 0.4);
  scene.beats.forEach((b, i) => { b.seconds = Math.max(b.seconds, 0.15 + duration(l.beats[i].file) + 0.5); });
  scene.outroSeconds = Math.max(OUTRO_S, 0.2 + duration(l.outro.file) + 0.5);
  scene.audio = { intro: l.intro.file, beats: l.beats.map(x => x.file), outro: l.outro.file };
  return scene;
};

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve(VOICE_DIR) });
fs.mkdirSync("out", { recursive: true });
for (const f of files) {
  let scene = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (scene.voiced) scene = addVoice(scene);
  const inputProps = { scene };
  const composition = await selectComposition({ serveUrl, id: "PadelScene", inputProps, browserExecutable });
  const outputLocation = `out/${scene.id}.mp4`;
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation, inputProps, browserExecutable,
    chromiumOptions: { gl: "swangle" } });
  console.log("rendered", outputLocation, scene.voiced ? "(voiced)" : "");
}
