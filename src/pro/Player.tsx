// EXPERIMENTAL, not used by the template: Brandon judged this rig worse than the code-built Athlete (2026-11-10).
// Rigged pro player: a skinned, smooth mannequin (Quaternius Universal Animation Library, CC0,
// content/models/) dressed with vertex colours (shirt, shorts, socks, trainers) and a racket.
// Legs and body come from motion-captured clips (athletic stance, jog). Both arms are driven by
// two-bone IK along smooth swing paths, so the racket head reaches the exact contact point.
// The rig faces model +Z with its right hand on -X. All posing happens in model space.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { continueRender, delayRender, staticFile } from "remotion";
import type { Look } from "./Athlete";
import { Racket } from "./Athlete";
import type { ShotType } from "./types";
import type { ActionState } from "./anim";

type Assets = { scene: THREE.Object3D; clips: Record<string, THREE.AnimationClip> };
let cache: Promise<Assets> | null = null;
const loadAssets = () =>
  (cache ??= new GLTFLoader().loadAsync(staticFile("models/UAL1_Standard.glb")).then((g) => {
    const clips: Record<string, THREE.AnimationClip> = {};
    for (const c of g.animations) clips[c.name] = c;
    return { scene: g.scene, clips };
  }));

export const usePlayerAssets = () => {
  const [assets, setAssets] = useState<Assets | null>(null);
  const [handle] = useState(() => delayRender("player models"));
  useEffect(() => {
    loadAssets().then((a) => { setAssets(a); continueRender(handle); }, (e) => console.error("ASSETFAIL", String(e)));
  }, [handle]);
  return assets;
};

// ---------- swing paths ----------
// Body frame: r = to the player's right, u = up, f = forward (towards the net). Metres from the feet.
type V3 = [number, number, number];
type Key = { t: number; head: V3; s: V3; yaw: number; lift?: number; lhand?: V3 }; // head: racket head centre, s: handle-to-head direction
const READY_HEAD: V3 = [0.18, 1.32, 0.6];
const READY_S: V3 = [0.05, 0.78, 0.62];
const R = (t: number): Key => ({ t, head: READY_HEAD, s: READY_S, yaw: 0 });

