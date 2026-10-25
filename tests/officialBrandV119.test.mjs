import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');const page=r('src/pages/public/WelcomeV117.js'),css=r('src/styles/welcomeBrandV119.css');
test('official GCC logo, Hosted by credit, and existing host entry remain',()=>{
 assert.match(page,/gcc-v119-official\.webp/);assert.match(page,/gcc119-logo-image/);
 assert.match(page,/Hosted by Global Classroom/);assert.match(page,/My profile/);assert.match(page,/Host sign in/);
 assert.match(css,/background:transparent/);
});
test('gateway has three actions, new signup/signin and guarded teacher access',()=>{
 assert.equal((page.match(/class="gcc117-choice gcc117-choice-/g)||[]).length,3);
 for(const r of ['create','find','volunteer'])assert.match(page,new RegExp('teacher-portal\\?view='+r));
 assert.match(page,/#\/signup/);assert.match(page,/#\/teacher-access/);
 const app=rfile('src/app.js');assert.match(app,/gcc_teacher_identity/);assert.match(app,/teacher-access\?next=/);
});
function rfile(x){return fs.readFileSync(new URL('../'+x,import.meta.url),'utf8');}
test('legacy registration still available without mandatory student list',()=>{
 const app=r('src/app.js'),wizard=r('src/controllers/registrationWizard.js');const access=r('src/pages/teacher/TeacherAccessPage.js');
 assert.doesNotMatch(app,/Please add at least one student/);assert.doesNotMatch(wizard,/Add at least one student display name/);
 assert.match(access,/Registration invitation code/);assert.match(access,/#\/registration/);
});
test('optimized official GCC WebP remains bundled',()=>{
 const data=fs.readFileSync(new URL('../src/assets/gcc-v119-official.webp',import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.byteLength<150000);
});
