import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const page=read('src/pages/public/PracticePageV170.js').toString();
const css=read('src/styles/practiceHostLevelArtworkV188.css').toString();

test('Host and Student use distinct level artwork while preserving level selections',()=>{
 for(const level of ['standard','advanced','challenge']){
  assert.ok(page.includes('data-level="'+level+'"'));
  assert.ok(page.includes('data-host-src="/assets/practice-host-'+level+'-hq.webp"'));
  assert.ok(page.includes('data-student-src="/assets/practice-student-'+level+'-hq.webp"'));
  const bytes=read('public/assets/practice-host-'+level+'-hq.webp');
  assert.ok(bytes.byteLength>30000&&bytes.byteLength<220000);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 assert.match(page,/role==='facilitator'/);
 assert.match(page,/step\.classList\.toggle\('gcc188-host-level-mode',host\)/);
 assert.match(page,/step\.classList\.toggle\('gcc189-student-level-mode',!host\)/);
 assert.match(page,/syncRoleLevelArtwork\(\);updateStageCount\(\)/);
 assert.match(page,/switchLevel\(b\.dataset\.level\)/);
 assert.match(page,/showProfile\(true\)/);
});
test('Host levels have pop-out art and accessible labels without visual duplication',()=>{
 assert.match(page,/practiceHostLevelArtworkV188\.css/);
 assert.match(css,/gcc188-host-level-mode/);
 assert.match(css,/gcc189-student-level-mode/);
 assert.match(css,/bottom:-14px/);
 assert.match(css,/clip-path:inset\(50%\)/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/#gcc178-role-step/);
});
