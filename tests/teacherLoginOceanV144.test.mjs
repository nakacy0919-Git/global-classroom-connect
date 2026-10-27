import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/teacher/TeacherAccessPage.js');
const css=read('src/styles/teacherLoginOceanV144.css');
const host=read('src/styles/hostLoginV143.css');
const password=read('src/pages/teacher/TeacherPasswordPageV136.js');
test('teacher sign in uses the same bundled ocean backdrop as host sign in',()=>{
 assert.match(page,/teacherLoginOceanV144\.css/);
 assert.match(css,/url\('\.\.\/assets\/landing-v118\/ocean-islands\.webp'\)/);
 assert.match(host,/ocean-islands\.webp/);
 assert.doesNotMatch(css,/@import|https:\/\//);
});
test('teacher access and account recovery features retain their IDs and destinations',()=>{
 for(const id of ['gcta-login','gcta-email','gcta-password','gcta-message','gcta-claim','gcta-token'])
   assert.match(page,new RegExp('id="'+id+'"'));
 for(const route of ['welcome','signup','teacher-password','login'])
   assert.match(page,new RegExp('href="#/'+route+'"'));
 assert.match(page,/teacherSignIn\(/);
 assert.match(page,/claimTeacherInvite\(/);
 assert.match(page,/teacherIdentity\(/);
 assert.match(page,/beginApplicationV120\(/);
 assert.match(password,/gcc136-request/);
 assert.match(password,/gcc136-change/);
});
test('ocean scene has a compact submit action, readable glass panel and mobile layout',()=>{
 assert.match(page,/aria-labelledby="gcc144-teacher-heading"/);
 assert.match(page,/aria-live="polite"/);
 assert.match(css,/grid-template-columns: minmax\(0, 1fr\) minmax\(350px, 490px\)/);
 assert.match(css,/backdrop-filter: blur\(18px\)/);
 assert.match(css,/\.gcc144-page \.gcc144-actions \.gcc120-primary/);
 assert.match(css,/width: auto/);
 assert.match(css,/@media \(max-width: 920px\)/);
 assert.match(css,/@media \(max-width: 540px\)/);
 assert.match(css,/prefers-reduced-motion: reduce/);
});
test('new login rules do not restyle recovery page or host page',()=>{
 assert.doesNotMatch(password,/gcc144-page/);
 assert.doesNotMatch(css,/(^|\n)body\s*\{/);
 assert.doesNotMatch(css,/(^|\n)\.gcc126-page\s*\{/);
});
