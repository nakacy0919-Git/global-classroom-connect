import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRACTICE_STAGES} from '../src/lib/practiceDataV169.js';
import {getPracticeItemsV174} from '../src/lib/practiceCurriculumV174.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=file('src/pages/public/PracticePageV170.js');
const css=file('src/styles/practicePopupV175.css');
const sidebarCss=file('src/styles/practiceSidebarV177.css');
const i18n=file('src/lib/i18nV157.js');
test('all eight stages remain in the left column while model phrases fill the right panel',()=>{
 assert.match(page,/<nav id="gcc170-stages"[^>]*class="gcc170-stages"/);
 assert.match(page,/<section id="gcc173-preview"[^>]*gcc177-phrase-panel/);
 assert.match(page,/id="gcc173-phrase-list"/);
 assert.doesNotMatch(page,/<dialog id="gcc173-preview"/);
 assert.doesNotMatch(page,/previewDialog\.showModal\(\)/);
 assert.match(page,/function selectStage\(i\)[\s\S]*?paintStages\(\);paintPreview\(\)/);
 assert.match(sidebarCss,/grid-template-columns:minmax\(250px,310px\) minmax\(0,1fr\)/);
 assert.match(sidebarCss,/grid-template-rows:repeat\(8,minmax\(54px,1fr\)\)/);
 assert.match(sidebarCss,/\.gcc177-phrase-panel \.gcc173-phrase-list/);
 assert.match(sidebarCss,/@media\(max-width:740px\)/);
});
test('selecting a model phrase opens only the speaking dialog and preserves the chosen stage on close',()=>{
 assert.match(page,/b\.addEventListener\('click',\(\)=>selectStage\(i\)\)/);
 assert.match(page,/button\.addEventListener\('click',\(\)=>openStage\(stageIndex,i\)\)/);
 assert.match(page,/function openStage\(i,index=0\)[\s\S]*?paintItem\(\);stageDialog\.showModal\(\)/);
 assert.match(page,/stageDialog\.addEventListener\('close',[\s\S]*?paintStages\(\);paintPreview\(\)/);
 assert.match(page,/stopRecognition\(\)/);
 assert.match(page,/const key=\(r,l,s,i\)/);
});
test('only one top-right language switch is rendered and shared GCC language drives Practice',()=>{
 assert.doesNotMatch(page,/data-ui-lang=/);
 assert.doesNotMatch(page,/gcc171-language/);
 assert.match(i18n,/gcc157-public-lang/);
 assert.match(i18n,/MODEL PHRASES \/ モデルフレーズ/);
 assert.match(i18n,/Choose a Stage \| ステージを選ぼう/);
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
