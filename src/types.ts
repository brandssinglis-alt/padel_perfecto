// Coordinates are in metres on a 10m x 20m padel court.
// x: 0 (left wall) to 10 (right wall). y: 0 (far back glass) to 20 (near back glass). Net at y = 10.
// Team "A" (blue, the viewer's team) plays the near half (y 10-20). Team "B" (red) the far half.
export type Point = [number, number];

export type Beat = {
  text: string;            // on-screen coaching line for this beat
  seconds: number;         // how long the beat stays on screen
  players: { A1: Point; A2: Point; B1: Point; B2: Point };
  ball?: Point;            // where the ball ends this beat
  arrows?: { from: Point; to: Point; color?: "A" | "B" | "ball" }[];
  zone?: { x: number; y: number; w: number; h: number; label?: string }; // highlighted area
};

export type Scene = {
  id: string;
  level: string;           // e.g. "Beginner", "Intermediate"
  hook: string;            // first line on screen, the scroll-stopper
  beats: Beat[];
  cta: string;             // closing call to action
  caption?: string;        // post caption (not rendered)
  hashtags?: string[];
};
