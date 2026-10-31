import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {maskMissionPhrase,advanceMission,isMissionComplete} from '../src/lib/practiceMissionV190.js';
const page=readFileSync(new URL('../src/pages/public/PracticePageV170.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const css=readFileSync(new URL('../src/styles/practiceMissionV192.css',import.meta.url),'utf8');

test('GCC V19.2 blanks are separate equal-width sharp blocks and target is large and left-aligned',()=>{
 assert.match(page,/practiceMissionV192\.css/);
 assert.match(css,/gcc192-mask-block/);
 assert.match(css,/border-radius:1px/);
 assert.match(css,/width:3\.65ch/);
 assert.match(css,/text-align:left!important/);
 assert.match(css,/font-size:clamp\(1\.55rem,3\.15vw,2\.35rem\)!important/);
 assert.doesNotMatch(css,/gcc192-mask-whole/);
 assert.doesNotMatch(css,/--blank-ch|--word-length/);
});

test('actual renderer leaves one separate uniform box per hidden word, including level 5',()=>{
 const match=page.match(/ function renderMissionBlanks\(model,n\)\{[\s\S]*?\n \}\n function showMissionClearConfetti\(\)\{/);
 assert.ok(match,'render helper exists');
 const fnSrc=match[0].slice(0,-'\n function showMissionClearConfetti(){'.length);
 let nodes=[];
 const prompt={replaceChildren:(frag)=>{nodes=[...frag.children];},setAttribute:()=>{}};
 const document={
  createDocumentFragment:()=>({children:[],append(x){this.children.push(x);}}),
  createElement:tag=>({tag,className:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;}}),
  createTextNode:text=>({text}),
 };
 const $=()=>prompt;
 const renderer=Function('maskMissionPhrase','document','$',fnSrc+';return renderMissionBlanks;')(maskMissionPhrase,document,$);
 const source='Hello! Can you hear my voice clearly today from Japan?';
 for(const step of [1,2,3,4,5]){
  renderer(source,step);
  const boxes=nodes.filter(x=>x.className==='gcc192-mask-block');
  const hiddenWords=(maskMissionPhrase(source,step).match(/_____/g)||[]).length;
  assert.equal(boxes.length,hiddenWords,`step ${step}: one box per hidden word`);
  assert.ok(nodes.every(x=>!x.text?.includes('_____')));
  if(step===5){
   assert.ok(boxes.length>5,'multiple word boxes at L5');
   assert.equal(nodes.filter(x=>x.text).map(x=>x.text).join('').replace(/[^a-zA-Z]/g,''),'','No source words revealed');
   assert.ok(nodes.some(x=>x.text?.includes('!')),'punctuation preserved');
  }
 }
});

test('replay preserves previous 5/5 completion while advancing fresh mission separately',()=>{
 assert.match(page,/missionViewScore\(saved\)/);
 assert.match(page,/missionReplay:active\?null/);
 assert.match(page,/mission:replaying\?prev\.mission:progress/);
 assert.match(page,/missionReplay:replaying\?\{\.\.\.progress,active:!progress\.completed\}/);
 assert.match(page,/if\(phraseDone&&replaying\)/);
 assert.match(page,/gcc192-mission-retry/);
 let finished;
 for (const n of [80,90,90,95,100]) finished=advanceMission(finished,n);
 assert.equal(finished.completed,true);
 let replay;
 for(const n of [80,90,90,95,99]) replay=advanceMission(replay,n);
 assert.equal(replay.completed,false);
 assert.equal(isMissionComplete({mission:finished}),true,'original completed record remains clear');
 replay=advanceMission(replay,100);
 assert.equal(replay.completed,true,'replay can reach a fresh clear');
});

test('original speech recognition, Japanese rendering and TTS remain in place',()=>{
 assert.match(page,/scorePracticePhrase\(item\.text,text,state\.profile\)/);
 assert.match(page,/\$\('japanese'\)\.textContent=fillPracticePhrase\(item\.ja,state\.profile\)/);
 assert.match(page,/new SpeechSynthesisUtterance\(fillPracticePhrase\(items\(\)\[itemIndex\]\.text,state\.profile\)\)/);
 assert.match(page,/showMissionClearConfetti\(\)/);
});

test('replay button behavior starts at L1 without erasing earlier completion and can return',()=>{
 const match=page.match(/ function missionViewScore\(saved\)\{[\s\S]*?\n \}\n function toggleMissionReplay\(\)\{[\s\S]*?\n \}\n function renderMission\(item,saved\)\{/);
 assert.ok(match,'replay functions found');
 const src=match[0].slice(0,-'\n function renderMission(item,saved){'.length);
 let old;
 for(const a of [80,90,90,95,100])old=advanceMission(old,a);
 const keyName='student|standard|audio|0';
 const state={scores:{[keyName]:{mission:old,template:'Hello!'}}};
 const role='student',level='standard',itemIndex=0;
 const stage=()=>({id:'audio'});
 const key=()=>keyName;
 const scoreFor=()=>state.scores[keyName];
 let saves=0,paints=0;
 const save=()=>saves++;
 const paintItem=()=>paints++;
 const paintStages=()=>{};
 const paintPreview=()=>{};
 const stopRecognition=()=>{};
 const status={textContent:''};
 const $=()=>status;
 const {toggleMissionReplay,missionViewScore}=Function('scoreFor','role','level','itemIndex','stage','key','state','save','paintItem','paintStages','paintPreview','stopRecognition','$','isMissionComplete',src+';return {toggleMissionReplay,missionViewScore};')(scoreFor,role,level,itemIndex,stage,key,state,save,paintItem,paintStages,paintPreview,stopRecognition,$,isMissionComplete);
 toggleMissionReplay();
 assert.equal(saves,1);
 assert.equal(paints,1);
 assert.equal(state.scores[keyName].mission.completed,true);
 assert.equal(state.scores[keyName].missionReplay.active,true);
 assert.equal(missionViewScore(state.scores[keyName]).mission.step,1);
 toggleMissionReplay();
 assert.equal(saves,2);
 assert.equal(state.scores[keyName].mission.completed,true);
 assert.equal(state.scores[keyName].missionReplay,null);
 assert.match(status.textContent,/クリア記録/);
});
