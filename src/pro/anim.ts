// Pure animation maths for pro scenes: real time -> animation time, player positions,
// ball flight, swing/gesture poses and the camera. No React here.
import type { Point } from "../types";
import type { CamKey, Pid, ProBeat, ProScene, Shot, ShotType } from "./types";

export const PIDS: Pid[] = ["A1", "A2", "B1", "B2"];
export const INTRO = 0.4;   // players pop in before beat 1
export const OUTRO = 1.6;   // end card
export const FPS = 30;

export const durationSeconds = (s: ProScene) => INTRO + s.beats.reduce((a, b) => a + b.seconds, 0) + OUTRO;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
const lerpP = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------- time ----------
// Each beat has a real length (seconds) and an animation length (frozen/slowed time).
const animLen = (b: ProBeat) => Math.min(b.seconds, b.freezeAt ?? Infinity) * (b.slow ?? 1);

export type Clock = {
  t: number;            // real seconds
  beat: number;         // -1 intro, beats.length = outro
  local: number;        // real seconds into the beat
  T: number;            // global animation time
  beatStartsReal: number[];
  beatStartsAnim: number[];
};

export const clock = (s: ProScene, t: number): Clock => {
  const beatStartsReal: number[] = [], beatStartsAnim: number[] = [];
  let r = INTRO, a = INTRO;
  for (const b of s.beats) { beatStartsReal.push(r); beatStartsAnim.push(a); r += b.seconds; a += animLen(b); }
  let beat = -1, local = t;
  for (let i = 0; i < s.beats.length; i++) if (t >= beatStartsReal[i]) { beat = i; local = t - beatStartsReal[i]; }
  if (t >= r) { beat = s.beats.length; local = t - r; }
  let T: number;
  if (beat < 0) T = t;
  else if (beat >= s.beats.length) T = a;
  else {
    const b = s.beats[beat];
    T = beatStartsAnim[beat] + Math.min(local, b.freezeAt ?? Infinity, b.seconds) * (b.slow ?? 1);
  }
  return { t, beat, local, T, beatStartsReal, beatStartsAnim };
};

// Global anim time of a beat-local time (beat-local times in scene files are real seconds;
// converted through the beat's slow factor, capped at its freeze).
const toAnim = (s: ProScene, starts: number[], beat: number, at: number) => {
  const b = s.beats[beat];
  return starts[beat] + Math.min(at, b.freezeAt ?? Infinity) * (b.slow ?? 1);
};

// ---------- timeline compile (memoised per scene object) ----------
type MoveSeg = { t0: number; t1: number; to: Point };
export type Flight = { t0: number; t1: number; p0: [number, number, number]; p1: [number, number, number]; arc: number; bounce?: Point };
export type ShotEv = Shot & { T: number };
export type GestEv = { who: Pid; type: string; T0: number; T1: number };
export type CamEv = CamKey & { T: number; tr: number; beat: number }; // tr: real time (cameras keep moving through freezes)
type Compiled = {
  moves: Record<Pid, MoveSeg[]>;
  shots: ShotEv[];
  flights: Flight[];
  gestures: GestEv[];
  cams: CamEv[];
  starts: number[];
};

const cache = new WeakMap<ProScene, Compiled>();

const SHOT_H: Record<ShotType, number> = { forehand: 0.9, backhand: 0.9, volley: 1.15, bigswing: 1.0, smash: 2.7, serve: 0.75, lob: 0.85 };
const SHOT_SIDE: Record<ShotType, number> = { forehand: 0.45, backhand: -0.45, volley: 0.4, bigswing: 0.5, smash: 0.25, serve: 0.4, lob: 0.45 };
const SHOT_SPEED: Record<ShotType, number> = { forehand: 13, backhand: 12, volley: 12, bigswing: 18, smash: 20, serve: 9, lob: 7 };
const SHOT_ARC: Record<ShotType, number> = { forehand: 0.6, backhand: 0.6, volley: 0.25, bigswing: 0.5, smash: 0, serve: 0.6, lob: 4.5 };

