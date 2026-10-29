import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRACTICE_STAGES} from '../src/lib/practiceDataV169.js';
import {getPracticeItemsV174} from '../src/lib/practiceCurriculumV174.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=file('src/pages/public/PracticePageV170.js');
const css=file('src/styles/practicePopupV175.css');
test('phrase library is a native modal dialog with close and Esc support',()=>{
 assert.match(page,/<dialog id="gcc173-preview"[^>]*gcc173-preview-dialog/);
 assert.match(page,/function selectStage\(i\)[\s\S]*?previewDialog\.showModal\(\)/);
 assert.match(page,/function closePreview\(\)[^\n]*previewDialog\.close\(\)/);
 assert.match(page,/previewDialog\.addEventListener\('cancel'/);
 assert.match(page,/previewDialog\.addEventListener\('click'/);
 assert.doesNotMatch(page,/explorer\.classList\.add\('gcc173-expanded'\)/);
 assert.match(css,/dialog\.gcc173-preview-dialog\[open\]/);
 assert.match(css,/dialog\.gcc173-preview-dialog:not\(\[open\]\)/);
 assert.match(css,/::backdrop/);
});
test('speaking opens from a selected phrase and returns to that list on close',()=>{
 assert.match(page,/button\.addEventListener\('click',\(\)=>openStage\(stageIndex,i\)\)/);
 assert.match(page,/function openStage\(i,index=0\)[\s\S]*?previewDialog\.close\(\)[\s\S]*?stageDialog\.showModal\(\)/);
 assert.match(page,/stageDialog\.addEventListener\('close',[\s\S]*?paintPreview\(\);previewDialog\.showModal\(\)/);
 assert.match(page,/stopRecognition\(\)/);
 assert.match(page,/const key=\(r,l,s,i\)/);
});
test('read-aloud sentence is visually prominent and clearly contrasted',()=>{
 assert.match(page,/READ THIS ALOUD/);
 assert.match(page,/ここを声に出して読もう/);
 assert.match(page,/id="gcc170-prompt"/);
 assert.match(page,/id="gcc170-japanese"/);
 assert.match(css,/#gcc170-stage-dialog #gcc170-prompt/);
 assert.match(css,/font-size:clamp\(1\.65rem,3vw,2\.38rem\)/);
 assert.match(css,/border:3px solid #3c8bdd/);
 assert.match(css,/color:#183e76/);
 assert.match(page,/id="gcc170-listen"/);
});
test('all sixteen role-specific stages remain accessible in each mode',()=>{
 for(const role of ['student','facilitator'])for(const stage of PRACTICE_STAGES[role]){
  assert.equal(getPracticeItemsV174(role,stage.id,'standard').length,10);
  assert.equal(getPracticeItemsV174(role,stage.id,'advanced').length,8);
  assert.equal(getPracticeItemsV174(role,stage.id,'challenge').length,2);
 }
});
