import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRACTICE_STAGES} from '../src/lib/practiceDataV169.js';
import {getPracticeItemsV173} from '../src/lib/practiceCurriculumV173.js';
import {PRACTICE_SCENES_V174,getPracticeItemsV174,getPracticeTotalsV174} from '../src/lib/practiceCurriculumV174.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/public/PracticePageV170.js');
test('320 bilingual tasks across 16 role-specific stages; 10 standard, 8 advanced and 2 challenges',()=>{
 for(const role of ['student','facilitator']){
  for(const stage of PRACTICE_STAGES[role]){
   assert.equal(getPracticeItemsV174(role,stage.id,'standard').length,10,role+':'+stage.id);
   assert.equal(getPracticeItemsV174(role,stage.id,'advanced').length,8,role+':'+stage.id);
   assert.equal(getPracticeItemsV174(role,stage.id,'challenge').length,2,role+':'+stage.id);
  }
  assert.equal(getPracticeTotalsV174(role,'standard'),80);
  assert.equal(getPracticeTotalsV174(role,'advanced'),64);
  assert.equal(getPracticeTotalsV174(role,'challenge'),16);
 }
});
test('existing tasks stay at the same indices with stable text and ids to preserve saved progress',()=>{
 for(const role of ['student','facilitator'])for(const stage of PRACTICE_STAGES[role]){
  for(const level of ['standard','advanced','challenge']){
   const before=getPracticeItemsV173(role,stage.id,level),after=getPracticeItemsV174(role,stage.id,level);
   assert.deepEqual(after.slice(0,before.length),before,role+':'+stage.id+':'+level);
  }
 }
});
test('every new item is a unique, speakable bilingual English model, with Japanese meaning and clear scenario',()=>{
 const all=[];
 for(const role of ['student','facilitator'])for(const stage of PRACTICE_STAGES[role]){
  const scene=PRACTICE_SCENES_V174[role][stage.id];
  for(const prop of ['ja','goal','goalJa','scenario','scenarioJa','mission','missionJa'])assert.ok(scene[prop]?.length>6,role+':'+stage.id+':'+prop);
  for(const level of ['standard','advanced','challenge']){
   const items=getPracticeItemsV174(role,stage.id,level);
   const oldCount=getPracticeItemsV173(role,stage.id,level).length;
   const stageTexts=new Set();
   for(const item of items){
    assert.ok(!stageTexts.has(item.text),role+':'+stage.id+':duplicate '+item.text);
    stageTexts.add(item.text);
    assert.match(item.text,/[a-z]/i);
    assert.match(item.ja,/[ぁ-んァ-ン一-龥]/u);
    assert.ok(!/[<>]/.test(item.text+item.ja));
    for(const field of item.text.match(/\{([^}]+)\}/g)||[])assert.ok(['{name}','{school}','{hobby}','{hometown}','{schoolDescription}'].includes(field),field);
   }
   for(const item of items.slice(oldCount)){
    assert.ok(item.cue?.length>5&&item.cueJa?.length>3,role+':'+stage.id+':'+level);
    assert.ok(item.text.split(/\s+/).length>=5,role+':'+stage.id+':'+level);
    if(level==='challenge'){
     assert.ok(item.text.split(/\s+/).length>=16);
     assert.ok(item.context&&item.contextJa);
    }
    all.push(item);
   }
  }
 }
 assert.equal(all.length,144);
});
test('the UI displays scenario missions and contextual cues while preserving the scoring dialog',()=>{
 assert.match(page,/getPracticeItemsV174 as getPracticeItems/);
 assert.match(page,/id="gcc174-mission-en"/);
 assert.match(page,/id="gcc174-mission-ja"/);
 assert.match(page,/item\.cue/);
 assert.match(page,/id="gcc174-dialog-cue"/);
 assert.match(page,/id="gcc170-start"/);
 assert.match(page,/scorePracticePhrase/);
 assert.match(page,/getPracticeItemsV171/);
 assert.match(read('src/styles/practiceSituationsV174.css'),/gcc174-dialog-cue/);
});