const compile = (s: ProScene): Compiled => {
  const hit = cache.get(s);
  if (hit) return hit;
  const { beatStartsAnim: starts, beatStartsReal } = clock(s, 0);
  const moves = { A1: [], A2: [], B1: [], B2: [] } as Record<Pid, MoveSeg[]>;
  const shots: ShotEv[] = [];
  const gestures: GestEv[] = [];
  const cams: CamEv[] = [];
  s.beats.forEach((b, i) => {
    if (b.players) {
      const t0 = toAnim(s, starts, i, b.moveAt ?? 0);
      const t1 = t0 + (b.moveDur ?? 0.9) * (b.slow ?? 1);
      for (const k of PIDS) if (b.players[k]) moves[k].push({ t0, t1, to: b.players[k]! });
    }
    for (const key of b.keys ?? []) {
      const t0 = toAnim(s, starts, i, key.at);
      const t1 = t0 + (key.dur ?? 0.9) * (b.slow ?? 1);
      for (const k of PIDS) if (key.to[k]) moves[k].push({ t0, t1, to: key.to[k]! });
    }
    const live = (at: number) => b.freezeAt === undefined || at < b.freezeAt; // nothing happens after a freeze
    for (const sh of b.shots ?? []) if (live(sh.at)) shots.push({ ...sh, T: toAnim(s, starts, i, sh.at) });
    for (const g of b.gestures ?? []) {
      if (!live(g.at)) continue;
      const T0 = toAnim(s, starts, i, g.at);
      gestures.push({ who: g.who, type: g.type, T0, T1: T0 + (g.dur ?? 1.6) * (b.slow ?? 1) });
    }
    for (const c of b.camera ?? []) cams.push({ ...c, T: toAnim(s, starts, i, c.at), tr: beatStartsReal[i] + c.at, beat: i });
  });
  for (const k of PIDS) moves[k].sort((a, b) => a.t0 - b.t0);
  shots.sort((a, b) => a.T - b.T);
  const partial = { moves, shots, flights: [] as Flight[], gestures, cams, starts };
  cache.set(s, partial);
  // Flights: from each contact point to `to` (or the next contact point).
  shots.forEach((sh, i) => {
    const p0 = contactPoint(s, sh, sh.T);
    const next = shots[i + 1];
    let p1: [number, number, number];
    if (sh.to) p1 = [sh.to[0], sh.toH ?? 0, sh.to[1]];
    else if (next) p1 = contactPoint(s, next, next.T);
    else p1 = [p0[0], 0, p0[2] + (sh.by[0] === "A" ? -8 : 8)];
    const dist = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
    let t1 = sh.T + (sh.dur ?? Math.max(0.35, dist / SHOT_SPEED[sh.type]));
    if (!sh.to && next && sh.dur === undefined) t1 = next.T;
    partial.flights.push({ t0: sh.T, t1, p0, p1, arc: sh.arc ?? SHOT_ARC[sh.type], bounce: sh.bounce });
  });
  return partial;
};

// ---------- players ----------
export const position = (s: ProScene, who: Pid, T: number): Point => {
  const { moves } = compile(s);
  let p: Point = s.start[who];
  for (const m of moves[who]) {
    if (T >= m.t1) { p = m.to; continue; }
    if (T > m.t0) { p = lerpP(p, m.to, smooth((T - m.t0) / (m.t1 - m.t0))); }
    break;
  }
  return p;
};

export const velocity = (s: ProScene, who: Pid, T: number): Point => {
  const a = position(s, who, T - 0.05), b = position(s, who, T + 0.05);
  return [(b[0] - a[0]) / 0.1, (b[1] - a[1]) / 0.1];
};

// Distance run so far (drives the running cycle).
export const runPhase = (s: ProScene, who: Pid, T: number) => {
  let d = 0, prev = position(s, who, 0);
  for (let x = 0.1; x <= T; x += 0.1) { const p = position(s, who, x); d += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; }
  return d;
};

// Where the ball is struck: in front of and to the side of the hitter.
// Team A faces -y (towards the net), team B faces +y. Side is the hitter's right.
export const contactPoint = (s: ProScene, sh: Shot, T: number): [number, number, number] => {
  const [x, y] = position(s, sh.by, T);
  const fwd = sh.by[0] === "A" ? -1 : 1;
  const right = sh.by[0] === "A" ? 1 : -1;
  const side = SHOT_SIDE[sh.type];
  const ahead = sh.type === "smash" ? 0.35 : 0.55;
  return [x + right * side, SHOT_H[sh.type], y + fwd * ahead];
};

// ---------- ball ----------
const arcPos = (p0: [number, number, number], p1: [number, number, number], arc: number, u: number): [number, number, number] => {
  const h = p0[1] + (p1[1] - p0[1]) * u + 4 * arc * u * (1 - u);
  return [p0[0] + (p1[0] - p0[0]) * u, Math.max(0, h), p0[2] + (p1[2] - p0[2]) * u];
};

