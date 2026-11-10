import React from "react";
import { Composition } from "remotion";
import { PadelScene, sceneDurationFrames } from "./Court";
import { PadelScene3D } from "./Court3D";
import type { Scene } from "./types";
import sample from "../content/scenes/001-lob-to-take-the-net.json";
import proSample from "../content/scenes/007-how-your-playtomic-level-moves.json";
import { ProSceneComp, proDurationFrames } from "./pro/ProScene";
import type { ProScene } from "./pro/types";

const meta = ({ props }: { props: Record<string, unknown> }) => ({ durationInFrames: sceneDurationFrames((props as { scene: Scene }).scene, 30) });

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="PadelScene"
    component={PadelScene as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={sceneDurationFrames(sample as Scene, 30)}
    defaultProps={{ scene: sample as Scene }}
    calculateMetadata={meta}
  />
  <Composition
    id="PadelScene3D"
    component={PadelScene3D as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={sceneDurationFrames(sample as Scene, 30)}
    defaultProps={{ scene: sample as Scene }}
    calculateMetadata={meta}
  />
  <Composition
    id="PadelPro"
    component={ProSceneComp as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={proDurationFrames(proSample as unknown as ProScene, 30)}
    defaultProps={{ scene: proSample as unknown as ProScene }}
    calculateMetadata={({ props }: { props: Record<string, unknown> }) => ({ durationInFrames: proDurationFrames((props as { scene: ProScene }).scene, 30) })}
  />
  </>
);
