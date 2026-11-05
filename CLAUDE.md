# Padel Perfecto content engine

Generates short vertical padel coaching videos (TikTok / Instagram Reels) from scene files.

## Layout
- `content/scenes/<id>.json`: one video each. Schema in `src/types.ts`.
- `content/backlog.md`: concept ideas not yet made. `content/published.md`: what's been posted.
- `src/Court.tsx`: the animated court template. `render.mjs`: renders scenes to `out/<id>.mp4`.
- `validate.mjs`: run before every render.

## Court coordinates
Metres. x 0 (left wall) to 10 (right wall); y 0 (far back glass) to 20 (near back glass); net at y = 10.
Service lines at y = 3.05 and y = 16.95. Team A (YOU + P, cyan) is always the near half (y 10–20);
team B (R1, R2, red) the far half. Net position is about 2.5–3.5 m from the net; back position is about 1–2 m from the back glass.

## Weekly batch procedure
1. Read `content/backlog.md` and `content/published.md`. Pick N new concepts (default 5), mixing levels and topics.
2. For each, write a scene file. Keep it to 3–5 beats with 2–5 s each, hook ≤ 60 chars, beat text ≤ 70 chars, and one idea per video.
   Tactics must be correct for standard doubles padel. If unsure, pick a different concept rather than guess.
3. Include `caption` (1–2 sentences ending with a question to drive comments) and 4–6 `hashtags`.
4. `npm ci` if needed, then `node validate.mjs`, then
   `REMOTION_CHROME=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/*/chrome-headless-shell | head -1) node render.mjs <ids>`.
5. Extract a frame from each beat with ffmpeg and look at it to check that players and arrows match the text.
6. Commit the scenes, move the concepts from the backlog to published (status: rendered, awaiting review), and push.
7. Report the videos for human review. Never publish publicly without the owner's approval.
