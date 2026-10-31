import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceMission} from '../src/lib/practiceMissionV190.js';
import {missionDisplayScore,newlyUnlockedLevel} from '../src/lib/practiceMissionV193.js';
const page=readFileSync(new URL('../src/pages/public/PracticePageV170.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const css=readFileSync(new URL('../src/styles/practiceMissionV193.css',import.meta.url),'utf8');

test('Level 1 score 100% is not carried into Level 2 score display',()=>{
 let m=advanceMission(undefined,100);
 assert.equal(m.step,2);
 const view=missionDisplayScore({mission:m});
 assert.deepEqual(view,{step:2,score:0,best:0,threshold:90});
 assert.equal(m.bestByStep[0],100,'previous best remains saved');
 assert.equal(newlyUnlockedLevel(1,m,100),true);
});

test('Each new mission level begins at 0%, previous levels retained',()=>{
 let m;
 for(const [attempted,accuracy,next,target] of [[1,80,2,90],[2,90,3,90],[3,90,4,95],[4,95,5,100]]){
  m=advanceMission(m,accuracy);
  const view=missionDisplayScore({mission:m});
  assert.equal(view.step,next);
  assert.equal(view.score,0);
  assert.equal(view.best,0);
  assert.equal(view.threshold,target);
  assert.equal(newlyUnlockedLevel(attempted,m,accuracy),true);
 }
});

test('Fails and final completion do not trigger next-level transition',()=>{
 let m=advanceMission(undefined,79);
 assert.equal(newlyUnlockedLevel(1,m,79),false);
 for(const accuracy of [80,90,90,95,99])m=advanceMission(m,accuracy);
 assert.equal(m.step,5);
 assert.equal(newlyUnlockedLevel(5,m,99),false);
 m=advanceMission(m,100);
 assert.equal(m.completed,true);
 assert.equal(newlyUnlockedLevel(5,m,100),false);
 assert.equal(missionDisplayScore({mission:m}).score,100);
});

test('Replay uses its current level score while preserving the original completed score',()=>{
 let original;
 for(const accuracy of [80,90,90,95,100])original=advanceMission(original,accuracy);
 const replay=advanceMission(undefined,80);
 const originalView={mission:original,missionReplay:{...replay,active:true}};
 const view=missionDisplayScore({mission:originalView.missionReplay});
 assert.equal(view.step,2);
 assert.equal(view.score,0);
 assert.equal(originalView.mission.completed,true);
});

test('GCC page binds reset and level overlay only on actual advancement',()=>{
 assert.match(page,/practiceMissionV193\.css/);
 assert.match(page,/missionDisplayScore\(view\)/);
 assert.match(page,/newlyUnlockedLevel\(attemptedStep,progress,result\.accuracy\)/);
 assert.match(page,/paintScore\(0,nextLevelView\.best,nextLevelView\.threshold\)/);
 assert.match(page,/if\(nextLevelUnlocked\)\{/);
 assert.match(page,/showMissionLevelStart\(progress\.step\)/);
 assert.match(page,/gcc193-level-transition/);
 assert.match(page,/\$\('transcript'\)\.textContent='Your words will appear here…'/);
 assert.match(css,/@keyframes gcc193-transition-fade/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/backdrop-filter:blur\(2px\)/);
});

test('English target stays left-aligned, separate blocks and retry supported',()=>{
 assert.match(page,/gcc192-mask-block/);
 assert.match(page,/gcc192-mission-retry/);
 const cssV192=readFileSync(new URL('../src/styles/practiceMissionV192.css',import.meta.url),'utf8');
 assert.match(cssV192,/text-align:left!important/);
 assert.match(cssV192,/width:3\.65ch/);
 assert.match(page,/scorePracticePhrase\(item\.text,text,state\.profile\)/);
});
