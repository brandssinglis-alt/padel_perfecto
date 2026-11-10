// Tactics board player marker: a glossy team-coloured puck with the player's tag printed on top,
// a heading wedge, a short movement trail, and a pulse + shot-name chip when they hit the ball.
import React from "react";
import { useTextTexture } from "../Court3D";
import type { ActionState } from "./anim";
import type { ShotType } from "./types";

const FONT = "Inter, Helvetica, Arial, sans-serif";
const SHOT_NAME: Record<ShotType, string> = {
  forehand: "FOREHAND", backhand: "BACKHAND", volley: "VOLLEY", bigswing: "BIG SWING", smash: "SMASH", serve: "SERVE", lob: "LOB",
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));

const TopLabel: React.FC<{ text: string }> = ({ text }) => {
  const tex = useTextTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b1220";
    const size = text.length > 2 ? 92 : 120;
    ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 6);
  }, 256, 256, [text]);
  return (
    <mesh position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

const Chip: React.FC<{ text: string; color: string; k: number }> = ({ text, color, k }) => {
  const tex = useTextTexture((ctx, w, h) => {
    ctx.fillStyle = "rgba(11,18,32,0.92)";
    ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, (h - 12) / 2); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = color; ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = `900 64px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 3);
  }, 420, 110, [text, color]);
  return (
    <sprite position={[0, 1.5, -1.05]} scale={[1.55 * k, 0.41 * k, 1]}>
      <spriteMaterial map={tex} depthTest={false} transparent opacity={k} toneMapped={false} />
    </sprite>
  );
};

export const BoardPlayer: React.FC<{
  name: string; color: string; face: number; act: ActionState; trail: [number, number][]; pop: number; chip: boolean;
}> = ({ name, color, face, act, trail, pop, chip }) => {
  const d = act.shot?.d;
  const pulse = d !== undefined && d >= 0 && d < 0.55 ? d / 0.55 : -1;
  const swipe = d !== undefined && d > -0.3 && d < 0.2 ? clamp((d + 0.3) / 0.5) : -1;
  const chipK = d !== undefined && d > -0.15 && d < 1.0 ? Math.min(clamp((d + 0.15) / 0.15), clamp((1.0 - d) / 0.25)) : 0;
  const side = act.shot && act.shot.type === "backhand" ? -1 : 1; // hitting side (player's right = +1)
  return (
    <group>
      {/* movement trail (world positions relative to the player) */}
      {trail.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16 - i * 0.012, 20]} />
          <meshBasicMaterial color={color} transparent opacity={0.32 - i * 0.035} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <group scale={[pop, pop, pop]}>
        {/* soft shadow */}
        <mesh position={[0.08, 0.012, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        {/* puck: white rim, team colour face */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.52, 0.16, 40]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 0.06, 40]} />
          <meshStandardMaterial color={color} roughness={0.3} emissive={color} emissiveIntensity={0.25} />
        </mesh>
        <TopLabel text={name} />
        {/* heading wedge */}
        <group rotation={[0, face, 0]}>
          <mesh position={[0, 0.06, -0.68]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <circleGeometry args={[0.17, 3]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          {/* racket swipe on the hitting side */}
          {swipe >= 0 && (
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.62, 0.8, 40, 1, side > 0 ? -0.6 : Math.PI + 0.6 - (Math.PI / 2 + 0.9) * swipe, (Math.PI / 2 + 0.9) * swipe + 0.01]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85 * (1 - Math.max(0, swipe - 0.6) / 0.4)} depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
        {/* contact pulse */}
        {pulse >= 0 && (
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55 + pulse * 0.9, 0.62 + pulse * 0.95, 48]} />
            <meshBasicMaterial color={color} transparent opacity={0.9 * (1 - pulse)} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
        {chip && chipK > 0 && act.shot && <Chip text={SHOT_NAME[act.shot.type]} color={color} k={chipK} />}
      </group>
    </group>
  );
};
