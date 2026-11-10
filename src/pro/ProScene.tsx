// Pro scene composition: 3D court, pro-style athletes that swing on contact, per-beat camera,
// badges, speech bubbles, stamps, countdowns, cards, captions and voiceover.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import type { Point } from "../types";
import { C } from "../timeline";
import { Arrow, CourtModel, Zone, useTextTexture } from "../Court3D";
import { Athlete, type Look } from "./Athlete";
import { COVER, INTRO, OUTRO, PIDS, ballAt, cameraAt, clock, poseAt, position, runPhase, velocity, durationSeconds } from "./anim";
import type { Pid, ProScene, Tone } from "./types";

export const proDurationFrames = (s: ProScene, fps: number) => Math.round(durationSeconds(s) * fps);

const W3 = (p: Point): [number, number] => [p[0] - 5, p[1] - 10];
const FONT = "Inter, Helvetica, Arial, sans-serif";

export const CHAPTER_COLOR: Record<ProScene["chapter"], string> = {
  // brand kit chapter colours (src/brand/brand.js)
  "Level Up": "#c6f432", "Shot School": "#22d3ee", "Court Zones": "#5b8cff", "Myth or Fact": "#ff5fa2", "Kit Room": "#ffb020",
};
const TONE: Record<Tone, { fill: string; stroke: string; text: string }> = {
  green: { fill: "rgba(34,197,94,0.30)", stroke: "#4ade80", text: "#052e16" },
  red: { fill: "rgba(239,68,68,0.32)", stroke: "#f87171", text: "#450a0a" },
  grey: { fill: "rgba(148,163,184,0.25)", stroke: "#94a3b8", text: "#0f172a" },
  yellow: { fill: "rgba(250,204,21,0.30)", stroke: "#facc15", text: "#422006" },
};

const LOOKS: Record<Pid, Look> = {
  A1: { shirt: C.A, shorts: "#0f172a", skin: "#e8b48f", hair: "#3b2416", height: 1.0, build: 1.0 },
  A2: { shirt: C.A, shorts: "#0f172a", skin: "#c68a5e", hair: "#111111", height: 0.97, build: 1.06, band: "#0f172a" },
  B1: { shirt: C.B, shorts: "#111827", skin: "#f0c6a0", hair: "#6b4423", height: 1.02, build: 0.98, band: "#f8fafc" },
  B2: { shirt: C.B, shorts: "#111827", skin: "#a8714a", hair: "#1a1a1a", height: 0.98, build: 1.04 },
};
const RIM: Record<Pid, string> = { A1: "#facc15", A2: "#f8fafc", B1: "#f8fafc", B2: "#facc15" };
const NAMES: Record<Pid, string> = { A1: "YOU", A2: "P", B1: "R1", B2: "R2" };

const CameraRig: React.FC<{ scene: ProScene; T: number; t: number }> = ({ scene, T, t }) => {
  const { camera } = useThree();
  const c = cameraAt(scene, T, t);
  camera.position.set(...c.pos);
  camera.lookAt(...c.look);
  const pc = camera as unknown as { fov: number; updateProjectionMatrix: () => void };
  if (pc.fov !== c.fov) { pc.fov = c.fov; pc.updateProjectionMatrix(); }
  return null;
};

const Tag: React.FC<{ text: string; color: string; pos: [number, number, number]; scale?: number; dark?: boolean }> = ({ text, color, pos, scale = 1, dark }) => {
  const tex = useTextTexture((ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 34); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = dark ? "#0b1220" : "#ffffff"; ctx.stroke();
    ctx.fillStyle = "#0b1220";
    const size = Math.min(84, (w * 0.86) / Math.max(2, text.length * 0.6));
    ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 3);
  }, 320, 130, [text, color]);
  return (
    <sprite position={pos} scale={[0.92 * scale, 0.37 * scale, 1]}>
      <spriteMaterial map={tex} depthTest={false} toneMapped={false} />
    </sprite>
  );
};

