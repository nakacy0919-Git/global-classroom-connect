import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('duplicate teacher tabs and duplicate workspace home have been removed',()=>{
 const page=read('src/pages/teacher/TeacherPortalPage.js');
 for(const removed of ['class="gct-tabs"','data-gct-tab=','gcc117-teacher-home','data-gct-open=']) assert.ok(!page.includes(removed),removed);
 for(const view of ['create','find','requests','network','volunteer']) assert.ok(page.includes('data-gct-view="'+view+'"'),view);
 assert.ok(page.includes('display(view)'));
 assert.ok(page.includes("window.location.hash='#/welcome'"));
});
test('the public home remains the entry point and teacher sidebar returns to it',()=>{
 const home=read('src/pages/public/WelcomeV117.js');
 assert.equal((home.match(/class="gcc117-choice gcc117-choice-/g)||[]).length,4);
 for(const view of ['create','find','volunteer']) assert.ok(home.includes('href="#/teacher-portal?view='+view+'"'));
 const sidebar=read('src/pages/teacher/TeacherSidebar.js');
 assert.ok(sidebar.includes('href="#/welcome"'));
 assert.ok(!sidebar.includes('view=home'));
});
test('teacher sign-in returns to selected feature, with public home as default',()=>{
 const access=read('src/pages/teacher/TeacherAccessPage.js');
 assert.ok(access.includes("'#/welcome'"));
 assert.ok(access.includes("'#/teacher-portal?view='+next"));
 assert.ok(!access.includes("['home','create'"));
 const app=read('src/app.js');
 assert.ok(app.includes('gcc_teacher_identity'));
 assert.ok(app.includes('teacher-access?next='));
});
test('approved core member sees Facilitator next step; pending applicants remain locked',()=>{
 const signup=read('src/pages/teacher/TeacherJoinV120.js');
 assert.ok(signup.includes('id="gcc132-facilitator-next"'));
 assert.ok(signup.includes("hidden=kind!=='approved'"));
 assert.ok(signup.includes("kind==='approved'?'Next: register as a Breakout Room Facilitator or GC Host"));
 const vol=read('src/pages/teacher/VolunteerV117.js');
 for(const marker of ['saveVolunteerV117','myTeacherProfileV116','Registration does not grant Host Admin access'])
  assert.ok(vol.includes(marker));
});
test('teacher requests and network are still accessible via account menu',()=>{
 const home=read('src/pages/public/WelcomeV117.js');
 for(const view of ['requests','network']) assert.ok(home.includes('href="#/teacher-portal?view='+view+'"'));
 const portal=read('src/pages/teacher/TeacherPortalPage.js');
 for(const marker of ['teacherCreateSession','teacherApply','teacherReview','mountVolunteerV117','mountTeacherNetworkV116'])
  assert.ok(portal.includes(marker));
});
test('page heading follows action rather than generic Teacher Workspace',()=>{
 const header=read('src/components/Header.js');
 assert.ok(header.includes('teacherTitles='));
 for(const title of ['Host a Session','Find a Session','My Requests','Teacher Network','Be a Facilitator / GC Host'])
  assert.ok(header.includes(title));
});