export const ballAt = (s: ProScene, T: number): [number, number, number] | null => {
  const { flights, shots } = compile(s);
  if (!flights.length) return s.start.ball ? [s.start.ball[0], 0.05, s.start.ball[1]] : null;
  if (T < flights[0].t0) {
    // Before the first shot the ball waits at the first contact point (or the scene's start ball).
    if (s.start.ball) return [s.start.ball[0], 0.9, s.start.ball[1]];
    return contactPoint(s, shots[0], T);
  }
  let f = flights[0];
  for (const x of flights) if (T >= x.t0) f = x;
  if (T >= f.t1) {
    // After the flight: on the ground stays put; in the air drops. A dead ball disappears after a
    // moment and the next rally's ball appears in the next hitter's hand just before their shot.
    const after = T - f.t1;
    const next = shots.find((x) => x.T > T);
    if (next && next.T - T < 0.5 && after > 0.3) return contactPoint(s, next, T);
    if (after > 1.2) return null;
    if (f.p1[1] <= 0.01) return [f.p1[0], 0.05, f.p1[2]];
    const h = Math.max(0.05, f.p1[1] - 4.9 * after * after);
    return [f.p1[0], h, f.p1[2]];
  }
  const u = (T - f.t0) / (f.t1 - f.t0);
  if (f.bounce) {
    const b: [number, number, number] = [f.bounce[0], 0.05, f.bounce[1]];
    const split = 0.6;
    if (u < split) return arcPos(f.p0, b, f.arc, u / split);
    return arcPos(b, f.p1, Math.max(0.5, f.arc * 0.6), (u - split) / (1 - split));
  }
  return arcPos(f.p0, f.p1, f.arc, u);
};

// ---------- poses ----------
// Joint angles in radians. The athlete faces local -Z; +X is their right.
export type Pose = {
  yaw: number; lean: number; crouch: number;
  rSx: number; rSy: number; rSz: number; rE: number; wrist: number;
  lSx: number; lSy: number; lSz: number; lE: number;
};
export const READY: Pose = { yaw: 0, lean: 0.12, crouch: 0.06, rSx: 0.55, rSy: 0, rSz: 0.25, rE: 0.9, wrist: 1.4, lSx: 0.5, lSy: 0, lSz: -0.25, lE: 0.9 };
const P = (o: Partial<Pose>): Pose => ({ ...READY, ...o });

// [backswing, contact, follow-through] for each shot.
const SWINGS: Record<ShotType, [Pose, Pose, Pose]> = {
  forehand: [P({ yaw: -0.9, rSx: -0.4, rSz: 1.1, rE: 0.5, wrist: 1.3, lSx: 0.9, lSz: 0.3 }), P({ yaw: 0.1, rSx: 0.7, rSz: 1.0, rE: 0.25, wrist: 1.0 }), P({ yaw: 0.8, rSx: 1.5, rSy: 0.6, rSz: 0.4, rE: 0.9, wrist: 1.0 })],
  backhand: [P({ yaw: 0.9, rSx: 0.3, rSy: -0.6, rSz: -0.5, rE: 1.2, wrist: 1.2, lSx: 0.4, lSz: -0.2 }), P({ yaw: 0, rSx: 0.8, rSz: 0.9, rE: 0.2, wrist: 1.0 }), P({ yaw: -0.6, rSx: 1.4, rSz: 1.3, rE: 0.3, wrist: 1.0 })],
  volley: [P({ yaw: -0.35, rSx: 0.7, rSz: 0.9, rE: 1.3, wrist: 1.2 }), P({ yaw: 0, rSx: 1.05, rSz: 0.55, rE: 0.35, wrist: 1.7 }), P({ yaw: 0.1, rSx: 1.15, rSz: 0.5, rE: 0.3, wrist: 1.65 })],
  bigswing: [P({ yaw: -1.3, rSx: -1.0, rSz: 1.4, rE: 0.2, wrist: 1.0, lSx: 1.1 }), P({ yaw: 0.2, rSx: 0.8, rSz: 1.1, rE: 0.1, wrist: 0.7 }), P({ yaw: 1.3, rSx: 2.0, rSy: 0.8, rSz: 0.3, rE: 1.0, wrist: 0.8 })],
  smash: [P({ yaw: -0.7, lean: -0.1, rSx: 3.3, rSz: 0.3, rE: 2.0, wrist: 0, lSx: 2.7, lSz: -0.2, lE: 0.1 }), P({ yaw: 0, lean: 0.05, rSx: 2.95, rSz: 0.2, rE: 0.05, wrist: 0.1, lSx: 1.2 }), P({ yaw: 0.6, lean: 0.3, rSx: 0.9, rSz: -0.3, rE: 0.3, wrist: 0.6, lSx: 0.6 })],
  serve: [P({ yaw: -0.6, crouch: 0.12, rSx: -0.7, rSz: 0.5, rE: 0.4, wrist: 0.6, lSx: 0.9, lE: 0.3 }), P({ yaw: 0, crouch: 0.12, rSx: 0.45, rSz: 0.45, rE: 0.2, wrist: 0.9 }), P({ yaw: 0.5, rSx: 1.6, rSz: 0.4, rE: 0.6, wrist: 1.1 })],
  lob: [P({ yaw: -0.8, crouch: 0.14, rSx: -0.6, rSz: 0.9, rE: 0.4, wrist: 0.6 }), P({ yaw: 0, crouch: 0.12, rSx: 0.5, rSz: 0.8, rE: 0.2, wrist: 0.9 }), P({ yaw: 0.4, rSx: 2.3, rSz: 0.6, rE: 0.4, wrist: 0.4 })],
};
const GESTURES: Record<string, Pose> = {
  armsUp: P({ lean: -0.05, crouch: 0, rSx: 2.7, rSz: 0.45, rE: 0.3, lSx: 2.7, lSz: -0.45, lE: 0.3 }),
  thumbsUp: P({ rSx: 1.2, rSz: 0.5, rE: 1.9, wrist: 0.2 }),
  point: P({ rSx: 1.55, rSz: 0.2, rE: 0.05, wrist: 0.2 }),
};

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
};

