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

test('My Profile belongs to the white academic overview; role switch sits above Choose a Stage',()=>{
 const startOverview=page.indexOf('<section class="gcc170-overview"');
 const endOverview=page.indexOf('</section>',startOverview);
 const profile=page.indexOf('id="gcc170-profile-open"');
 assert.ok(startOverview>=0&&profile>startOverview&&profile<endOverview);
 const chooseStart=page.indexOf('<section class="gcc170-choose">');
 const change=page.indexOf('id="gcc178-change"');
 const title=page.indexOf('<h1>Choose a Stage');
 assert.ok(chooseStart>0&&change>chooseStart&&title>change);
 assert.equal((page.match(/id="gcc178-change"/g)||[]).length,1);
 assert.equal((page.match(/id="gcc170-profile-open"/g)||[]).length,1);
 assert.match(page,/overviewEl\.hidden=true/);
 assert.match(page,/overviewEl\.hidden=false/);
});

test('academic dashboard overrides old gradient and restores legible dark-on-white metrics',()=>{
 assert.match(academic,/\.gcc170-top \.gcc170-overview\{/);
 assert.match(academic,/background:#fff;/);
 assert.match(academic,/color:#223b52;/);
 assert.match(academic,/\.gcc179-overview-stats \.gcc170-stat strong/);
 assert.match(academic,/font-variant-numeric:tabular-nums/);
 assert.match(academic,/background:#e4ebf0;/);
 assert.match(academic,/background:#365f80;/);
 assert.match(academic,/@media\(max-width:740px\)/);
 assert.match(academic,/\.gcc179-change-role/);
 assert.match(academic,/\.gcc179-profile-access/);
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