const Bubble: React.FC<{ text: string; pos: [number, number, number]; k: number }> = ({ text, pos, k }) => {
  const tex = useTextTexture((ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 46, 40); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.42, h - 40); ctx.lineTo(w * 0.5, h - 6); ctx.lineTo(w * 0.58, h - 40); ctx.fill();
    ctx.fillStyle = "#0b1220"; ctx.font = `900 96px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, (h - 38) / 2 + 4);
  }, 420, 210, [text]);
  return (
    <sprite position={pos} scale={[1.7 * k, 0.85 * k, 1]}>
      <spriteMaterial map={tex} depthTest={false} toneMapped={false} />
    </sprite>
  );
};

const Badge: React.FC<{ value: string; label: string; tone: Tone; pos: [number, number, number]; k: number; delta: number }> = ({ value, label, tone, pos, k, delta }) => {
  const col = TONE[tone].stroke;
  const tex = useTextTexture((ctx, w, h) => {
    ctx.fillStyle = "rgba(11,18,32,0.92)";
    ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 30); ctx.fill();
    ctx.lineWidth = 10; ctx.strokeStyle = col; ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#cbd5e1"; ctx.font = `800 34px ${FONT}`; ctx.fillText(label, w / 2, 42);
    ctx.fillStyle = "#ffffff"; ctx.font = `900 86px ${FONT}`;
    const arrow = delta > 0.0001 ? " ▲" : delta < -0.0001 ? " ▼" : "";
    ctx.fillText(value + arrow, w / 2, 112);
  }, 330, 160, [value, label, col, delta > 0, delta < 0]);
  return (
    <sprite position={pos} scale={[1.6 * k, 0.78 * k, 1]}>
      <spriteMaterial map={tex} depthTest={false} toneMapped={false} />
    </sprite>
  );
};

const Ball3D: React.FC<{ scene: ProScene; T: number; camPos: [number, number, number] }> = ({ scene, T, camPos }) => {
  const b = ballAt(scene, T);
  if (!b) return null;
  const [bx0, bz0] = W3([b[0], b[2]]);
  const g = Math.max(1, Math.hypot(camPos[0] - bx0, camPos[1] - b[1], camPos[2] - bz0) / 9);
  const trail = [1, 2, 3, 4, 5].map((i) => ballAt(scene, T - i * 0.025)).filter(Boolean) as [number, number, number][];
  const [x, z] = W3([b[0], b[2]]);
  return (
    <group>
      {trail.map((p, i) => {
        const [tx, tz] = W3([p[0], p[2]]);
        return (
          <mesh key={i} position={[tx, Math.max(0.065, p[1]), tz]}>
            <sphereGeometry args={[0.065 * g * (1 - i * 0.12), 12, 12]} />
            <meshBasicMaterial color={C.ball} transparent opacity={0.35 - i * 0.06} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[x, Math.max(0.065, b[1]), z]} castShadow>
        <sphereGeometry args={[0.07 * g, 20, 20]} />
        <meshStandardMaterial color={C.ball} emissive={C.ball} emissiveIntensity={0.5} roughness={0.5} toneMapped={false} />
      </mesh>
      <mesh position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.09 + b[1] * 0.02, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={Math.max(0.12, 0.5 - b[1] * 0.08)} depthWrite={false} />
      </mesh>
    </group>
  );
};

const fade = (local: number, at = 0) => interpolate(local, [at, at + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const ProSceneComp: React.FC<{ scene: ProScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const ck = clock(scene, t);
  const { T, beat, local } = ck;
  const b = beat >= 0 && beat < scene.beats.length ? scene.beats[beat] : undefined;
  const inOutro = beat >= scene.beats.length;
  const pop = spring({ frame: frame - Math.round((scene.cover ? COVER : 0) * fps), fps, config: { damping: 13 } });
  const chapterColor = CHAPTER_COLOR[scene.chapter];
  const ball = ballAt(scene, T);
  const cam = cameraAt(scene, T, t);
  const teamMid = (team: "A" | "B"): Point => {
    const p = position(scene, `${team}1` as Pid, T), q = position(scene, `${team}2` as Pid, T);
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  };

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 38, near: 0.1, far: 200 }} gl={{ antialias: true }} style={{ background: C.bg }}>
        <CameraRig scene={scene} T={T} t={t} />
        <color attach="background" args={[C.bg]} />
        <fog attach="fog" args={[C.bg, 32, 70]} />
        <hemisphereLight args={["#e0f2fe", "#0b1220", 1.0]} />
        <directionalLight position={[6, 16, 8]} intensity={2.0} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={14} shadow-camera-bottom={-14} />
        <CourtModel />
        {b && (b.zones ?? []).map((z, i) => (
          <Zone key={`${beat}z${i}`} zone={z} opacity={fade(local, z.at ?? 0.2)} fill={TONE[z.tone ?? "yellow"].fill} stroke={TONE[z.tone ?? "yellow"].stroke} />
        ))}
        {b && (b.arrows ?? []).map((a, i) => (
          <Arrow key={`${beat}a${i}`} from={a.from} to={a.to} progress={fade(local, a.at ?? 0.3) }
            color={a.tone === "B" ? C.B : a.tone === "A" ? C.A : C.ball} />
        ))}
        {PIDS.map((who) => {
          const p = position(scene, who, T);
          const [x, z] = W3(p);
          const v = velocity(scene, who, T);
          const base = who[0] === "A" ? 0 : Math.PI;
          // turn the body a little towards the ball
          let face = base;
          if (ball) {
            const ang = Math.atan2(-(ball[0] - p[0]), -(ball[2] - p[1]));
            let d = ang - base; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
            face = base + Math.max(-0.6, Math.min(0.6, d * 0.35));
          }
          return (
            <group key={who}>
              <group scale={[Math.max(0.001, pop), Math.max(0.001, pop), Math.max(0.001, pop)]} position={[x, 0, z]}>
                <Athlete pos={[0, 0]} facing={face} pose={poseAt(scene, who, T)} run={runPhase(scene, who, T)}
                  speed={Math.hypot(v[0], v[1])} look={LOOKS[who]} rim={RIM[who]} />
              </group>
              {scene.labels !== false && !inOutro && Math.hypot(cam.pos[0] - x, cam.pos[2] - z) > 7 && !(b?.badges ?? []).some((bd) => bd.who === who && local >= (bd.at ?? 0)) && (
                <Tag text={NAMES[who]} color={who[0] === "A" ? C.A : C.B} pos={[x, 2.25, z]} scale={0.8} />
              )}
            </group>
          );
        })}
        <Ball3D scene={scene} T={T} camPos={cam.pos} />
        {b && (b.badges ?? []).map((bd, i) => {
          const at = bd.at ?? 0;
          const k = spring({ frame: frame - Math.round((ck.beatStartsReal[beat] + at) * fps), fps, config: { damping: 12 } });
          const u = interpolate(local, [at + 0.4, at + 1.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const to = bd.to ?? bd.from;
          const val = bd.from + (to - bd.from) * u;
          const p = bd.who === "A" || bd.who === "B" ? teamMid(bd.who) : position(scene, bd.who, T);
          const [x, z] = W3(p);
          const y = bd.who === "A" || bd.who === "B" ? 3.2 : 3.05;
          return local >= at ? <Badge key={`${beat}b${i}`} value={val.toFixed(2)} label={bd.label ?? "LEVEL"} tone={bd.tone ?? (to > bd.from ? "green" : to < bd.from ? "red" : "grey")}
            pos={[x, y, z]} k={Math.max(0.001, k)} delta={u > 0.05 ? to - bd.from : 0} /> : null;
        })}
        {b && (b.bubbles ?? []).map((bb, i) => {
          if (local < bb.at) return null;
          const k = spring({ frame: frame - Math.round((ck.beatStartsReal[beat] + bb.at) * fps), fps, config: { damping: 11 } });
          const [x, z] = W3(position(scene, bb.who, T));
          return <Bubble key={`${beat}u${i}`} text={bb.text} pos={[x, 3.0, z]} k={Math.max(0.001, k)} />;
        })}
      </ThreeCanvas>

      {/* voiceover: one clip per beat */}
      {scene.audio && scene.audio.beats.map((f, i) => f ? (
        <Sequence key={`v${i}`} from={Math.round((ck.beatStartsReal[i] + 0.12) * fps)}><Audio src={staticFile(`voice/${f}`)} /></Sequence>
      ) : null)}

      {/* header: series pill + hook */}
      {!inOutro && (
        <div style={{ position: "absolute", top: 64, left: 56, right: 56, textAlign: "center", opacity: pop, transform: `scale(${0.92 + 0.08 * pop})` }}>
          <div style={{ display: "inline-block", background: chapterColor, color: "#0b1220", fontWeight: 900, fontSize: 30,
            padding: "8px 24px", borderRadius: 999, letterSpacing: 2, textTransform: "uppercase" }}>{scene.series}</div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 58, lineHeight: 1.06, marginTop: 16, textShadow: "0 4px 18px rgba(0,0,0,0.75)" }}>{scene.hook}</div>
        </div>
      )}

      {b?.replay && (
        <div style={{ position: "absolute", top: 330, left: 56, background: "#ef4444", color: "#fff", fontWeight: 900, fontSize: 30,
          padding: "6px 18px", borderRadius: 10, letterSpacing: 3 }}>● REPLAY</div>
      )}
      {b?.slow && b.slow < 1 && (
        <div style={{ position: "absolute", top: 330, right: 56, background: "rgba(11,18,32,0.8)", color: "#fff", fontWeight: 800, fontSize: 28,
          padding: "6px 18px", borderRadius: 10, letterSpacing: 2 }}>SLOW-MO</div>
      )}

      {/* cards */}
      {b?.cards && (
        <div style={{ position: "absolute", bottom: 300, left: 48, right: 48, display: "flex", gap: 24, justifyContent: "center" }}>
          {b.cards.map((c, i) => {
            const o = fade(local, c.at);
            return (
              <div key={i} style={{ flex: 1, opacity: o, transform: `translateY(${(1 - o) * 30}px)`, background: "rgba(11,18,32,0.88)",
                border: `5px solid ${TONE[c.tone].stroke}`, borderRadius: 26, padding: "20px 18px", textAlign: "center",
                filter: c.tone === "grey" ? "saturate(0.2)" : undefined }}>
                <div style={{ color: TONE[c.tone].stroke, fontWeight: 900, fontSize: 36, letterSpacing: 1 }}>{c.title}</div>
                {c.sub && <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 32, marginTop: 8 }}>{c.sub}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* stamp */}
      {b?.stamp && local >= b.stamp.at && (() => {
        const k = spring({ frame: frame - Math.round((ck.beatStartsReal[beat] + b.stamp.at) * fps), fps, config: { damping: 9, mass: 0.6 } });
        return (
          <div style={{ position: "absolute", top: height * 0.38, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ display: "inline-block", transform: `rotate(-8deg) scale(${2.2 - 1.2 * k})`, opacity: Math.min(1, k * 1.5),
              color: TONE[b.stamp.tone].stroke, border: `12px solid ${TONE[b.stamp.tone].stroke}`, borderRadius: 24,
              padding: "6px 40px", fontSize: 150, fontWeight: 900, letterSpacing: 6, background: "rgba(11,18,32,0.55)" }}>{b.stamp.text}</span>
          </div>
        );
      })()}

      {/* countdown */}
      {b?.countdown && local >= b.countdown.at && (() => {
        const e = local - b.countdown.at;
        const n = b.countdown.from - Math.floor(e / 0.8);
        if (n < 1) return null;
        const s = 1 + 0.4 * (1 - ((e % 0.8) / 0.8));
        return (
          <div style={{ position: "absolute", top: height * 0.36, left: 0, right: 0, textAlign: "center", color: "#fff", fontWeight: 900,
            fontSize: 260, transform: `scale(${s})`, textShadow: "0 8px 30px rgba(0,0,0,0.8)" }}>{n}</div>
        );
      })()}

      {/* coaching line */}
      {b && b.text && (
        <div key={`t${beat}`} style={{ position: "absolute", left: 56, right: 56, bottom: 90, opacity: fade(local, 0), display: "flex",
          justifyContent: "center", textAlign: "center", background: "rgba(11,18,32,0.78)", borderRadius: 28, padding: "26px 32px",
          borderBottom: `8px solid ${chapterColor}`, color: "#fff", fontSize: 48, fontWeight: 800, lineHeight: 1.18 }}>{b.text}</div>
      )}

      {/* cover: the branded title card, shown for a moment before the action */}
      {scene.cover && t < COVER && (
        <AbsoluteFill><Img src={staticFile(`covers/${scene.id}.png`)} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>
      )}

      {/* end card */}
      {inOutro && (
        <AbsoluteFill style={{ background: `rgba(11,18,32,${Math.min(0.9, local * 2)})`, alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: 80, opacity: Math.min(1, local * 3) }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 64, letterSpacing: 2 }}>PADEL PERFECTO</div>
          <div style={{ marginTop: 26, display: "inline-block", background: chapterColor, color: "#0b1220", fontWeight: 900, fontSize: 40,
            padding: "10px 30px", borderRadius: 999, letterSpacing: 2, textTransform: "uppercase" }}>{scene.series}</div>
          <div style={{ marginTop: 40, color: chapterColor, fontWeight: 800, fontSize: 50, lineHeight: 1.2 }}>{scene.cta}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export { INTRO, OUTRO };