const SWINGS: Record<ShotType, Key[]> = {
  forehand: [R(-0.6),
    { t: -0.28, head: [0.6, 1.55, -0.35], s: [0.3, 0.75, -0.6], yaw: 0.85, lhand: [-0.2, 1.3, 0.45] },
    { t: 0, head: [0.45, 0.9, 0.55], s: [0.85, -0.15, 0.5], yaw: 0, lhand: [-0.4, 1.1, 0.25] },
    { t: 0.22, head: [-0.35, 1.55, 0.35], s: [-0.45, 0.8, 0.3], yaw: -0.75 },
    R(0.7)],
  backhand: [R(-0.6),
    { t: -0.28, head: [-0.55, 1.5, -0.3], s: [-0.3, 0.75, -0.55], yaw: -0.85 },
    { t: 0, head: [-0.45, 0.9, 0.55], s: [-0.85, -0.15, 0.5], yaw: -0.25, lhand: [-0.45, 1.05, -0.1] },
    { t: 0.22, head: [0.55, 1.6, 0.25], s: [0.5, 0.75, 0.2], yaw: 0.55, lhand: [-0.55, 1.15, -0.25] },
    R(0.7)],
  volley: [R(-0.4),
    { t: -0.15, head: [0.45, 1.5, 0.25], s: [0.35, 0.85, 0.1], yaw: 0.3 },
    { t: 0, head: [0.4, 1.15, 0.55], s: [0.35, 0.8, 0.45], yaw: 0, lhand: [-0.3, 1.2, 0.35] },
    { t: 0.12, head: [0.38, 1.12, 0.66], s: [0.35, 0.8, 0.45], yaw: -0.05 },
    R(0.5)],
  bigswing: [R(-0.7),
    { t: -0.32, head: [0.75, 1.7, -0.45], s: [0.35, 0.7, -0.6], yaw: 1.15, lhand: [-0.2, 1.35, 0.5] },
    { t: 0, head: [0.5, 1.0, 0.55], s: [0.85, -0.1, 0.5], yaw: 0, lhand: [-0.45, 1.1, 0.2] },
    { t: 0.25, head: [-0.5, 1.7, 0.2], s: [-0.5, 0.8, 0.1], yaw: -1.0 },
    R(0.8)],
  smash: [R(-0.75),
    { t: -0.42, head: [0.45, 1.35, -0.45], s: [0.1, -0.5, -0.85], yaw: 0.9, lhand: [-0.15, 2.0, 0.35] },
    { t: -0.13, head: [0.4, 1.95, -0.3], s: [0.15, 0.45, -0.9], yaw: 0.45, lift: 0.08, lhand: [-0.2, 1.8, 0.35] },
    { t: 0, head: [0.25, 2.45, 0.35], s: [0.05, 0.85, 0.5], yaw: 0, lift: 0.15, lhand: [-0.3, 1.4, 0.25] },
    { t: 0.25, head: [-0.3, 0.9, 0.5], s: [-0.35, -0.6, 0.7], yaw: -0.6, lift: 0.04, lhand: [-0.35, 1.1, 0.05] },
    R(0.8)],
  serve: [R(-0.85),
    { t: -0.5, head: [0.3, 1.35, 0.3], s: [0.2, 0.8, 0.3], yaw: 0.3, lhand: [0.15, 0.95, 0.55] },
    { t: -0.28, head: [0.6, 1.4, -0.4], s: [0.3, 0.6, -0.75], yaw: 0.7, lhand: [0.0, 1.0, 0.5] },
    { t: 0, head: [0.4, 0.75, 0.55], s: [0.85, -0.1, 0.5], yaw: 0.05, lhand: [-0.35, 1.1, 0.3] },
    { t: 0.25, head: [-0.1, 1.75, 0.5], s: [-0.15, 0.9, 0.4], yaw: -0.5 },
    R(0.75)],
  lob: [R(-0.6),
    { t: -0.28, head: [0.6, 1.2, -0.35], s: [0.35, 0.6, -0.7], yaw: 0.8, lhand: [-0.2, 1.25, 0.45] },
    { t: 0, head: [0.45, 0.85, 0.55], s: [0.85, -0.25, 0.45], yaw: 0, lhand: [-0.4, 1.1, 0.25] },
    { t: 0.25, head: [0.05, 2.0, 0.4], s: [-0.1, 0.95, 0.3], yaw: -0.4 },
    R(0.75)],
};

const v = (a: V3) => new THREE.Vector3(...a);
// Cubic Hermite through the keys (Catmull-Rom tangents, zero at both ends): smooth, no stops at keys.
const hermite = (keys: Key[], d: number, get: (k: Key) => number[]): number[] => {
  const n = keys.length;
  if (d <= keys[0].t) return get(keys[0]);
  if (d >= keys[n - 1].t) return get(keys[n - 1]);
  let i = 0; while (keys[i + 1].t < d) i++;
  const k0 = keys[i], k1 = keys[i + 1], h = k1.t - k0.t, u = (d - k0.t) / h;
  const tan = (j: number) => {
    if (j === 0 || j === n - 1) return get(keys[j]).map(() => 0);
    const a = get(keys[j - 1]), b = get(keys[j + 1]), dt = keys[j + 1].t - keys[j - 1].t;
    return a.map((_, c) => (b[c] - a[c]) / dt);
  };
  const p0 = get(k0), p1 = get(k1), m0 = tan(i), m1 = tan(i + 1);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return p0.map((_, c) => h00 * p0[c] + h10 * h * m0[c] + h01 * p1[c] + h11 * h * m1[c]);
};
const norm3 = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

type Targets = { head: THREE.Vector3; s: THREE.Vector3; n: THREE.Vector3; yaw: number; lift: number; lhand: THREE.Vector3 | null; rOverride?: THREE.Vector3 };
const sample = (keys: Key[], d: number) => {
  const head = hermite(keys, d, (k) => k.head) as V3;
  const s = norm3(hermite(keys, d, (k) => norm3(k.s)) as V3);
  const yaw = hermite(keys, d, (k) => [k.yaw])[0];
  const lift = hermite(keys, d, (k) => [k.lift ?? 0])[0];
  // left hand: follow keyed positions where given, else stay on the racket throat
  const lw = hermite(keys, d, (k) => [k.lhand ? 1 : 0])[0];
  const lh = hermite(keys, d, (k) => {
    if (k.lhand) return k.lhand;
    const ns = norm3(k.s); return [k.head[0] - ns[0] * 0.2 - 0.05, k.head[1] - ns[1] * 0.2, k.head[2] - ns[2] * 0.2];
  }) as V3;
  return { head, s, yaw, lift, lh, lw };
};

