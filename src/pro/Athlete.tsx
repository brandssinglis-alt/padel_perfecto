// Stylised pro padel player: shirt, shorts, socks, trainers, hair, padel racket in the right hand.
// Jointed so it can run and swing. Faces local -Z; +X is the player's right.
import React, { useMemo } from "react";
import * as THREE from "three";
import type { Pose } from "./anim";

export type Look = { shirt: string; shorts: string; skin: string; hair: string; height: number; build: number; band?: string };

const mat = (color: string, rough = 0.6) => <meshStandardMaterial color={color} roughness={rough} />;

export const Racket: React.FC<{ rim: string }> = ({ rim }) => {
  const face = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1f2937"; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#374151"; ctx.fillRect(0, 0, 256, 120);
    ctx.fillStyle = "#0b0f19";
    for (let y = 30; y < 230; y += 22) for (let x = 30; x < 230; x += 22) {
      if (Math.hypot(x - 128, y - 128) < 100) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <group>
      {/* grip and handle continue the forearm (down local -Y) */}
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 0.2, 10]} />
        {mat("#f1f5f9", 0.8)}
      </mesh>
      <mesh position={[0, -0.21, 0]}>
        <boxGeometry args={[0.05, 0.06, 0.03]} />
        {mat(rim, 0.4)}
      </mesh>
      {/* head: solid perforated face, coloured rim, face normal along local Z */}
      <group position={[0, -0.37, 0]} scale={[1, 1.12, 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.135, 0.135, 0.036, 32]} />
          <meshStandardMaterial attach="material-0" color={rim} roughness={0.35} />
          <meshStandardMaterial attach="material-1" map={face} roughness={0.5} />
          <meshStandardMaterial attach="material-2" map={face} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};

const Limb: React.FC<{ len: number; r0: number; r1: number; color: string; topColor?: string; split?: number }> = ({ len, r0, r1, color, topColor, split = 0.45 }) => (
  <group>
    {topColor ? (
      <>
        <mesh position={[0, -len * split / 2, 0]} castShadow>
          <cylinderGeometry args={[r0 * 1.12, (r0 + (r1 - r0) * split) * 1.12, len * split, 12]} />
          {mat(topColor, 0.7)}
        </mesh>
        <mesh position={[0, -len * (1 + split) / 2, 0]} castShadow>
          <cylinderGeometry args={[r0 + (r1 - r0) * split, r1, len * (1 - split), 12]} />
          {mat(color)}
        </mesh>
      </>
    ) : (
      <mesh position={[0, -len / 2, 0]} castShadow>
        <cylinderGeometry args={[r0, r1, len, 12]} />
        {mat(color)}
      </mesh>
    )}
    <mesh position={[0, -len, 0]}>
      <sphereGeometry args={[r1 * 1.02, 10, 10]} />
      {mat(color)}
    </mesh>
  </group>
);

