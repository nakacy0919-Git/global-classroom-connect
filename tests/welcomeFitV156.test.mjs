import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/public/WelcomeV117.js');
const css=read('src/styles/welcomeFitV156.css');
const main=read('src/main.js');

test('homepage is exactly one visual viewport and never traps unrelated pages',()=>{
 assert.match(main,/import '\.\/styles\/welcomeFitV156\.css'/);
 assert.ok(main.indexOf('welcomeFitV156.css')>main.indexOf('mobileExperienceV152.css'));
 assert.match(css,/#app:has\(\.gcc117-welcome\)/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/overflow:hidden/);
 assert.match(css,/grid-template-rows:auto auto minmax\(0,1fr\) auto/);
 assert.match(css,/#app>\.public-page-content:has\(>\.gcc117-welcome\)/);
 assert.match(css,/@media\(max-height:420px\) and \(max-width:620px\)/);
 assert.match(css,/overflow-y:auto/);
});
test('desktop landing contains logo, full slogan, all three tappable artwork choices and footer',()=>{
 for(const x of ['gcc117-topbar','gcc117-intro','gcc117-choices','gcc117-bottom','gcc119-logo-image','gcc118-choice-image'])assert.ok(page.includes(x),x);
 for(const view of ['create','find','volunteer'])assert.ok(page.includes('#/teacher-portal?view='+view),view);
 assert.match(page,/One classroom/);
 assert.match(page,/A world of connections/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/max-height:min\(38vh,350px\)/);
 assert.match(css,/aspect-ratio:1 \/ 1/);
});
test('account actions have coherent sign-in/sign-up styles and keep accessible account menu',()=>{
 assert.ok(page.indexOf('class="gcc120-signin-top"')<page.indexOf('class="gcc120-signup-top"'));
 assert.match(page,/href="#\/teacher-access" class="gcc120-signin-top"/);
 assert.match(page,/href="#\/signup" class="gcc120-signup-top"/);
 assert.match(page,/class="gcc124-account-menu"/);
 assert.match(page,/aria-label="More account options"/);
 assert.match(page,/view=profile/);
 assert.match(css,/nav\.gcc124-actions/);
 assert.match(css,/\.gcc120-signin-top/);
 assert.match(css,/\.gcc120-signup-top/);
 assert.match(css,/\.gcc124-account-menu>summary/);
 assert.match(css,/backdrop-filter:blur\(14px\)/);
 assert.doesNotMatch(page,/New here\? Sign up and join our network/);
});
test('small phones get three horizontal menu cards with explicit readable labels',()=>{
 assert.equal((page.match(/class="gcc156-choice-label"/g)||[]).length,3);
 for(const x of ['Host a Session','Find a Session','Facilitator / GC Host'])assert.ok(page.includes('<strong>'+x+'</strong>'),x);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.gcc118-choice-image/);
 assert.match(css,/\.gcc156-choice-label\{/);
 assert.match(css,/font-size:clamp\(\.9rem,3\.8vw,1\.12rem\)/);
 assert.match(css,/@media\(max-height:680px\) and \(max-width:620px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('phone navigation retains obvious buttons and Account label',()=>{
 assert.match(css,/\.gcc124-menu-label\{display:inline!important\}/);
 assert.match(css,/\.gcc124-account-popup\{right:0/);
 assert.match(css,/border-radius:10px;font-size:\.77rem/);
});
