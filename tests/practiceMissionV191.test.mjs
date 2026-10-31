import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRACTICE_MISSION_STEPS,advanceMission} from '../src/lib/practiceMissionV190.js';
const page=readFileSync(new URL('../src/pages/public/PracticePageV170.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/practiceMissionV191.css',import.meta.url),'utf8');

test('Gray blanks use DOM nodes and do not leak source words',()=>{
 assert.match(page,/function renderMissionBlanks\(model,n\)/);
 assert.match(page,/maskMissionPhrase\(model,n\)\.split\('_____'\)/);
 assert.match(page,/document\.createElement\('span'\)/);
 assert.match(page,/prompt\.replaceChildren\(result\)/);
 assert.doesNotMatch(page,/\$\('prompt'\)\.innerHTML/);
 assert.match(css,/\.gcc191-gray-blank/);
 assert.match(css,/background:linear-gradient/);
});
test('Level 5 needs 100 percent and confetti only on first completion',()=>{
 assert.deepEqual(PRACTICE_MISSION_STEPS.map(s=>s.accuracy),[80,90,90,95,100]);
 let state;
 for(const score of [80,90,90,95])state=advanceMission(state,score);
 state=advanceMission(state,99);assert.equal(state.completed,false);
 state=advanceMission(state,100);assert.equal(state.completed,true);
 assert.match(page,/if\(phraseDone&&!isMissionComplete\(prev\)\)/);
 assert.match(page,/showMissionClearConfetti\(\)/);
 assert.match(page,/stageDialog\.append\(overlay\)/);
 assert.match(css,/\.gcc191-luxury-confetti/);
});
test('Keeps existing Japanese text and word scoring',()=>{
 assert.match(page,/\$\('japanese'\)\.textContent=fillPracticePhrase\(item\.ja,state\.profile\)/);
 assert.match(page,/scorePracticePhrase\(item\.text,text,state\.profile\)/);
 assert.match(page,/practiceMissionV190\.js/);
 assert.match(page,/practiceMissionV191\.css/);
});
