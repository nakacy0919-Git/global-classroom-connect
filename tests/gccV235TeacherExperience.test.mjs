import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
const nav=read('src/pages/teacher/TeacherSidebar.js');
const css=read('src/styles/teacherExperienceV235.css');
test('one teacher-home management list, accurate initial loading, and direct management shortcut',()=>{
 assert.equal((portal.match(/id="gctp-mine"/g)||[]).length,1);
 assert.doesNotMatch(portal,/gctp-home-mine/);
 assert.match(portal,/id="gctp-manage-jump"/);
 assert.match(portal,/heading\.focus\(\{preventScroll:true\}\)/);
 assert.match(portal,/mine\.slice\(0,hostedVisible\)/);
 assert.match(portal,/hostedVisible\+=6;renderMine\(\)/);
 assert.match(portal,/id="gctp-home-sessions-count">—/);
 assert.match(portal,/id="gctp-home-requests-count">—/);
 assert.match(portal,/if\(!initialSnapshot\.warnings\.length\)inform\(''\)/);
});
test('only one keyword search field with existing filters and reset',()=>{
 assert.equal((portal.match(/id="gcs230-quicksearch"/g)||[]).length,1);
 assert.doesNotMatch(portal,/gctp-find-topic/);
 assert.match(portal,/query:\$\('gcs230-quicksearch'\)\.value/);
 assert.match(portal,/\['gctp-find-band','gctp-find-mode','gctp-find-type','gctp-find-age','gctp-find-sdg','gcs230-quicksearch'\]/);
 assert.match(portal,/gctp-find-compatible/);
 assert.match(portal,/gctp-search-summary'\)\.textContent='All upcoming sessions'/);
});
test('first-use guidance is optional and links to primary teacher actions remain visible',()=>{
 assert.match(portal,/<details class="gct-panel gcc226-first-start">/);
 assert.match(portal,/First time using GCC\? See the 3-step guide/);
 assert.match(portal,/Never include students’ private contact details/);
 for(const [route,label] of [['home','Teacher Home'],['create','Host a Session'],['find','Find a Session'],['requests','My Requests']]){
  assert.ok(nav.includes("['"+route+"','"+label+"']"));
 }
 assert.match(nav,/aria-current="page"/);
 assert.match(nav,/href="#\/welcome"/);
});
test('responsive styles keep search controls, dialogs and teacher actions within the viewport',()=>{
 assert.match(css,/@media\(max-width:1024px\)/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/max-height:calc\(100dvh - 24px\)/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.equal(JSON.parse(read('vercel.json')).git.deploymentEnabled,false);
});
