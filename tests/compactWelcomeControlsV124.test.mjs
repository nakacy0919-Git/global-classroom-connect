import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const welcome=read('src/pages/public/WelcomeV117.js');
const css=read('src/styles/welcomeControlsV124.css');
test('welcome retains three original illustrated actions and their routes',()=>{
 assert.equal((welcome.match(/class="gcc117-choice gcc117-choice-/g)||[]).length,3);
 for(const page of ['create','find','volunteer'])assert.match(welcome,new RegExp('href="#/teacher-portal\\?view='+page+'"'));
 assert.match(welcome,/gcc119-logo-image/);
});
test('topbar has two primary buttons and one accessible account menu',()=>{
 assert.match(welcome,/nav aria-label="Account and management" class="gcc124-actions"/);
 assert.match(welcome,/<details class="gcc124-account-menu">/);
 assert.match(welcome,/<summary aria-label="More account options"/);
 assert.match(welcome,/#\/signup/);assert.match(welcome,/#\/teacher-access/);
 assert.match(welcome,/My profile/);assert.match(welcome,/Host sign in/);
 assert.match(welcome,/#\/teacher-portal\?view=network/);assert.match(welcome,/#\/login/);
 const at=welcome.lastIndexOf("import '../../styles/welcomeControlsV124.css';");
 assert.ok(at>welcome.indexOf("import '../../styles/welcomeSignupV120.css';"),'CSS override must import last');
});
test('cards only sink on active press and never replay hover animation',()=>{
 assert.match(css,/gcc117-choice:active/);assert.match(css,/translateY\(3px\) scale\(\.98\)/);
 assert.match(css,/gcc117-choice:hover\{[\s\S]*?animation:none!important;transform:none!important/);
 assert.match(css,/\.gcc117-welcome \.gcc117-choice:nth-child\(3\)/);
 assert.match(css,/opacity:1!important/);
});
test('responsive and reduced motion controls remain available',()=>{
 assert.match(css,/@media\(max-width:485px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/gcc124-account-popup/);
});
