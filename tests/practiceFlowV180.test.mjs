import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRACTICE_STAGES} from '../src/lib/practiceDataV169.js';
import {getPracticeItemsV174} from '../src/lib/practiceCurriculumV174.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=file('src/pages/public/PracticePageV170.js');
const css=file('src/styles/practiceFlowV180.css');
test('Profile Back and Skip reside in a separate footer, preserving input fields and reset',()=>{
 assert.match(page,/<\/div><footer class="gcc180-profile-footer">/);
 assert.match(page,/class="gcc178-profile-actions"/);
 for(const id of ['gcc178-profile-back','gcc178-profile-skip','gcc171-profile-save','gcc170-reset'])assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(css,/\.gcc170-profile-fields\{/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/\.gcc180-profile-footer/);
});
test('role, level and optional profile lead directly to Practice, with no Overview page',()=>{
 for(const id of ['gcc178-role-step','gcc178-level-step','gcc170-profile-dialog','gcc178-practice-content'])
  assert.ok(page.includes('id="'+id+'"'),id);
 assert.match(page,/profileSkip\.addEventListener\('click',\(\)=>\{tone\('next'\);profileDialog\.close\(\);showPractice\(\);\}\)/);
 assert.match(page,/if\(profileFromSetup\)showPractice\(\)/);
 assert.match(page,/function showPractice\(\)/);
 for(const oldId of ['gcc180-overview-screen','gcc180-overview-next','gcc180-view-overview','gcc170-progress','gcc180-stage-breakdown'])
  assert.ok(!page.includes(oldId),oldId);
});
test('illustration and mission do not overlap and language/more controls preserve both texts',()=>{
 assert.match(page,/data-mission-lang="en"/);
 assert.match(page,/data-mission-lang="ja"/);
 assert.match(page,/id="gcc180-mission-more"/);
 assert.match(page,/missionEn\.hidden=missionLanguage!=='en'/);
 assert.match(page,/missionJa\.hidden=missionLanguage!=='ja'/);
 assert.match(page,/missionMore\.setAttribute\('aria-expanded',String\(missionExpanded\)\)/);
 assert.match(css,/grid-template-columns:42px minmax\(0,1fr\) minmax\(210px,310px\)/);
 assert.match(css,/aspect-ratio:16\/9;object-fit:contain/);
 assert.match(css,/-webkit-line-clamp:2/);
 assert.match(css,/\.gcc180-mission-expanded/);
});
test('practice sound can be muted, browser audio problems cannot block work, 80/90/100 effects differ',()=>{
 assert.match(page,/id="gcc180-sound-toggle"/);
 assert.match(page,/localStorage\.getItem\('gcc-practice-sounds'\)/);
 assert.match(page,/localStorage\.setItem\('gcc-practice-sounds'/);
 assert.match(page,/const Audio=window\.AudioContext\|\|window\.webkitAudioContext/);
 assert.match(page,/catch\{\/\* Sound is an enhancement/);
 assert.match(page,/accuracy===100\?130:accuracy>=90\?70:28/);
 assert.match(page,/accuracy===100\?'100':accuracy>=90\?'90':'80'/);
 assert.match(page,/window\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
 assert.match(page,/threshold=requiredAccuracy\(attemptedStep\)/);
 assert.match(page,/result\.accuracy>=threshold/);
 assert.match(page,/else celebrate\(result\.accuracy\)/);
 assert.match(page,/else tone\('retry'\)/);
 assert.match(page,/attempts:\(prev\?\.attempts\|\|0\)\+1/);
});
test('curriculum unchanged for both roles',()=>{
 for(const r of ['student','facilitator']){
  assert.equal(PRACTICE_STAGES[r].length,8);
  for(const stage of PRACTICE_STAGES[r]){
   for(const [level,count] of [['standard',10],['advanced',8],['challenge',2]]){
    assert.equal(getPracticeItemsV174(r,stage.id,level).length,count);
   }
  }
 }
});
