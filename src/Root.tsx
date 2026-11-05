import React from "react";
import { Composition } from "remotion";
import { PadelScene, sceneDurationFrames } from "./Court";
import type { Scene } from "./types";
import sample from "../content/scenes/001-lob-to-take-the-net.json";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PadelScene"
    component={PadelScene as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={sceneDurationFrames(sample as Scene, 30)}
    defaultProps={{ scene: sample as Scene }}
    calculateMetadata={({ props }) => ({ durationInFrames: sceneDurationFrames((props as { scene: Scene }).scene, 30) })}
  />
);
