import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('release preserves independently navigable Find and Create flows with no chat',()=>{
 const portal=read('src/pages/teacher/TeacherPortalPage.js');
 const section=portal.split('data-gct-view="find" hidden>')[1]?.split('data-gct-view="requests" hidden>')[0];
 assert.ok(section);
 assert.doesNotMatch(section,/href="#\/teacher-portal\?view=create"|Create a Session|Host a Session/);
 assert.match(portal,/calendarMenuV214/);
 assert.match(portal,/sessionStarterV216/);
 assert.match(portal,/teacherApply\(o\.id,message\.value\.trim\(\),number\)/);
 assert.match(portal,/teacherReview\(r\.id,decision\)/);
 assert.doesNotMatch(portal,/mountTeacherMessagesV214|teacherSendMessageV214/);
});
test('release does not falsely claim native email and private partner messaging are active',()=>{
 const portal=read('src/pages/teacher/TeacherPortalPage.js');
 const doc=read('docs/gcc-phase2-10-teacher-pilot.md');
 assert.match(portal,/Automated email is not yet enabled/);
 assert.match(doc,/No in-app chat/);
 assert.match(doc,/known gap/);
});
