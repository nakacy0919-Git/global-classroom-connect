import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateUiText} from '../src/lib/i18nV157.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/public/PracticePageV170.js');
const academic=read('src/styles/practiceAcademicV179.css');

test('Practice header only has Back to Home (no Practice Mode label)',()=>{
 assert.match(page,/<header class="gcc170-top">[\s\S]*?href="#\/welcome" class="gcc179-back-home">← Back to Home<\/a>/);
 assert.doesNotMatch(page,/<strong>🎤 PRACTICE MODE<\/strong>/);
 assert.equal((page.match(/class="gcc179-back-home"/g)||[]).length,1);
 assert.match(page,/import '\.\.\/\.\.\/styles\/practiceAcademicV179\.css'/);
});

test('profile is visible beside Stage heading while report lives on a separate page',()=>{
 const report=page.indexOf('id="gcc180-overview-screen"');
 const overview=page.indexOf('class="gcc170-overview gcc180-report-overview"');
 const profile=page.indexOf('id="gcc170-profile-open"');
 const practice=page.indexOf('id="gcc178-practice-content"');
 const chooser=page.indexOf('id="gcc178-change"');
 assert.ok(report>=0&&overview>report&&practice>overview);
 assert.ok(profile>practice&&chooser>practice);
 assert.equal((page.match(/id="gcc178-change"/g)||[]).length,1);
 assert.equal((page.match(/id="gcc170-profile-open"/g)||[]).length,1);
 assert.match(page,/showOverview\(fromPractice=false\)/);
 assert.match(page,/showPractice\(\)/);
});
test('archived academic CSS remains available and separate report style overrides it',()=>{
 assert.match(academic,/background:#fff;/);
 assert.match(academic,/font-variant-numeric:tabular-nums/);
 const flow=read('src/styles/practiceFlowV180.css');
 assert.match(flow,/\.gcc180-overview-screen/);
 assert.match(flow,/\.gcc180-report-overview/);
 assert.match(flow,/\.gcc170-top\.gcc180-minimal-top/);
 assert.match(flow,/\.gcc180-practice-actions/);
});
test('new labels remain bilingual without changing user profile or saved scores',()=>{
 for(const [en,ja] of [
  ['← Back to Home','← ホームに戻る'],
  ['My Practice Overview','練習の記録'],
  ['⚙ My Profile','⚙ マイプロフィール'],
  ['← Change role / level','← 役割・レベルを選び直す']
 ])assert.equal(translateUiText(en,'ja'),ja);
 assert.match(page,/const KEY='gcc-practice-v170-local'/);
 assert.match(page,/scorePracticePhrase\(item\.text,text,state\.profile\)/);
 assert.match(page,/save\(\);paintScore/);
 assert.match(page,/stageArt\(role,stageIndex\)/);
});
