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
test('role, level, optional profile, overview, then practice is the selected flow',()=>{
 const ids=['gcc178-role-step','gcc178-level-step','gcc170-profile-dialog','gcc180-overview-screen','gcc180-overview-next','gcc178-practice-content','gcc180-view-overview'];
 for(const id of ids)assert.ok(page.includes('id="'+id+'"'),id);
 assert.match(page,/profileSkip\.addEventListener\('click',[^\n]*showOverview\(\)/);
 assert.match(page,/if\(profileFromSetup\)showOverview\(\)/);
 assert.match(page,/getElementById\('gcc180-overview-next'\)\.addEventListener\('click',[^\n]*showPractice\(\)/);
 assert.match(page,/function showOverview\(fromPractice=false\)/);
 assert.match(page,/function showPractice\(\)/);
 assert.doesNotMatch(page,/<header class="gcc170-top"[\s\S]*?<section class="gcc170-overview"/);
});
test('learning analytics report is populated with actual persisted scores by selected role and level',()=>{
 for(const id of ['gcc170-progress','gcc170-average','gcc170-completed','gcc180-total-attempts','gcc180-stage-breakdown','gcc180-progress-description'])assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/const scored=allScores\(\),completed=scored\.length/);
 assert.match(page,/scoreFor\(role,level,st\.id,index\)/);
 assert.match(page,/scoreFor\(role,level,st\.id,i\)\?\.attempts/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
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
 assert.match(page,/if\(result\.accuracy>=80\)celebrate\(result\.accuracy\);else tone\('retry'\)/);
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
