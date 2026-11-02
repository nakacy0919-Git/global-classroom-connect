import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {errorFieldV204,firstInvalidV204} from '../src/lib/sessionFieldGuideV204.js';
import {EXTRA_LANGUAGE_OPTIONS_V204,SESSION_TRANSLATIONS_V204,JA_SESSION_UI_V204} from '../src/lib/sessionTranslationsV204.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('error messages identify correct wizard fields',()=>{
 const targets=new Map(['gctp-name','gctp-date','gctp-flow','gctp-deadline','gctp-description','gctp-minage','gcc-v8-deadline','gcc-v8-flow'].map(k=>['#'+k,{id:k}]));
 targets.set('[name="title"]',{id:'host-title'});
 const root={querySelector:s=>targets.get(s)||null};
 assert.equal(errorFieldV204('Please enter a session name',root,'gctp').id,'gctp-name');
 assert.equal(errorFieldV204('The first flow activity must start on time',root,'gctp').id,'gctp-flow');
 assert.equal(errorFieldV204('Choose a registration deadline',root,'gctp').id,'gctp-deadline');
 assert.equal(errorFieldV204('Your objectives need more detail',root,'gctp').id,'gctp-description');
 assert.equal(errorFieldV204('Session title is required',root,'gcc-v8').id,'host-title');
});
test('first missing required field is selected in order, not random fields',()=>{
 const fields=[
  {required:true,disabled:false,type:'text',closest:()=>null,checkValidity:()=>true},
  {required:false,disabled:false,type:'file',closest:()=>null,checkValidity:()=>false},
  {required:true,disabled:false,type:'text',closest:()=>null,checkValidity:()=>false,id:'deadline'}
 ];
 assert.equal(firstInvalidV204({querySelectorAll:()=>fields}).id,'deadline');
});
test('teacher and host create session both use scroll, red outline, focus and clear-on-edit',()=>{
 const guide=read('src/lib/sessionFieldGuideV204.js'),teacher=read('src/pages/teacher/TeacherPortalPage.js');
 const host=read('src/pages/host/SimpleSessionsPage.js'),css=read('src/styles/sessionUxV204.css');
 for(const s of ['scrollIntoView','aria-invalid','gcc204-inline-error','focus({preventScroll:true})','form.addEventListener']){
  assert.ok(guide.includes(s),s);
 }
 for(const s of ["guide.show(error,formStep)","guide.show(err.message,2)","createFieldGuideV204"]){
  assert.ok(teacher.includes(s),s);
 }
 assert.match(host,/createGuide\.show/);assert.match(host,/createGuide\.clear/);
 assert.match(css,/\.gcc204-invalid/);assert.match(css,/@media\(max-width:900px\)/);
});
test('create session has no redundant right-side upcoming panel but keeps session management',()=>{
 const portal=read('src/pages/teacher/TeacherPortalPage.js');
 const sidebar=read('src/pages/teacher/TeacherSidebar.js');
 assert.doesNotMatch(portal,/<\/form><aside class="gct-panel">/);
 assert.match(portal,/Manage my hosted sessions/);
 assert.match(portal,/id="gctp-mine"/);
 assert.match(sidebar,/GCC Home/);assert.match(sidebar,/My Requests/);
 assert.doesNotMatch(sidebar,/const primary=[^;]*(?:Teacher Home|Find a Session|Host a Session)/);
});
test('extended language switcher translates session labels but preserves entered values and can restore English',()=>{
 const i18n=read('src/lib/i18nV157.js'),header=read('src/components/Header.js');
 assert.deepEqual(EXTRA_LANGUAGE_OPTIONS_V204.map(([lang])=>lang),['ko','vi','id','es','pt','zh']);
 for(const [lang] of EXTRA_LANGUAGE_OPTIONS_V204){
  assert.ok(Object.keys(SESSION_TRANSLATIONS_V204[lang]).length>=50);
  assert.notEqual(SESSION_TRANSLATIONS_V204[lang]['Session name *'],'Session name *');
 }
 assert.ok(JA_SESSION_UI_V204['Video meeting platform *']);
 assert.match(i18n,/root\.querySelectorAll\('\[data-lang-select\]'\)/);
 assert.match(i18n,/setGccLanguage\(select\.value\);refresh\(\)/);
 assert.match(i18n,/const originals=new WeakMap/);
 assert.doesNotMatch(i18n,/input\.value\s*=/);
 assert.match(header,/data-lang-select/);
});
