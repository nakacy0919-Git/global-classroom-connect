import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {WIZARD_SCREENS_V242,firstScreenV242,screenGroupV242} from '../src/lib/sessionPopupWizardV242.js';
import {translateUiText} from '../src/lib/i18nV157.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('eleven sequential questions preserve the four legacy draft groups',()=>{
 assert.deepEqual(WIZARD_SCREENS_V242.map(x=>x.group),[0,0,1,1,1,2,2,2,2,2,3]);
 assert.deepEqual([0,1,2,3].map(firstScreenV242),[0,2,5,10]);
 assert.equal(screenGroupV242(10),3);
 for(const s of WIZARD_SCREENS_V242){assert.notEqual(translateUiText(s.title,'ja'),s.title);assert.notEqual(translateUiText(s.hint,'ja'),s.hint);}
});
test('teacher modal retains original payload and a single form, guards early and repeated publish',()=>{
 const p=read('src/pages/teacher/TeacherPortalPage.js');
 assert.equal((p.match(/id="gctp-create"/g)||[]).length,1);
 assert.match(p,/dialog id="gcc242-dialog"/);assert.match(p,/wizard.index\(\)!==10/);
 assert.match(p,/canCreate\(\)/);assert.match(p,/teacherCreateSession\(slot,data\)/);
 assert.match(p,/captureSessionDraftV213\(\$\('gctp-create'\),formStep,cloneFlyerUrl\)/);
 assert.match(p,/wizard\.close\(\);display\('create'\)/);
});
test('popup has one scrolling body, accessible modal and mobile sizing',()=>{
 const p=read('src/lib/sessionPopupWizardV242.js'),css=read('src/styles/sessionPopupWizardV242.css');
 assert.match(p,/showModal\(\)/);assert.match(p,/dialog.addEventListener\('cancel'/);
 assert.match(p,/aria-current/);assert.match(p,/aria-pressed/);assert.match(css,/overflow:auto/);assert.match(css,/100dvh/);
 assert.match(css,/min-height:44px/);
});