// body frame (r, u, f) -> model space
const B = (r: number, u: number, f: number) => new THREE.Vector3(-r, u, f);
const toModel = (a: V3 | number[]) => B(a[0], a[1], a[2]);

export const swingTargets = (act: ActionState, bob: number): Targets => {
  const sh = act.shot;
  const keys = sh ? SWINGS[sh.type] : [R(0), R(1)];
  const d = sh ? sh.d : 0;
  const a = sample(keys, d);
  // racket face normal follows the direction the head is moving (it faces where it travels)
  const a2 = sample(keys, d + 0.02);
  const vel = toModel([a2.head[0] - a.head[0], a2.head[1] - a.head[1], a2.head[2] - a.head[2]]).multiplyScalar(50);
  const s = toModel(a.s).normalize();
  let n = B(0, 0.15, 1);
  if (sh && sh.type !== "volley") n.lerp(vel.clone().normalize(), Math.min(1, vel.length() / 3));
  n.sub(s.clone().multiplyScalar(n.dot(s)));
  if (n.lengthSq() < 1e-4) n = B(0, 0, 1).sub(s.clone().multiplyScalar(s.z));
  n.normalize();
  const head = toModel(a.head); head.y += bob;
  const lhRacket = head.clone().addScaledVector(s, -0.2).add(B(-0.05, 0, 0));
  const lhand = toModel(a.lh); lhand.y += bob;
  const lw = Math.max(0, Math.min(1, a.lw));
  return { head, s, n, yaw: a.yaw, lift: a.lift, lhand: lhRacket.lerp(lhand, lw) };
};

// ---------- the rig ----------
const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();

const rotateWorld = (bone: THREE.Object3D, q: THREE.Quaternion) => {
  // new local = parentWorld^-1 * q * boneWorld
  const pw = bone.parent!.getWorldQuaternion(tmpQ).invert();
  const bw = bone.getWorldQuaternion(tmpQ2);
  bone.quaternion.copy(pw.multiply(q).multiply(bw));
  bone.updateMatrixWorld(true);
};
const aimBone = (bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3) => {
  const a = bone.getWorldPosition(new THREE.Vector3());
  const cur = child.getWorldPosition(new THREE.Vector3()).sub(a).normalize();
  rotateWorld(bone, new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()));
};
// Two-bone IK: put the wrist on target, elbow bending towards pole.
const solveArm = (up: THREE.Object3D, low: THREE.Object3D, hand: THREE.Object3D, target: THREE.Vector3, pole: THREE.Vector3, a: number, b: number) => {
  const S = up.getWorldPosition(new THREE.Vector3());
  const toT = target.clone().sub(S);
  const d = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.01, toT.length()));
  const u = toT.normalize();
  const pw = pole.clone().sub(S); pw.sub(u.clone().multiplyScalar(pw.dot(u))).normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const E = S.clone().addScaledVector(u, a * cosA).addScaledVector(pw, a * sinA);
  aimBone(up, low, E.clone().sub(S));
  const T = S.clone().addScaledVector(u, d);
  aimBone(low, hand, T.sub(E));
};

const CURL_AXIS = new THREE.Vector3(...((globalThis as { CURL?: V3 }).CURL ?? [0, 0, 1]));
const CURL_SIGN = { r: 1, l: 1 } as Record<string, number>;

