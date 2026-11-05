import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { Beat, Point, Scene } from "./types";

const C = {
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
const MOVE_S = 0.9; // time players take to move into a beat's positions

export const sceneDurationFrames = (s: Scene, fps: number) =>
  Math.round((INTRO_S + s.beats.reduce((a, b) => a + b.seconds, 0) + OUTRO_S) * fps);

// Court drawing area in pixels (1080x1920 canvas)
const CW = 640, CH = 1280, CX = (1080 - CW) / 2, CY = 380;
const px = (p: Point): [number, number] => [CX + (p[0] / 10) * CW, CY + (p[1] / 20) * CH];
const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const CourtLines: React.FC = () => {
  const m = CW / 10; // px per metre
  const service = 6.95 * m;
  const netY = CY + CH / 2;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <rect x={CX - 14} y={CY - 14} width={CW + 28} height={CH + 28} rx={10} fill="none" stroke={C.glass} strokeWidth={10} />
      <rect x={CX} y={CY} width={CW} height={CH} fill={C.court} />
      <rect x={CX} y={netY - service} width={CW} height={service * 2} fill={C.courtDark} />
      <g stroke={C.line} strokeWidth={5} fill="none">
        <rect x={CX} y={CY} width={CW} height={CH} />
        <line x1={CX} y1={netY - service} x2={CX + CW} y2={netY - service} />
        <line x1={CX} y1={netY + service} x2={CX + CW} y2={netY + service} />
        <line x1={CX + CW / 2} y1={netY - service} x2={CX + CW / 2} y2={netY + service} />
      </g>
      <line x1={CX - 24} y1={netY} x2={CX + CW + 24} y2={netY} stroke="#e5e7eb" strokeWidth={9} strokeDasharray="4 6" />
    </svg>
  );
};

const Player: React.FC<{ p: Point; team: "A" | "B"; label: string; pop: number }> = ({ p, team, label, pop }) => {
  const [x, y] = px(p);
  const r = 34 * pop;
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%",
      background: team === "A" ? C.A : C.B, border: "5px solid white", boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", color: "#0b1220",
      fontFamily: "Inter, Helvetica, Arial, sans-serif", fontWeight: 800, fontSize: 26 * pop }}>
      {label}
    </div>
  );
};

const Arrow: React.FC<{ from: Point; to: Point; color: string; progress: number }> = ({ from, to, color, progress }) => {
  const [x1, y1] = px(from);
  const end = px(lerp(from, to, progress));
  const ang = Math.atan2(end[1] - y1, end[0] - x1);
  const h = 26;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <line x1={x1} y1={y1} x2={end[0]} y2={end[1]} stroke={color} strokeWidth={8} strokeDasharray="18 12" strokeLinecap="round" />
      {progress > 0.05 && (
        <polygon fill={color} points={`${end[0]},${end[1]} ${end[0] - h * Math.cos(ang - 0.45)},${end[1] - h * Math.sin(ang - 0.45)} ${end[0] - h * Math.cos(ang + 0.45)},${end[1] - h * Math.sin(ang + 0.45)}`} />
      )}
    </svg>
  );
};

