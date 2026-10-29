import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=file('src/pages/public/PracticePageV170.js');
const full=file('src/styles/practiceFullscreenV181.css');

test('Overview is entirely removed from Practice HTML and event handlers',()=>{
 for(const obsolete of ['gcc180-overview-screen','gcc180-view-overview','gcc180-overview-next',
   'gcc180-overview-back','gcc170-overview','gcc180-stage-breakdown','showOverview(',
   'overviewFromPractice','getPracticeTotals(']){
  assert.ok(!page.includes(obsolete),obsolete);
 }
 assert.match(page,/function showPractice\(\)/);
 assert.match(page,/profileSkip\.addEventListener\('click',[^\n]*showPractice\(\)/);
 assert.match(page,/if\(profileFromSetup\)showPractice\(\)/);
 assert.match(page,/STEP 1 \/ 3/);
 assert.match(page,/STEP 2 \/ 3/);
 assert.match(page,/id="gcc170-profile-open"/);
 assert.match(page,/id="gcc180-sound-toggle"/);
});
test('Practice shell and public page are constrained to one viewport without changing other GCC routes',()=>{
 assert.match(page,/practiceFullscreenV181\.css/);
 assert.match(full,/#app:has\(#gcc170\)/);
 assert.match(full,/#app>\.public-page-content:has\(#gcc170\)/);
 assert.match(full,/html:has\(#gcc170\),body:has\(#gcc170\)/);
 assert.match(full,/max-height:100dvh/);
 assert.match(full,/overflow:hidden/);
 assert.match(full,/\.gcc178-practice-content/);
 assert.match(full,/flex:1 1 0/);
});
test('desktop eight-stage list and all model phrases stay accessible within their separate panes',()=>{
 assert.match(full,/grid-template-columns:minmax\(228px,285px\) minmax\(0,1fr\)/);
 assert.match(full,/grid-template-rows:repeat\(8,minmax\(0,1fr\)\)/);
 assert.match(full,/\.gcc173-phrase-list\{/);
 assert.match(full,/overflow-y:auto;overscroll-behavior:contain/);
 assert.match(full,/\.gcc178-stage-image/);
 assert.match(full,/aspect-ratio:16\/9;object-fit:contain/);
 assert.match(full,/@media\(max-height:680px\) and \(min-width:741px\)/);
});
test('mobile uses horizontal stage list and independent phrase scrolling, without page scroll',()=>{
 assert.match(full,/@media\(max-width:740px\)/);
 assert.match(full,/grid-template-rows:76px minmax\(0,1fr\)/);
 assert.match(full,/flex-flow:row nowrap/);
 assert.match(full,/overflow-x:auto;overflow-y:hidden/);
 assert.match(full,/height:100dvh;min-height:0;overflow:hidden/);
});
test('learning history, model phrases, missions, audio and results are retained',()=>{
 for(const k of ["gcc-practice-v170-local","scorePracticePhrase(item.text,text,state.profile)",
   "gcc173-phrase-list","gcc174-mission-en","gcc174-mission-ja","gcc178-stage-image",
   "gcc178-accuracy-bar","gcc170-stage-dialog","gcc170-score-fill",
   "celebrate(result.accuracy)","gcc180-sound-toggle"]){
  assert.ok(page.includes(k),k);
 }
});
