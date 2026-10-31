import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PRACTICE_MISSION_STEPS, missionStep, requiredAccuracy, isMissionComplete, maskMissionPhrase, advanceMission} from '../src/lib/practiceMissionV190.js';
const page=readFileSync(new URL('../src/pages/public/PracticePageV170.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/practiceMissionV190.css',import.meta.url),'utf8');
test('all five stages use increasing masking and exact pass thresholds',()=>{
 assert.deepEqual(PRACTICE_MISSION_STEPS.map(s=>s.accuracy),[80,90,90,95,100]);
 const source='Thank you for joining us from different parts of the world today.';
 const outputs=PRACTICE_MISSION_STEPS.map(s=>maskMissionPhrase(source,s.step));
 assert.equal(outputs[0],source);
 assert.equal(outputs[4].replace(/_____/g,'').replace(/[^\p{L}]/gu,''),'');
 for(let k=1;k<5;k++)assert.ok((outputs[k].match(/_____/g)||[]).length>(outputs[k-1].match(/_____/g)||[]).length);
 assert.equal(maskMissionPhrase(source,3),maskMissionPhrase(source,3));
});
test('gating requires current stage threshold; final stage needs 100%',()=>{
 let mission;
 mission=advanceMission(mission,79);assert.equal(mission.step,1);
 mission=advanceMission(mission,80);assert.equal(mission.step,2);
 mission=advanceMission(mission,89);assert.equal(mission.step,2);
 mission=advanceMission(mission,90);assert.equal(mission.step,3);
 mission=advanceMission(mission,90);assert.equal(mission.step,4);
 mission=advanceMission(mission,94);assert.equal(mission.step,4);
 mission=advanceMission(mission,95);assert.equal(mission.step,5);
 mission=advanceMission(mission,99);assert.equal(mission.step,5);assert.equal(mission.completed,false);
 mission=advanceMission(mission,100);assert.equal(mission.completed,true);
 assert.equal(missionStep({mission}),5);
 assert.equal(isMissionComplete({mission}),true);
 assert.equal(requiredAccuracy(5),100);
});
test('existing scores do not automatically count as a completed five-step mission',()=>{
 assert.equal(missionStep({best:100}),1);
 assert.equal(isMissionComplete({best:100}),false);
});
test('UI preserves full Japanese and source phrase for speech scoring and TTS',()=>{
 assert.match(page,/\$\('japanese'\)\.textContent=fillPracticePhrase\(item\.ja,state\.profile\)/);
 assert.match(page,/scorePracticePhrase\(item\.text,text,state\.profile\)/);
 assert.match(page,/new SpeechSynthesisUtterance\(fillPracticePhrase\(items\(\)\[itemIndex\]\.text,state\.profile\)\)/);
 assert.match(page,/practiceMissionV190\.css/);
 assert.match(page,/missionStep\(saved\)/);
 assert.match(page,/isMissionComplete\(scoreFor/);
 assert.match(css,/#gcc170-prompt/);
 assert.match(css,/text-align:left!important/);
});
