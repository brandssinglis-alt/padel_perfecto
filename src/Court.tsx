import React from "react";
import { AbsoluteFill } from "remotion";
import type { Point, Scene } from "./types";
import { C, Overlays, lerp, useTimeline } from "./timeline";

export { INTRO_S, OUTRO_S, sceneDurationFrames } from "./timeline";

// Court drawing area in pixels (1080x1920 canvas)
const CW = 640, CH = 1280, CX = (1080 - CW) / 2, CY = 380;
const px = (p: Point): [number, number] => [CX + (p[0] / 10) * CW, CY + (p[1] / 20) * CH];

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
  const { idx, cur, pos, pop, ball, ballLift, arrowProg, zone } = useTimeline(scene);
  const ballPx = ball ? px(ball) : null;
  const ballScale = 1 + ballLift * 0.8; // fake height for lobs

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: "Inter, Helvetica, Arial, sans-serif" }}>
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

      <Overlays scene={scene} />
    </AbsoluteFill>
  );
};
