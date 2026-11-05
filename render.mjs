// Renders every scene in content/scenes (or the ids passed as args) to out/<id>.mp4
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const browserExecutable = process.env.REMOTION_CHROME || undefined;
const dir = "content/scenes";
const wanted = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"))
  .filter(f => !wanted.length || wanted.some(w => f.startsWith(w)));

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
fs.mkdirSync("out", { recursive: true });
for (const f of files) {
  const scene = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const inputProps = { scene };
  const composition = await selectComposition({ serveUrl, id: "PadelScene", inputProps, browserExecutable });
  const outputLocation = `out/${scene.id}.mp4`;
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation, inputProps, browserExecutable,
    chromiumOptions: { gl: "swangle" } });
  console.log("rendered", outputLocation);
}
