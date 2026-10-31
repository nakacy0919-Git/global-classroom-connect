// GCC V19.0: deterministic five-step recall mission for every practice phrase.
// Separate from Standard/Advanced/Challenge curriculum difficulty.
export const PRACTICE_MISSION_STEPS = Object.freeze([
  {step: 1, accuracy: 80, hidden: 0, label: 'Read the full phrase / 全文を読む'},
  {step: 2, accuracy: 90, hidden: 0.25, label: 'Some words hidden / 少し穴埋め'},
  {step: 3, accuracy: 90, hidden: 0.50, label: 'Half hidden / 半分を隠す'},
  {step: 4, accuracy: 95, hidden: 0.75, label: 'Almost hidden / ほぼ隠す'},
  {step: 5, accuracy: 100, hidden: 1, label: 'Recall everything / 全文を思い出す'},
]);

export function missionStep(saved) {
  const n = Number(saved?.mission?.step);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 1;
}
export function requiredAccuracy(step) {
  return PRACTICE_MISSION_STEPS[Math.max(1, Math.min(5, Number(step) || 1)) - 1].accuracy;
}
export function isMissionComplete(saved) {
  return saved?.mission?.completed === true;
}
// Word positions are repeatable for a phrase, and levels hide an increasing subset.
// Keep punctuation/word boundaries so students can use sentence structure as a clue.
export function maskMissionPhrase(fullText, step) {
  const text = String(fullText ?? '');
  const lvl = Math.max(1, Math.min(5, Number(step) || 1));
  const fraction = PRACTICE_MISSION_STEPS[lvl - 1].hidden;
  if (fraction === 0 || !text.trim()) return text;
  const matches = [...text.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)];
  if (!matches.length) return text;
  const count = fraction === 1 ? matches.length : Math.max(1, Math.ceil(matches.length * fraction));
  const seed = [...text].reduce((h, ch) => (Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0), 2166136261);
  const ranks = matches.map((_, i) => ({i, weight: Math.imul((i + 1) ^ seed, 2654435761) >>> 0}));
  ranks.sort((a, b) => a.weight - b.weight || a.i - b.i);
  const hidden = new Set(ranks.slice(0, count).map(x => x.i));
  let output = '', cursor = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    output += text.slice(cursor, m.index);
    // One recognizable blank per word, never the original English word.
    output += hidden.has(i) ? '_____' : m[0];
    cursor = m.index + m[0].length;
  }
  return output + text.slice(cursor);
}

export function advanceMission(oldMission, accuracy) {
  const old = oldMission && typeof oldMission === 'object' ? oldMission : {};
  const step = Number.isInteger(old.step) && old.step >= 1 && old.step <= 5 ? old.step : 1;
  const previousBest = Array.isArray(old.bestByStep) ? old.bestByStep : [];
  const previousLast = Array.isArray(old.lastByStep) ? old.lastByStep : [];
  const bestByStep = Array.from({length: 5}, (_, i) => Number(previousBest[i]) || 0);
  const lastByStep = Array.from({length: 5}, (_, i) => previousLast[i] ?? null);
  const score = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
  bestByStep[step - 1] = Math.max(bestByStep[step - 1], score);
  lastByStep[step - 1] = score;
  const passed = score >= requiredAccuracy(step);
  const completed = Boolean(old.completed) || (step === 5 && passed);
  return {
    step: completed ? 5 : passed ? Math.min(5, step + 1) : step,
    completed, bestByStep, lastByStep,
  };
}
