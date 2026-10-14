import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './MainComposition';
import { CANVAS } from './designTokens';

/**
 * Root registration. Duration is 35 seconds at 30 fps, matching the six scene
 * budget: Problem, Solution, and two upload steps, then the merged result and
 * the call to action.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="UBGScheduleDemo"
      component={MainComposition}
      durationInFrames={1050}
      fps={CANVAS.fps}
      width={CANVAS.width}
      height={CANVAS.height}
    />
  );
};