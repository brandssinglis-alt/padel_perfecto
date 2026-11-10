// Renders still frames of a scene for a quick look: node stills.mjs <id> <seconds...>
// Writes out/stills/<id>-<t>.png. Much faster than a full render.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
const [id, ...times] = process.argv.slice(2);
const f = fs.readdirSync("content/scenes").find((x) => x.startsWith(id));
const scene = JSON.parse(fs.readFileSync(`content/scenes/${f}`, "utf8"));
const browserExecutable = process.env.REMOTION_CHROME || undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("content") });
const inputProps = { scene };
const compId = scene.format === "pro" ? "PadelPro" : "PadelScene";
const composition = await selectComposition({ serveUrl, id: compId, inputProps, browserExecutable });
fs.mkdirSync("out/stills", { recursive: true });
for (const t of times) {
  const output = `out/stills/${scene.id}-${t}.png`;
  await renderStill({ composition, serveUrl, output, inputProps, frame: Math.round(Number(t) * 30), browserExecutable,
    chromiumOptions: { gl: "swangle" }, scale: 0.5 });
  console.log(output);
}
