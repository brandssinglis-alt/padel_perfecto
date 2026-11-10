// Shared timing and overlays for the 2D (Court.tsx) and 3D (Court3D.tsx) templates.
import React from "react";
import { Audio, Sequence, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { Beat, Point, Scene } from "./types";

export const C = {
  bg: "#0b1220",
  court: "#1f6fb2",
  courtDark: "#185a92",
  line: "#ffffff",
  glass: "rgba(180,220,255,0.55)",
  A: "#22d3ee",
  B: "#f43f5e",
  ball: "#d9f99d",
  text: "#ffffff",
  accent: "#facc15",
};

export const INTRO_S = 2.2;
export const OUTRO_S = 2.5;
export const MOVE_S = 0.9; // time players take to move into a beat's positions

export const introOf = (s: Scene) => s.introSeconds ?? INTRO_S;
export const outroOf = (s: Scene) => s.outroSeconds ?? OUTRO_S;

export const sceneDurationFrames = (s: Scene, fps: number) =>
  Math.round((introOf(s) + s.beats.reduce((a, b) => a + b.seconds, 0) + outroOf(s)) * fps);

export const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Where everything is at the current frame.
export const useTimeline = (scene: Scene) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  let start = introOf(scene), idx = -1;
  for (let i = 0; i < scene.beats.length; i++) {
    if (t >= start) idx = i;
    if (t < start + scene.beats[i].seconds) break;
    start += scene.beats[i].seconds;
  }
  const beatStarts: number[] = [];
  scene.beats.reduce((acc, b) => { beatStarts.push(acc); return acc + b.seconds; }, introOf(scene));
  const outroStart = durationInFrames / fps - outroOf(scene);
  const inOutro = t >= outroStart;
  if (inOutro) idx = scene.beats.length - 1;

  const cur: Beat = scene.beats[Math.max(0, idx)];
  const prev: Beat = scene.beats[Math.max(0, idx - 1)];
  const local = idx < 0 ? 0 : t - beatStarts[idx];
  const mv = idx <= 0 ? 1 : interpolate(local, [0, MOVE_S], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const pos = (k: keyof Beat["players"]) => lerp(prev.players[k], cur.players[k], mv);
  const pop = spring({ frame: frame - Math.round(0.4 * fps), fps, config: { damping: 12 } });

  // Ball travels from the previous beat's ball to this one; lift is 0..1 through the flight.
  const prevBall = prev.ball ?? cur.ball;
  const ball = cur.ball && prevBall && idx >= 0 ? lerp(prevBall, cur.ball, mv) : null;
  const ballLift = idx <= 0 ? 0 : Math.sin(Math.PI * mv);
  const ballFlight = cur.ball && prevBall ? Math.hypot(cur.ball[0] - prevBall[0], cur.ball[1] - prevBall[1]) : 0;

  const arrowProg = interpolate(local, [MOVE_S * 0.6, MOVE_S + 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zone = cur.zone && idx >= 0 ? cur.zone : undefined;

  return { frame, fps, t, idx, cur, prev, local, mv, pos, pop, ball, ballLift, ballFlight, arrowProg, zone,
    inOutro, outroStart, beatStarts, durationInFrames };
};

// Hook header, coaching text and voiceover: identical in both templates.
export const Overlays: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { frame, fps, t, idx, cur, local, inOutro, outroStart, beatStarts } = useTimeline(scene);
  const hookIn = spring({ frame, fps, config: { damping: 14 } });
  const textKey = inOutro ? "outro" : idx < 0 ? "intro" : `b${idx}`;
  const textT = inOutro ? t - outroStart : idx < 0 ? t : local;
  const textOpacity = interpolate(textT, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  const voice = (file: string | undefined, at: number, key: string) => file ? (
    <Sequence key={key} from={Math.round(at * fps)}><Audio src={staticFile(file)} /></Sequence>
  ) : null;

  return (
    <>
      {scene.audio && voice(scene.audio.intro, 0.3, "vi")}
      {scene.audio && scene.audio.beats.map((f, i) => voice(f, beatStarts[i] + 0.15, `vb${i}`))}
      {scene.audio && voice(scene.audio.outro, outroStart + 0.2, "vo")}

      <div style={{ position: "absolute", top: 70, left: 60, right: 60, textAlign: "center", transform: `scale(${0.9 + 0.1 * hookIn})`, opacity: hookIn }}>
        <div style={{ display: "inline-block", background: C.accent, color: "#0b1220", fontWeight: 800, fontSize: 30,
          padding: "8px 22px", borderRadius: 999, letterSpacing: 2, textTransform: "uppercase" }}>{scene.level}</div>
        <div style={{ color: C.text, fontWeight: 900, fontSize: 60, lineHeight: 1.06, marginTop: 18,
          textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>{scene.hook}</div>
      </div>

      <div key={textKey} style={{ position: "absolute", left: 60, right: 60, bottom: 70, minHeight: 150, opacity: textOpacity,
        display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
        background: "rgba(11,18,32,0.72)", borderRadius: 28, padding: "24px 32px",
        color: C.text, fontSize: 46, fontWeight: 700, lineHeight: 1.2 }}>
        {inOutro ? <span style={{ color: C.accent }}>{scene.cta}</span> : idx < 0 ? "Watch the movement 👇" : cur.text}
      </div>
    </>
  );
};
