import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLevelTransitionController,SCORE_REVIEW_MS,LEVEL_START_MS} from '../src/lib/practiceMissionV194.js';
import {missionDisplayScore,newlyUnlockedLevel} from '../src/lib/practiceMissionV193.js';
import {advanceMission} from '../src/lib/practiceMissionV190.js';

function fakeClock(){
 const tasks=[];let now=0,id=0;
 const setTimer=(callback,delay)=>{const task={id:++id,at:now+delay,callback,canceled:false};tasks.push(task);return task.id;};
 const clearTimer=(key)=>{const task=tasks.find(t=>t.id===key);if(task)task.canceled=true;};
 const forward=target=>{
  while(true){
   const ready=tasks.filter(t=>!t.canceled&&t.at<=target).sort((a,b)=>a.at-b.at)[0];
   if(!ready)break;
   now=ready.at;ready.canceled=true;ready.callback();
  }
  now=target;
 };
 return {setTimer,clearTimer,forward};
}

test('score is visible for one second, banner next, new level at two seconds',()=>{
 const t=fakeClock(),events=[],controller=createLevelTransitionController(t);
 controller.schedule({onBanner:()=>events.push('banner'),onAdvance:()=>events.push('advance')});
 t.forward(999);assert.deepEqual(events,[]);
 t.forward(SCORE_REVIEW_MS);assert.deepEqual(events,['banner']);
 t.forward(1999);assert.deepEqual(events,['banner']);
 t.forward(LEVEL_START_MS);assert.deepEqual(events,['banner','advance']);
});

test('closing the popup or changing phrases cancels both pending callbacks',()=>{
 const t=fakeClock(),events=[],controller=createLevelTransitionController(t);
 controller.schedule({onBanner:()=>events.push('banner'),onAdvance:()=>events.push('advance')});
 t.forward(1000);controller.cancel();t.forward(3000);
 assert.deepEqual(events,['banner']);
 controller.schedule({onBanner:()=>events.push('another'),onAdvance:()=>events.push('done')});
 controller.cancel();t.forward(7000);assert.deepEqual(events,['banner']);
});

test('inactive dialog never receives a level-start update',()=>{
 const t=fakeClock(),events=[],controller=createLevelTransitionController(t);let active=true;
 controller.schedule({isActive:()=>active,onBanner:()=>events.push('banner'),onAdvance:()=>events.push('advance')});
 active=false;t.forward(3000);assert.deepEqual(events,[]);
});

test('Level 1 passing score saved, Level 2 is reset only when displayed',()=>{
 const progress=advanceMission(undefined,100);
 assert.equal(newlyUnlockedLevel(1,progress,100),true);
 assert.equal(progress.bestByStep[0],100);
 assert.deepEqual(missionDisplayScore({mission:progress}),{step:2,score:0,best:0,threshold:90});
});

test('GCC page preserves scored state until delayed transition, then resets display',()=>{
 const page=readFileSync(new URL('../src/pages/public/PracticePageV170.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 assert.match(page,/practiceMissionV194\.js/);
 assert.match(page,/createLevelTransitionController\(\)/);
 assert.match(page,/function stopRecognition\(\)\{cancelLevelTransition\(\)/);
 assert.match(page,/function paintItem\(\)\{cancelLevelTransition\(\)/);
 assert.match(page,/paintScore\(result\.accuracy,progress\.bestByStep\[attemptedStep-1\],threshold\)/);
 assert.match(page,/levelTransition\.schedule\(\{/);
 assert.match(page,/onBanner:\(\)=>\{tone\('next'\);showMissionLevelStart\(progress\.step\);\}/);
 assert.match(page,/onAdvance:\(\)=>\{/);
 assert.match(page,/renderMission\(item,saved\);/);
 assert.match(page,/paintScore\(0,nextLevelView\.best,nextLevelView\.threshold\)/);
 assert.match(page,/isActive:\(\)=>stageDialog\.open/);
 assert.match(page,/showMissionClearConfetti\(\)/);
});

test('1-second level card fade remains non-interactive and respects reduced motion',()=>{
 const css=readFileSync(new URL('../src/styles/practiceMissionV194.css',import.meta.url),'utf8');
 assert.match(css,/animation-duration:1s/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
