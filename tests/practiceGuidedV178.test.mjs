import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {PRACTICE_STAGES} from '../src/lib/practiceDataV169.js';
import {getPracticeItemsV174} from '../src/lib/practiceCurriculumV174.js';
const source=readFileSync(new URL('../src/pages/public/PracticePageV170.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/practiceGuidedV178.css',import.meta.url),'utf8');

test('guided setup presents role, then difficulty, then optional profile with back/skip',()=>{
 for(const id of ['gcc178-setup','gcc178-role-step','gcc178-level-step','gcc178-role-back','gcc178-profile-back','gcc178-profile-skip','gcc178-change','gcc178-practice-content'])assert.ok(source.includes('id="'+id+'"'),id);
 assert.match(source,/showSetup\('role'\)/);
 assert.match(source,/showSetup\('level'\)/);
 assert.match(source,/showProfile\(true\)/);
 assert.match(source,/profileSkip\.addEventListener\('click',[^\n]*showPractice\(\)/);
 assert.match(source,/profileBack\.addEventListener\('click',[^\n]*showSetup\('level'\)/);
 assert.match(source,/changeButton\.addEventListener\('click',[^\n]*showSetup\('role'\)/);
 assert.doesNotMatch(source,/class="gcc170-controls"/);
 assert.doesNotMatch(source,/class="gcc173-intro"/);
});
test('all eight optimized Zoom stage illustrations exist and are served as static assets',()=>{
 for(let i=1;i<=8;i++){
  const name='stage-'+String(i).padStart(2,'0')+'.webp';
  const bytes=readFileSync(new URL('../public/practice-stages/'+name,import.meta.url));
  assert.ok(bytes.length>5000&&bytes.length<300000,name);
  assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
 }
 assert.match(source,/stageArt=\(role,index\)/);
 assert.match(source,/id="gcc178-stage-image"/);
 assert.match(source,/id="gcc178-dialog-image"/);
 assert.match(source,/art\.src=stageArt\(role,stageIndex\)/);
});
test('each phrase retains its score, shows attempts and a horizontal grey remainder',()=>{
 assert.match(source,/score\?\.attempts\|\|0/);
 assert.match(source,/gcc178-accuracy-bar/);
 assert.match(source,/gcc178-accuracy-fill/);
 assert.match(source,/fill\.style\.width=value\+'%'/);
 assert.match(css,/background:#d6dbe3/);
 assert.match(css,/grid-template-columns:42px minmax\(180px,255px\) minmax\(200px,290px\)/);
 assert.match(css,/\.gcc170-overview/);
 assert.match(source,/const key=\(r,l,s,i\)/);
 assert.match(source,/localStorage\.setItem\(KEY/);
});
test('practice content and saved scores remain unchanged for all levels and roles',()=>{
 for(const role of ['student','facilitator']){
  assert.equal(PRACTICE_STAGES[role].length,8);
  for(const stage of PRACTICE_STAGES[role]){
   assert.equal(getPracticeItemsV174(role,stage.id,'standard').length,10);
   assert.equal(getPracticeItemsV174(role,stage.id,'advanced').length,8);
   assert.equal(getPracticeItemsV174(role,stage.id,'challenge').length,2);
  }
 }
 assert.match(source,/scorePracticePhrase\(item\.text,text,state\.profile\)/);
 assert.match(source,/attempts:\(prev\?\.attempts\|\|0\)\+1/);
});

test('role choices use transparent illustrations and preserve existing button semantics',()=>{
  const roleRow=source.match(/<div class="gcc178-choice-row gcc185-role-row"[\s\S]*?<\/div>/)?.[0]||'';
  assert.match(roleRow,/data-role="student"/);
  assert.match(roleRow,/data-role="facilitator"/);
  assert.match(roleRow,/gcc185-role-art/);
  assert.match(roleRow,/practice-role-student\.webp/);
  assert.match(roleRow,/practice-role-facilitator\.webp/);
  assert.match(roleRow,/aria-hidden="true"/);
  assert.match(source,/practiceRoleArtworkV185\.css/);
});
test('illustrations are 2x-resolution or better and preserve transparent WebP assets',()=>{
 const student=readFileSync(new URL('../public/assets/practice-role-student.webp',import.meta.url));
 const facilitator=readFileSync(new URL('../public/assets/practice-role-facilitator.webp',import.meta.url));
 for(const [name,bytes] of [['Student',student],['Facilitator',facilitator]]){
  assert.ok(bytes.length>25000&&bytes.length<180000,name+' optimized high-resolution WebP');
  assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',name);
 }
 assert.ok(source.includes('practice-role-student.webp" alt="" width="520" height="387"'));
 assert.ok(source.includes('practice-role-facilitator.webp" alt="" width="520" height="410"'));
});

test('illustrated role CSS spills outside buttons but never changes level chooser',()=>{
  const cssV185=readFileSync(new URL('../src/styles/practiceRoleArtworkV185.css',import.meta.url),'utf8');
  assert.match(cssV185,/#gcc178-role-step/);
  assert.match(cssV185,/overflow:visible/);
  assert.match(cssV185,/bottom:-5px/);
  assert.match(cssV185,/position:absolute/);
  assert.match(cssV185,/@media\(max-width:740px\)/);
  assert.match(cssV185,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(cssV185,/gcc178-level-row/);
});