// Clothing by bind-pose (T-pose) position, decided per pixel so the sleeve, hem and sock lines are crisp.
type Palette = Record<"shirt" | "shorts" | "skin" | "sock" | "shoe" | "sole", THREE.Color>;
const dressMaterial = (C: Palette) => {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    for (const k of Object.keys(C) as (keyof Palette)[]) sh.uniforms[`c_${k}`] = { value: C[k] };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBind;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vBind;
uniform vec3 c_shirt; uniform vec3 c_shorts; uniform vec3 c_skin; uniform vec3 c_sock; uniform vec3 c_shoe; uniform vec3 c_sole;
vec3 dress(vec3 p) {
  float ax = abs(p.x);
  if (ax > 0.2 && p.y > 1.25) return ax < 0.36 ? c_shirt : c_skin;          // arms (horizontal in T-pose): short sleeves
  if ((p.y > 1.49 && ax < 0.085) || p.y > 1.57) return c_skin;              // neck and head
  if (p.y > 1.0) return c_shirt;
  if (p.y > 0.66) return c_shorts;
  if (p.y > 0.2) return c_skin;
  if (p.y > 0.115) return c_sock;
  if (p.y > 0.012) return c_shoe;
  return c_sole;
}`).replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = dress(vBind);");
  };
  return mat;
};

export type RigLook = Look & { rim: string };

class Rig {
  root: THREE.Object3D;
  bone: Record<string, THREE.Bone> = {};
  mixer: THREE.AnimationMixer;
  stance: THREE.AnimationAction;
  jog: THREE.AnimationAction;
  ua: number; la: number; shoulderY: number;

  constructor(assets: Assets, look: RigLook) {
    this.root = skClone(assets.scene);
    this.root.traverse((o) => { if ((o as THREE.Bone).isBone) this.bone[o.name] = o as THREE.Bone; });
    this.root.updateMatrixWorld(true);
    const col = (h: string) => new THREE.Color(h);
    const C = { shirt: col(look.shirt), shorts: col(look.shorts), skin: col(look.skin), sock: col("#f8fafc"), shoe: col("#f1f5f9"), sole: col(look.rim) };
    const headBox = new THREE.Box3();
    this.root.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 1.58 && Math.abs(pos.getX(i)) < 0.15) headBox.expandByPoint(tmpV.set(pos.getX(i), pos.getY(i), pos.getZ(i)));
    });
    this.root.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      m.material = dressMaterial(C);
      m.castShadow = true;
      m.frustumCulled = false;
    });
    // hair (and optional headband) on the head bone
    const head = this.bone.Head;
    const hc = headBox.getCenter(new THREE.Vector3()), hs = headBox.getSize(new THREE.Vector3());
    const r = Math.max(hs.x, hs.z) / 2;
    const attach = (mesh: THREE.Object3D, p: THREE.Vector3, rot: THREE.Euler, scale = new THREE.Vector3(1, 1, 1)) => {
      const world = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(rot), scale);
      mesh.applyMatrix4(head.matrixWorld.clone().invert().multiply(world));
      head.add(mesh);
    };
    const hair = new THREE.Mesh(new THREE.SphereGeometry(r * 1.07, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.85 }));
    hair.castShadow = true;
    attach(hair, hc.clone().add(new THREE.Vector3(0, hs.y * 0.08, -r * 0.12)), new THREE.Euler(-0.5, 0, 0), new THREE.Vector3(1, hs.y / (2 * r), 1.05));
    if (look.band) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, 0.014, 8, 32), new THREE.MeshStandardMaterial({ color: look.band, roughness: 0.6 }));
      attach(band, hc.clone().add(new THREE.Vector3(0, hs.y * 0.12, -0.005)), new THREE.Euler(Math.PI / 2 - 0.25, 0, 0), new THREE.Vector3(1, 1.08, 1));
    }
    for (const ex of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.3 }));
      attach(eye, hc.clone().add(new THREE.Vector3(ex * r * 0.36, hs.y * 0.04, headBox.max.z - 0.012)), new THREE.Euler());
    }

    const bp = (n: string) => this.bone[n].getWorldPosition(new THREE.Vector3());
    this.ua = bp("upperarm_r").distanceTo(bp("lowerarm_r"));
    this.la = bp("lowerarm_r").distanceTo(bp("hand_r"));
    this.shoulderY = bp("upperarm_r").y;
    this.mixer = new THREE.AnimationMixer(this.root);
    this.stance = this.mixer.clipAction(assets.clips.Sword_Idle ?? assets.clips.Idle_Loop);
    this.jog = this.mixer.clipAction(assets.clips.Jog_Fwd_Loop);
    this.stance.play(); this.jog.play();
  }

  // Pose for one frame. run: 0..1 running blend; phase: metres run; back: running backwards.
  pose(tg: Targets, run: number, dist: number, back: boolean, T: number) {
    const parent = this.root.parent;
    (this.root as { parent: THREE.Object3D | null }).parent = null;
    this.root.position.set(0, tg.lift, 0);
    const sd = this.stance.getClip().duration, jd = this.jog.getClip().duration;
    this.stance.time = (T * 0.8) % sd;
    let jt = ((dist / 2.6) * jd) % jd; if (back) jt = jd - jt;
    this.jog.time = jt;
    this.stance.setEffectiveWeight(1 - run);
    this.jog.setEffectiveWeight(run);
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);

    const bn = this.bone;
    // torso turn, spread over the spine
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -tg.yaw / 3);
    for (const s of ["spine_01", "spine_02", "spine_03"]) rotateWorld(bn[s], yawQ);
    // slight lean into the shot
    // right arm: wrist sits 0.38 m back from the racket head along the handle
    const wrist = tg.head.clone().addScaledVector(tg.s, -0.38);
    const sh = bn.upperarm_r.getWorldPosition(new THREE.Vector3());
    const hi = Math.max(0, Math.min(1, (wrist.y - sh.y) / 0.4));
    const poleR = sh.clone().add(B(0.4, -0.6, -0.35).lerp(B(0.7, 0.15, -0.1), hi));
    solveArm(bn.upperarm_r, bn.lowerarm_r, bn.hand_r, wrist, poleR, this.ua, this.la);
    aimBone(bn.hand_r, bn.middle_01_r, tg.s);
    // left arm
    if (tg.lhand) {
      const shl = bn.upperarm_l.getWorldPosition(new THREE.Vector3());
      const hl = Math.max(0, Math.min(1, (tg.lhand.y - shl.y) / 0.4));
      const poleL = shl.clone().add(B(-0.4, -0.6, -0.3).lerp(B(-0.7, 0.15, -0.1), hl));
      solveArm(bn.upperarm_l, bn.lowerarm_l, bn.hand_l, tg.lhand, poleL, this.ua, this.la);
    }
    // close the hands: right round the grip, left loosely
    for (const [side, k] of [["r", 1], ["l", 0.6]] as const) {
      for (const f of ["index", "middle", "ring", "pinky"]) for (const j of [1, 2, 3]) {
        const b = bn[`${f}_0${j}_${side}`]; if (!b) continue;
        b.quaternion.multiply(tmpQ.setFromAxisAngle(CURL_AXIS, (j === 1 ? 1.0 : 1.2) * k * CURL_SIGN[side]));
      }
      const th = bn[`thumb_02_${side}`]; if (th) th.quaternion.multiply(tmpQ.setFromAxisAngle(CURL_AXIS, 0.5 * k * CURL_SIGN[side]));
    }
    this.root.updateMatrixWorld(true);
    // racket: butt 0.07 m behind the palm; palm 0.08 m past the wrist
    const palm = bn.hand_r.getWorldPosition(new THREE.Vector3()).addScaledVector(tg.s, 0.08);
    const origin = palm.addScaledVector(tg.s, -0.07);
    const Y = tg.s.clone().negate(), Z = tg.n.clone(), X = new THREE.Vector3().crossVectors(Y, Z).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    (this.root as { parent: THREE.Object3D | null }).parent = parent;
    return { pos: origin.toArray() as V3, quat: q.toArray() as [number, number, number, number] };
  }
}

export const RigPlayer: React.FC<{ assets: Assets; look: RigLook; act: ActionState; run: number; dist: number; back: boolean; T: number }> = ({ assets, look, act, run, dist, back, T }) => {
  const rig = useMemo(() => new Rig(assets, look), [assets, look]);
  const swingW = act.shot ? 1 : 0;
  const bob = run * (1 - swingW) * 0.03 * Math.sin(dist * 4.8);
  const tg = swingTargets(act, bob);
  // gestures override the arms
  for (const g of act.gestures) {
    const k = g.k;
    if (g.type === "armsUp") {
      tg.head.lerp(B(0.35, 2.3, 0.05), k); tg.s.lerp(B(0.15, 0.95, 0.05), k).normalize();
      tg.lhand = (tg.lhand ?? tg.head.clone()).lerp(B(-0.32, 2.0, 0.08), k);
    } else if (g.type === "thumbsUp") {
      tg.lhand = (tg.lhand ?? tg.head.clone()).lerp(B(-0.15, 1.38, 0.38), k);
    } else if (g.type === "point") {
      tg.lhand = (tg.lhand ?? tg.head.clone()).lerp(B(-0.05, 1.42, 0.62), k);
    }
  }
  const rk = rig.pose(tg, run, dist, back, T);
  return (
    <group>
      <primitive object={rig.root} />
      <group position={rk.pos} quaternion={rk.quat}>
        <Racket rim={look.rim} />
      </group>
    </group>
  );
};