export const Athlete: React.FC<{
  pos: [number, number]; facing: number; pose: Pose; run: number; speed: number; look: Look; rim: string;
}> = ({ pos, facing, pose, run, speed, look, rim }) => {
  const k = Math.min(1, speed / 2.2); // how much running motion to blend in
  const ph = run * 2.6;
  const crouch = pose.crouch + k * 0.05;
  const hipY = 0.95 - crouch;
  const thighL = crouch * 3 + k * 0.75 * Math.sin(ph);
  const thighR = crouch * 3 - k * 0.75 * Math.sin(ph);
  const kneeL = -(crouch * 6) - k * 1.1 * (0.5 - 0.5 * Math.cos(ph));
  const kneeR = -(crouch * 6) - k * 1.1 * (0.5 + 0.5 * Math.cos(ph));
  const armSwing = k * 0.5 * Math.sin(ph);
  const bob = k * 0.04 * Math.abs(Math.sin(ph));
  const w = look.build;

  return (
    <group position={[pos[0], bob, pos[1]]} rotation={[0, facing, 0]} scale={[look.height * w, look.height, look.height * w]}>
      {/* pelvis */}
      <group position={[0, hipY, 0]}>
        {/* shorts */}
        <mesh position={[0, -0.04, 0]} castShadow>
          <boxGeometry args={[0.36, 0.2, 0.22]} />
          {mat(look.shorts, 0.8)}
        </mesh>
        {/* legs */}
        {([[-0.1, thighL, kneeL], [0.1, thighR, kneeR]] as const).map(([x, th, kn], i) => (
          <group key={i} position={[x, -0.04, 0]} rotation={[th, 0, 0]}>
            <Limb len={0.44} r0={0.075} r1={0.055} color={look.skin} topColor={look.shorts} split={0.38} />
            <group position={[0, -0.44, 0]} rotation={[kn, 0, 0]}>
              <Limb len={0.43} r0={0.055} r1={0.04} color={look.skin} />
              {/* sock */}
              <mesh position={[0, -0.36, 0]}>
                <cylinderGeometry args={[0.046, 0.044, 0.1, 10]} />
                {mat("#f8fafc", 0.9)}
              </mesh>
              {/* trainer, kept flat-ish */}
              <group position={[0, -0.45, -0.04]} rotation={[-(th + kn), 0, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.1, 0.07, 0.27]} />
                  {mat("#f8fafc", 0.5)}
                </mesh>
                <mesh position={[0, -0.03, 0]}>
                  <boxGeometry args={[0.105, 0.02, 0.275]} />
                  {mat(rim, 0.6)}
                </mesh>
              </group>
            </group>
          </group>
        ))}
        {/* upper body */}
        <group rotation={[-pose.lean, pose.yaw, 0, "YXZ"]}>
          {/* shirt */}
          <mesh position={[0, 0.27, 0]} castShadow>
            <capsuleGeometry args={[0.17, 0.3, 6, 14]} />
            {mat(look.shirt, 0.55)}
          </mesh>
          <mesh position={[0, 0.42, 0]} scale={[1.35, 0.55, 0.9]} castShadow>
            <sphereGeometry args={[0.17, 14, 10]} />
            {mat(look.shirt, 0.55)}
          </mesh>
          {/* neck + head */}
          <mesh position={[0, 0.58, 0]}>
            <cylinderGeometry args={[0.05, 0.055, 0.1, 10]} />
            {mat(look.skin)}
          </mesh>
          <group position={[0, 0.72, 0]}>
            <mesh castShadow scale={[1, 1.12, 1.05]}>
              <sphereGeometry args={[0.11, 18, 16]} />
              {mat(look.skin)}
            </mesh>
            {/* face: eyes, brows, nose (the face looks along -Z) */}
            {[-0.038, 0.038].map((ex) => (
              <group key={ex}>
                <mesh position={[ex, 0.012, -0.1]}>
                  <sphereGeometry args={[0.014, 8, 8]} />
                  <meshStandardMaterial color="#111827" roughness={0.3} />
                </mesh>
                <mesh position={[ex, 0.04, -0.098]} rotation={[0, 0, ex > 0 ? -0.12 : 0.12]}>
                  <boxGeometry args={[0.04, 0.009, 0.01]} />
                  <meshStandardMaterial color={look.hair} roughness={0.9} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, -0.012, -0.112]} rotation={[0.4, 0, 0]}>
              <coneGeometry args={[0.016, 0.04, 8]} />
              {mat(look.skin)}
            </mesh>
            <mesh position={[0, -0.05, -0.098]}>
              <boxGeometry args={[0.04, 0.008, 0.008]} />
              <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
            </mesh>
            {/* hair, swept back off the face */}
            <mesh position={[0, 0.035, 0.03]} rotation={[0.45, 0, 0]} scale={[1.06, 0.95, 1.1]}>
              <sphereGeometry args={[0.11, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              {mat(look.hair, 0.9)}
            </mesh>
            {look.band && (
              <mesh position={[0, 0.035, 0]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.112, 0.016, 6, 24]} />
                {mat(look.band, 0.6)}
              </mesh>
            )}
          </group>
          {/* right arm + racket */}
          <group position={[0.23, 0.45, 0]} rotation={[pose.rSx - armSwing * 0.3, pose.rSy, pose.rSz, "XYZ"]}>
            <Limb len={0.29} r0={0.052} r1={0.042} color={look.skin} topColor={look.shirt} split={0.4} />
            <group position={[0, -0.29, 0]} rotation={[pose.rE, 0, 0]}>
              <Limb len={0.26} r0={0.042} r1={0.034} color={look.skin} />
              <group position={[0, -0.27, 0]} rotation={[pose.wrist, 0, 0]}>
                <Racket rim={rim} />
              </group>
            </group>
          </group>
          {/* left arm */}
          <group position={[-0.23, 0.45, 0]} rotation={[pose.lSx + armSwing * 0.6, pose.lSy, pose.lSz, "XYZ"]}>
            <Limb len={0.29} r0={0.052} r1={0.042} color={look.skin} topColor={look.shirt} split={0.4} />
            <group position={[0, -0.29, 0]} rotation={[pose.lE, 0, 0]}>
              <Limb len={0.26} r0={0.042} r1={0.034} color={look.skin} />
            </group>
          </group>
        </group>
      </group>
      {/* soft contact shadow */}
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
};
