// "Pro" scene format: pro-style 3D players who swing on ball contact, a camera chosen per beat,
// and richer overlays. Coordinates are court metres as in ../types.ts:
// x 0 (left wall) to 10 (right wall), y 0 (far back glass) to 20 (near back glass), net at y = 10.
// Team A (YOU = A1, P = A2, cyan) plays the near half; team B (R1 = B1, R2 = B2, red) the far half.
// All times inside a beat are seconds from the start of that beat, in animation time
// (a beat with slow: 0.5 plays its animation at half speed).
import type { Point } from "../types";

export type Pid = "A1" | "A2" | "B1" | "B2";
export type Positions = Partial<Record<Pid, Point>>;

export type ShotType = "forehand" | "backhand" | "volley" | "bigswing" | "smash" | "serve" | "lob";

export type Shot = {
  by: Pid;
  type: ShotType;
  at: number;               // moment of ball contact
  to?: Point;               // where the ball goes; omit to fly straight to the next shot's contact point
  toH?: number;             // height (m) at `to`; default 0 (lands)
  dur?: number;             // flight time; default from distance and shot type
  arc?: number;             // extra apex height of the flight (m)
  bounce?: Point;           // optional bounce on the way to `to` / the next hitter
};

export type Gesture = { who: Pid; type: "armsUp" | "thumbsUp" | "point"; at: number; dur?: number };

export type CamMode = "tactics" | "follow" | "side" | "behind";
export type CamKey = { at: number; mode: CamMode; target?: Pid; blend?: number }; // blend 0 = hard cut

export type Tone = "green" | "red" | "grey" | "yellow";

export type ProBeat = {
  text: string;             // on-screen line ("" for none)
  say?: string;             // voiceover line (defaults to text)
  seconds: number;
  slow?: number;            // animation speed in this beat (0.4 = slow motion)
  freezeAt?: number;        // stop all motion at this beat time (real seconds)
  moveAt?: number;          // when players start moving to `players` (default 0)
  moveDur?: number;         // default 0.9
  players?: Positions;      // positions reached in this beat
  keys?: { at: number; dur?: number; to: Positions }[]; // extra moves later in the beat
  shots?: Shot[];
  gestures?: Gesture[];
  camera?: CamKey[];        // camera changes in this beat (first one may be at 0)
  zones?: { x: number; y: number; w: number; h: number; label?: string; tone?: Tone; at?: number }[];
  arrows?: { from: Point; to: Point; tone?: "A" | "B" | "ball"; at?: number }[];
  badges?: { who: Pid | "A" | "B"; from: number; to?: number; label?: string; at?: number; tone?: Tone }[];
  bubbles?: { who: Pid; text: string; at: number }[];
  stamp?: { text: string; tone: Tone; at: number };
  countdown?: { from: number; at: number };
  cards?: { title: string; sub?: string; tone: Tone; at: number }[];
  replay?: boolean;         // shows a REPLAY tag
};

export type ProScene = {
  format: "pro";
  id: string;
  chapter: "Level Up" | "Shot School" | "Court Zones" | "Myth or Fact" | "Kit Room";
  series: string;           // e.g. "Level Up #1" or "Partner Problems #1"
  level: string;
  hook: string;
  cta: string;              // end card line
  cover?: { lines: string[]; hi?: number }; // cover title (content/covers/<id>.png, made by covers.mjs); hi = highlighted line
  caption?: string;
  hashtags?: string[];
  voiced?: boolean;
  labels?: boolean;         // name tags over players (default true)
  style?: "board" | "3d";   // board (default): overhead tactics board with player markers; 3d: figures and close cameras
  start: { A1: Point; A2: Point; B1: Point; B2: Point; ball?: Point };
  beats: ProBeat[];
  // Filled in by render.mjs for voiced scenes:
  audio?: { beats: (string | undefined)[] };
};
