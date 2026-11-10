// 3D version of the court template. Same scene files, same timing and overlays as Court.tsx.
// Court metres map to three.js as: X = x - 5, Z = y - 10 (near half is +Z, towards the camera), Y is up.
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Point, Scene } from "./types";
import { C, Overlays, useTimeline } from "./timeline";

const W = (p: Point): [number, number] => [p[0] - 5, p[1] - 10];
const SERVICE = 6.95; // service lines are 6.95 m either side of the net

// Text drawn onto a canvas, used for player labels and zone labels.
const useTextTexture = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, deps: unknown[]) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d")!, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

const Camera: React.FC<{ progress: number }> = ({ progress }) => {
  const { camera } = useThree();
  // Broadcast view from behind the near back glass, with a slow push-in over the video.
  const z = 22.5 - 1.2 * progress, y = 30 - 1.2 * progress;
  camera.position.set(0, y, z);
  camera.lookAt(0, 0, 0.2);
  return null;
};

const Line: React.FC<{ x: number; z: number; w: number; d: number }> = ({ x, z, w, d }) => (
  <mesh position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[w, d]} />
    <meshStandardMaterial color={C.line} roughness={0.6} />
  </mesh>
);

const Glass: React.FC<{ pos: [number, number, number]; size: [number, number]; rotY?: number }> = ({ pos, size, rotY = 0 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <mesh>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#bfe3ff" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {/* top edge */}
    <mesh position={[0, size[1] / 2, 0]}>
      <boxGeometry args={[size[0], 0.05, 0.05]} />
      <meshStandardMaterial color="#d6ecff" transparent opacity={0.7} />
    </mesh>
  </group>
);

const Fence: React.FC<{ x: number; z0: number; z1: number; h: number }> = ({ x, z0, z1, h }) => {
  const posts = [];
  for (let z = z0; z <= z1 + 0.01; z += 2) posts.push(z);
  return (
    <group>
      {posts.map((z) => (
        <mesh key={z} position={[x, h / 2, z]}>
          <boxGeometry args={[0.06, h, 0.06]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[x, h, (z0 + z1) / 2]}>
        <boxGeometry args={[0.06, 0.06, z1 - z0]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[x, h / 2, (z0 + z1) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[z1 - z0, h]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
};

const CourtModel: React.FC = () => (
  <group>
    {/* surroundings */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[40, 60]} />
      <meshStandardMaterial color="#0e1a2e" roughness={1} />
    </mesh>
    {/* playing surface: lighter back courts, darker service boxes */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 20]} />
      <meshStandardMaterial color={C.court} roughness={0.9} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
      <planeGeometry args={[10, SERVICE * 2]} />
      <meshStandardMaterial color={C.courtDark} roughness={0.9} />
    </mesh>
    {/* lines */}
    <Line x={0} z={-SERVICE} w={10} d={0.07} />
    <Line x={0} z={SERVICE} w={10} d={0.07} />
    <Line x={0} z={0} w={0.07} d={SERVICE * 2} />
    <Line x={-5} z={0} w={0.07} d={20} />
    <Line x={5} z={0} w={0.07} d={20} />
    <Line x={0} z={-10} w={10} d={0.07} />
    <Line x={0} z={10} w={10} d={0.07} />
    {/* net */}
    <mesh position={[0, 0.44, 0]} castShadow>
      <boxGeometry args={[10, 0.88, 0.02]} />
      <meshStandardMaterial color="#0b0f19" transparent opacity={0.7} />
    </mesh>
    <mesh position={[0, 0.9, 0]}>
      <boxGeometry args={[10, 0.05, 0.04]} />
      <meshStandardMaterial color="#f8fafc" />
    </mesh>
    {[-5.1, 5.1].map((x) => (
      <mesh key={x} position={[x, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
    ))}
    {/* back glass (far one full height; near one kept low so it doesn't block the view) */}
    <Glass pos={[0, 1.5, -10]} size={[10, 3]} />
    <Glass pos={[0, 0.75, 10]} size={[10, 1.5]} />
    {/* side glass: 2 m at each end, then fence */}
    {[-5, 5].map((x) => (
      <group key={x}>
        <Glass pos={[x, 1.5, -9]} size={[2, 3]} rotY={Math.PI / 2} />
        <Glass pos={[x, 1, -7]} size={[2, 2]} rotY={Math.PI / 2} />
        <Glass pos={[x, 1.5, 9]} size={[2, 3]} rotY={Math.PI / 2} />
        <Glass pos={[x, 1, 7]} size={[2, 2]} rotY={Math.PI / 2} />
        <Fence x={x} z0={-6} z1={6} h={3} />
      </group>
    ))}
  </group>
);

const Player: React.FC<{ p: Point; team: "A" | "B"; label: string; pop: number }> = ({ p, team, label, pop }) => {
  const [x, z] = W(p);
  const color = team === "A" ? C.A : C.B;
  const tex = useTextTexture((ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 40); ctx.fill();
    ctx.lineWidth = 10; ctx.strokeStyle = "#ffffff"; ctx.stroke();
    ctx.fillStyle = "#0b1220"; ctx.font = "900 92px Inter, Helvetica, Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, w / 2, h / 2 + 4);
  }, 256, 140, [label, color]);
  const face = team === "A" ? Math.PI : 0; // face the net
  const s = Math.max(0.001, pop) * 1.15;
  return (
    <group position={[x, 0, z]} scale={[s, s, s]} rotation={[0, face, 0]}>
      {/* legs */}
      {[-0.13, 0.13].map((lx) => (
        <mesh key={lx} position={[lx, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.62, 6, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      ))}
      {/* body */}
      <mesh position={[0, 1.14, 0]} castShadow>
        <capsuleGeometry args={[0.24, 0.5, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshStandardMaterial color="#f1c7a3" roughness={0.6} />
      </mesh>
      {/* racket arm + racket, held in front */}
      <mesh position={[0.3, 1.1, -0.18]} rotation={[0.9, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      <group position={[0.4, 1.2, -0.48]} rotation={[0.5, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
          <meshStandardMaterial color="#111827" roughness={0.4} />
        </mesh>
      </group>
      {/* label floating above; sprites always face the camera */}
      <sprite position={[0, 2.25, 0]} scale={[1.1, 0.6, 1]}>
        <spriteMaterial map={tex} depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
};

const Ball: React.FC<{ p: Point; lift: number; flight: number }> = ({ p, lift, flight }) => {
  const [x, z] = W(p);
  // Lobs and long balls fly higher; short volleys stay low.
  const h = 0.35 + lift * Math.min(7, 0.8 + flight * 0.38);
  return (
    <group>
      <mesh position={[x, h, z]} castShadow>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color={C.ball} emissive={C.ball} emissiveIntensity={0.35} roughness={0.5} toneMapped={false} />
      </mesh>
      {/* contact shadow so the height reads clearly */}
      <mesh position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2 + h * 0.03, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={Math.max(0.12, 0.45 - h * 0.05)} depthWrite={false} />
      </mesh>
    </group>
  );
};

// Flat dashed arrow painted on the floor.
const Arrow: React.FC<{ from: Point; to: Point; color: string; progress: number }> = ({ from, to, color, progress }) => {
  const [x1, z1] = W(from), [x2, z2] = W(to);
  const len = Math.hypot(x2 - x1, z2 - z1) * progress;
  if (len < 0.05) return null;
  const ang = Math.atan2(x2 - x1, z2 - z1);
  const dash = 0.45, gap = 0.3, head = 0.55;
  const shaft = Math.max(0, len - head * 0.8);
  const dashes = [];
  for (let d = 0; d < shaft; d += dash + gap) dashes.push(d);
  return (
    <group position={[x1, 0.02, z1]} rotation={[0, ang, 0]}>
      {dashes.map((d) => {
        const l = Math.min(dash, shaft - d);
        return (
          <mesh key={d} position={[0, 0, d + l / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, l]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
      {/* cone flattened onto the floor, tip pointing along the arrow */}
      <mesh position={[0, 0.001, len - head / 2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.05]}>
        <coneGeometry args={[head * 0.55, head, 3]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Zone: React.FC<{ zone: NonNullable<Scene["beats"][number]["zone"]>; opacity: number }> = ({ zone, opacity }) => {
  const pxPerM = 64;
  const w = Math.round(zone.w * pxPerM), h = Math.round(zone.h * pxPerM);
  const tex = useTextTexture((ctx, cw, ch) => {
    ctx.fillStyle = "rgba(250,204,21,0.30)"; ctx.fillRect(0, 0, cw, ch);
    ctx.setLineDash([22, 14]); ctx.lineWidth = 8; ctx.strokeStyle = C.accent; ctx.strokeRect(4, 4, cw - 8, ch - 8);
    if (zone.label) {
      const size = Math.min(54, (cw * 0.9) / (zone.label.length * 0.62));
      ctx.font = `900 ${size}px Inter, Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = size * 0.18; ctx.strokeStyle = "rgba(11,18,32,0.85)"; ctx.setLineDash([]);
      ctx.strokeText(zone.label, cw / 2, ch / 2);
      ctx.fillStyle = C.accent; ctx.fillText(zone.label, cw / 2, ch / 2);
    }
  }, w, h, [zone.x, zone.y, zone.w, zone.h, zone.label]);
  const [x, z] = W([zone.x + zone.w / 2, zone.y + zone.h / 2]);
  return (
    <mesh position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[zone.w, zone.h]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

export const PadelScene3D: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { frame, idx, cur, pos, pop, ball, ballLift, ballFlight, arrowProg, zone, durationInFrames } = useTimeline(scene);
  const camProg = interpolate(frame, [0, durationInFrames], [0, 1]);

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: "Inter, Helvetica, Arial, sans-serif" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 38, near: 0.1, far: 200 }}
        gl={{ antialias: true }} style={{ background: C.bg }}>
        <Camera progress={camProg} />
        <color attach="background" args={[C.bg]} />
        <fog attach="fog" args={[C.bg, 30, 60]} />
        <hemisphereLight args={["#dbeafe", "#0b1220", 0.9]} />
        <directionalLight position={[6, 16, 8]} intensity={1.8} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={14} shadow-camera-bottom={-14} />
        <CourtModel />
        {zone && <Zone key={`z${idx}`} zone={zone} opacity={arrowProg} />}
        {idx >= 0 && (cur.arrows ?? []).map((a, i) => (
          <Arrow key={`${idx}-${i}`} from={a.from} to={a.to} progress={arrowProg}
            color={a.color === "B" ? C.B : a.color === "ball" ? C.ball : C.A} />
        ))}
        <Player p={pos("B1")} team="B" label="R1" pop={pop} />
        <Player p={pos("B2")} team="B" label="R2" pop={pop} />
        <Player p={pos("A1")} team="A" label="YOU" pop={pop} />
        <Player p={pos("A2")} team="A" label="P" pop={pop} />
        {ball && <Ball p={ball} lift={ballLift} flight={ballFlight} />}
      </ThreeCanvas>
      <Overlays scene={scene} />
    </AbsoluteFill>
  );
};