export const PadelScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  // Find the current beat
  let start = INTRO_S, idx = -1;
  for (let i = 0; i < scene.beats.length; i++) {
    if (t >= start) idx = i;
    if (t < start + scene.beats[i].seconds) break;
    start += scene.beats[i].seconds;
  }
  const beatStarts: number[] = [];
  scene.beats.reduce((acc, b) => { beatStarts.push(acc); return acc + b.seconds; }, INTRO_S);
  const outroStart = durationInFrames / fps - OUTRO_S;
  const inOutro = t >= outroStart;
  if (inOutro) idx = scene.beats.length - 1;

  const cur: Beat = scene.beats[Math.max(0, idx)];
  const prev: Beat = scene.beats[Math.max(0, idx - 1)];
  const local = idx < 0 ? 0 : t - beatStarts[idx];
  const mv = idx <= 0 ? 1 : interpolate(local, [0, MOVE_S], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  const pos = (k: keyof Beat["players"]) => lerp(prev.players[k], cur.players[k], mv);
  const pop = spring({ frame: frame - Math.round(0.4 * fps), fps, config: { damping: 12 } });

  // Ball: arcs from previous beat's ball to this one
  const prevBall = prev.ball ?? cur.ball;
  let ballPx: [number, number] | null = null;
  let ballScale = 1;
  if (cur.ball && prevBall && idx >= 0) {
    const bp = lerp(prevBall, cur.ball, mv);
    ballPx = px(bp);
    ballScale = 1 + Math.sin(Math.PI * mv) * (idx === 0 ? 0 : 0.8); // fake height for lobs
  }

  const hookIn = spring({ frame, fps, config: { damping: 14 } });
  const textKey = inOutro ? "outro" : idx < 0 ? "intro" : `b${idx}`;
  const textT = inOutro ? t - outroStart : idx < 0 ? t : local;
  const textOpacity = interpolate(textT, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  const arrowProg = interpolate(local, [MOVE_S * 0.6, MOVE_S + 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const zone = cur.zone && idx >= 0 ? cur.zone : undefined;

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: "Inter, Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ position: "absolute", top: 90, left: 60, right: 60, textAlign: "center", transform: `scale(${0.9 + 0.1 * hookIn})`, opacity: hookIn }}>
        <div style={{ display: "inline-block", background: C.accent, color: "#0b1220", fontWeight: 800, fontSize: 30,
          padding: "8px 22px", borderRadius: 999, letterSpacing: 2, textTransform: "uppercase" }}>{scene.level}</div>
        <div style={{ color: C.text, fontWeight: 900, fontSize: 64, lineHeight: 1.08, marginTop: 22 }}>{scene.hook}</div>
      </div>

      <CourtLines />

      {zone && (
        <div style={{ position: "absolute", left: px([zone.x, zone.y])[0], top: px([zone.x, zone.y])[1],
          width: (zone.w / 10) * CW, height: (zone.h / 20) * CH, background: "rgba(250,204,21,0.28)",
          border: `4px dashed ${C.accent}`, borderRadius: 12, opacity: arrowProg,
          display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 800, fontSize: 30 }}>
          {zone.label}
        </div>
      )}

      {idx >= 0 && (cur.arrows ?? []).map((a, i) => (
        <Arrow key={`${idx}-${i}`} from={a.from} to={a.to} progress={arrowProg}
          color={a.color === "B" ? C.B : a.color === "ball" ? C.ball : C.A} />
      ))}

      <Player p={pos("B1")} team="B" label="R1" pop={pop} />
      <Player p={pos("B2")} team="B" label="R2" pop={pop} />
      <Player p={pos("A1")} team="A" label="YOU" pop={pop} />
      <Player p={pos("A2")} team="A" label="P" pop={pop} />

      {ballPx && (
        <div style={{ position: "absolute", left: ballPx[0] - 14 * ballScale, top: ballPx[1] - 14 * ballScale,
          width: 28 * ballScale, height: 28 * ballScale, borderRadius: "50%", background: C.ball,
          boxShadow: `0 ${10 * ballScale}px ${14 * ballScale}px rgba(0,0,0,0.5)` }} />
      )}

      {/* Coaching text */}
      <div key={textKey} style={{ position: "absolute", left: 60, right: 60, bottom: 90, minHeight: 150, opacity: textOpacity,
        display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
        background: "rgba(255,255,255,0.08)", borderRadius: 28, padding: "24px 32px",
        color: C.text, fontSize: 46, fontWeight: 700, lineHeight: 1.2 }}>
        {inOutro ? <span style={{ color: C.accent }}>{scene.cta}</span> : idx < 0 ? "Watch the movement 👇" : cur.text}
      </div>
    </AbsoluteFill>
  );
};
