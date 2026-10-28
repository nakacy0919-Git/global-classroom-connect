import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JA_UI,LOCALES,getGccLanguage,safeLocale,translateUiText} from '../src/lib/i18nV157.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('src/app.js');
const main=read('src/main.js');
const welcome=read('src/pages/public/WelcomeV117.js');
const header=read('src/components/Header.js');
const module=read('src/lib/i18nV157.js');
const css=read('src/styles/i18nV157.css');

test('language dictionary covers key GCC flows and uses English for unknown locales',()=>{
 assert.deepEqual([...LOCALES],['en','ja']);
 assert.equal(safeLocale('ja'),'ja');assert.equal(safeLocale('en'),'en');assert.equal(safeLocale('fr'),'en');
 assert.equal(getGccLanguage(),'en');
 assert.ok(Object.keys(JA_UI).length>=450);
 for(const en of [
  'Sign in','Sign up','Account','Create Session','Find Session','Continue →',
  'Publish session ✓','My Teacher Profile','Save my profile ✓','Join the Global Team ✓',
  'Explore world map','Find by time','Session access code','Verify code →',
  'I have read and understood','Submit registration ✓','Join a Session',
  'Teacher name *','Student names *','Close session','Teacher Invitations'
 ])assert.ok(typeof JA_UI[en]==='string'&&JA_UI[en]!==en,en);
});
test('localize fixed labels but never change user-entered data, identifiers or form values',()=>{
 assert.equal(translateUiText('Sign in','ja'),'ログイン');
 assert.equal(translateUiText(' Sign in  ','ja'),' ログイン  ');
 assert.equal(translateUiText('Sign in','en'),'Sign in');
 assert.equal(translateUiText('My Teacher Profile','ja'),'先生のプロフィール');
 for(const v of ['Tiffany Pan','Anjo Gakuen High School','2026-10-28','Asia/Tokyo','955070','abc123','https://example.org','Name: Sakura','13:10']){
  assert.equal(translateUiText(v,'ja'),v);
 }
 assert.equal(translateUiText('Room 09','ja'),'ルーム 09');
 assert.equal(translateUiText('18 rooms · 134 students','ja'),'18室 · 134人の生徒');
 assert.equal(translateUiText('4 sessions','ja'),'4件のセッション');
 assert.equal(translateUiText('7 students','ja'),'7人の生徒');
});
test('language buttons now actually translate after every SPA route render',()=>{
 assert.match(app,/import \{bindGccLanguage\} from '\.\/lib\/i18nV157\.js'/);
 assert.match(app,/bindGccLanguage\(app,isPublicRoute\)/);
 assert.match(app,/bindGccLanguage\(app,isPublicRoute\)[\s\S]*bindMobileNavigationV152\(\)/);
 assert.doesNotMatch(app,/langLabel\.textContent\s*=\s*lang === 'ja'/);
 assert.match(welcome,/data-lang="en"/);assert.match(welcome,/data-lang="ja"/);
 assert.match(header,/data-lang="en"/);assert.match(header,/data-lang="ja"/);
 assert.match(module,/localStorage\.setItem\(STORAGE_KEY,locale\)/);
 assert.match(module,/document\.documentElement\.lang=locale/);
 assert.match(module,/aria-pressed/);
 assert.match(module,/MutationObserver/);
});
test('language toggles preserve original English text and ARIA attributes on every switch',()=>{
 assert.match(module,/const originals=new WeakMap/);
 assert.match(module,/const attrOriginals=new WeakMap/);
 assert.match(module,/current===last\.last\?last\.source:current/);
 assert.match(module,/current===last\.last/);
 assert.match(module,/el\.setAttribute\(attr,target\)/);
 assert.match(module,/skipTags=new Set/);
 assert.match(module,/\\.gcc-v104-identity/);
 assert.match(module,/\\[contenteditable\\]/);
 assert.doesNotMatch(module,/input\.value\s*=/);
 assert.doesNotMatch(module,/window\.location\.reload/);
 assert.doesNotMatch(module,/innerHTML\s*=\s*translateUiText/);
});
test('public pages get a visible switcher and landing top nav retains login links',()=>{
 assert.match(module,/isPublic&&!root\.querySelector\('\.gcc117-welcome'\)/);
 assert.match(module,/gcc157-public-lang/);
 assert.match(welcome,/href="#\/signup"/);
 assert.match(welcome,/href="#\/teacher-access"/);
 assert.match(main,/import '\.\/styles\/i18nV157\.css'/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/gcc157-home-lang/);
 assert.match(css,/gcc157-public-lang/);
 assert.match(css,/html\[lang="ja"\]/);
});