export const poseAt = (s: ProScene, who: Pid, T: number): Pose => {
  const { shots, gestures } = compile(s);
  let pose = READY;
  for (const sh of shots) {
    if (sh.by !== who) continue;
    const d = T - sh.T;
    if (d < -0.6 || d > 0.75) continue;
    const [back, hit, follow] = SWINGS[sh.type];
    if (d < -0.25) pose = mixPose(READY, back, smooth((d + 0.6) / 0.35));
    else if (d < 0) pose = mixPose(back, hit, (d + 0.25) / 0.25);
    else if (d < 0.25) pose = mixPose(hit, follow, smooth(d / 0.25));
    else pose = mixPose(follow, READY, smooth((d - 0.25) / 0.5));
    return pose;
  }
  for (const g of gestures) {
    if (g.who !== who || T < g.T0 || T > g.T1) continue;
    const target = GESTURES[g.type] ?? READY;
    const k = Math.min(smooth((T - g.T0) / 0.25), smooth((g.T1 - T) / 0.3));
    return mixPose(READY, target, k);
  }
  return pose;
};

// ---------- camera ----------
export type CamState = { pos: [number, number, number]; look: [number, number, number]; fov: number };
// three.js coordinates: X = x - 5, Z = y - 10, Y up.
const W3 = (x: number, y: number): [number, number] => [x - 5, y - 10];

const camFor = (s: ProScene, key: CamKey, T: number): CamState => {
  if (key.mode === "follow") {
    // Behind the near team, at player height, tracking the ball (smoothed).
    const pts = [0, 0.12, 0.24].map((d) => ballAt(s, T - d)).filter(Boolean) as [number, number, number][];
    if (pts.length) {
      const b = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
      const [bx, bz] = W3(b[0], b[2]);
      const cz = Math.min(13.5, bz + 8.5);
      return { pos: [bx * 0.5, 4.2, cz], look: [bx * 0.85, 0.8 + b[1] * 0.3, bz - 1.5], fov: 52 };
    }
  }
  if ((key.mode === "side" || key.mode === "behind") && key.target) {
    const [px, py] = position(s, key.target, T);
    const [x, z] = W3(px, py);
    const facing = key.target[0] === "A" ? -1 : 1; // direction to the net in Z
    if (key.mode === "side") {
      const right = key.target[0] === "A" ? 1 : -1; // front three-quarter view from the forehand (right) side
      const cx = Math.max(-4.6, Math.min(4.6, x + right * 3.0));
      return { pos: [cx, 1.45, z + facing * 1.1], look: [x, 1.1, z + facing * 0.35], fov: 48 };
    }
    return { pos: [x + 0.9, 2.3, z - facing * 4.2], look: [x, 1.0, z + facing * 2.5], fov: 50 };
  }
  // tactics: high broadcast view of the whole court from behind the near glass
  return { pos: [0, 24.5, 19.5], look: [0, 0, 0.9], fov: 40 };
};

const mixCam = (a: CamState, b: CamState, t: number): CamState => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * t) as CamState["pos"],
  look: a.look.map((v, i) => v + (b.look[i] - v) * t) as CamState["look"],
  fov: a.fov + (b.fov - a.fov) * t,
});

export const cameraAt = (s: ProScene, T: number, t: number): CamState => {
  const { cams } = compile(s);
  const keys: CamEv[] = [{ at: 0, mode: "tactics", T: -1, tr: -1, beat: -1 }, ...cams];
  let i = 0;
  for (let k = 0; k < keys.length; k++) if (t >= keys[k].tr) i = k;
  const cur = camFor(s, keys[i], T);
  if (i === 0) return cur;
  const blend = keys[i].blend ?? 0.8;
  if (blend <= 0) return cur;
  const u = (t - keys[i].tr) / blend;
  if (u >= 1) return cur;
  return mixCam(camFor(s, keys[i - 1], T), cur, smooth(u));
};
