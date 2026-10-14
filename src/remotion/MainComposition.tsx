import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { interpolateValue } from './designTokens';
import { VideoLayoutContainer } from './VideoMockupComponents';
import { Scene1Problem } from './Scene1Problem';
import { Scene2Solution } from './Scene2Solution';
import { Scene3UploadTeori } from './Scene3UploadTeori';
import { Scene4UploadPraktikum } from './Scene4UploadPraktikum';
import { Scene5Result } from './Scene5Result';
import { Scene6Outro } from './Scene6Outro';

export interface SceneComponentProps {
  frame: number;
}

interface SceneDef {
  name: string;
  start: number;
  end: number;
  Comp: React.FC<SceneComponentProps>;
}

/**
 * Master timeline, 1050 frames at 30 fps (35 seconds).
 * Neighbouring scenes overlap across a 12-frame window so they cross-dissolve
 * instead of hard cutting. Local frames passed to each scene may go slightly
 * negative during the incoming dissolve; every scene helper clamps by design.
 */
const SCENE_DEFS: SceneDef[] = [
  { name: 'Problem', start: 0, end: 150, Comp: Scene1Problem },
  { name: 'Solution', start: 150, end: 330, Comp: Scene2Solution },
  { name: 'Langkah1Teori', start: 330, end: 540, Comp: Scene3UploadTeori },
  { name: 'Langkah2Praktikum', start: 540, end: 750, Comp: Scene4UploadPraktikum },
  { name: 'Langkah3Result', start: 750, end: 930, Comp: Scene5Result },
  { name: 'Outro', start: 930, end: 1050, Comp: Scene6Outro },
];

const TRANSITION_FRAMES = 12;

function sceneOpacity(frame: number, start: number, end: number, isFirst: boolean, isLast: boolean): number {
  let opacity = 1;
  if (!isFirst) {
    opacity = Math.min(opacity, interpolateValue(frame, [start - TRANSITION_FRAMES, start], [0, 1]));
  }
  if (!isLast) {
    opacity = Math.min(opacity, interpolateValue(frame, [end - TRANSITION_FRAMES, end], [1, 0]));
  }
  return opacity;
}

export const MainComposition: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <VideoLayoutContainer frame={frame}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {SCENE_DEFS.map((def, index) => {
            const isFirst = index === 0;
            const isLast = index === SCENE_DEFS.length - 1;
            const opacity = sceneOpacity(frame, def.start, def.end, isFirst, isLast);
            if (opacity <= 0.001) {
              return null;
            }
            const localFrame = frame - def.start;
            const Comp = def.Comp;
            return (
              <div
                key={def.name}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Comp frame={localFrame} />
              </div>
            );
          })}
        </div>
      </VideoLayoutContainer>
    </AbsoluteFill>
  );
};