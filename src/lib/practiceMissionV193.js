// GCC V19.3: display-only score and transition helpers. No persistent score mutation.
import {missionStep,requiredAccuracy} from './practiceMissionV190.js';

// Scores are scoped to the CURRENT 1..5 reading level. Historical levels stay saved.
export function missionDisplayScore(saved) {
  const step=missionStep(saved);
  const last=saved?.mission?.lastByStep?.[step-1];
  const best=saved?.mission?.bestByStep?.[step-1];
  return {
    step,
    score:last==null?0:Math.max(0,Math.min(100,Number(last)||0)),
    best:best==null?0:Math.max(0,Math.min(100,Number(best)||0)),
    threshold:requiredAccuracy(step),
  };
}
export function newlyUnlockedLevel(attemptedStep,progress,accuracy) {
  return Boolean(progress && !progress.completed && progress.step>attemptedStep &&
    Number(accuracy)>=requiredAccuracy(attemptedStep));
}
