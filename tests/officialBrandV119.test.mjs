import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const r=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=r('src/pages/public/WelcomeV117.js');
const css=r('src/styles/welcomeBrandV119.css');
test('official new GCC logo and separate Global Classroom host credit',()=>{
 assert.match(page,/gcc-v119-official\.webp/);
 assert.match(page,/gcc119-logo-image/);
 assert.match(page,/Hosted by Global Classroom/);
 assert.match(page,/My profile/);
 assert.match(page,/Host sign in/);
 assert.match(css,/gcc117-topbar nav \.gcc117-host-link\{display:inline-flex!important/);
});
test('old full-width header/footer and disclaimer are absent while invitation remains',()=>{
 assert.doesNotMatch(page,/Made for educators, connected by curiosity/);
 assert.doesNotMatch(page,/Offering to facilitate or host does not automatically/);
 assert.match(page,/New here\? Sign in or activate your invitation/);
 assert.match(css,/\.gcc117-topbar\{/);
 assert.match(css,/background:transparent/);
});
test('three real teacher routes and teacher portal access gate remain intact',()=>{
 assert.equal((page.match(/class="gcc117-choice gcc117-choice-/g)||[]).length,3);
 const app=r('src/app.js');
 for(const route of ['create','find','volunteer'])assert.match(page,new RegExp('teacher-portal\\?view='+route));
 assert.match(app,/profile\.role !== 'teacher'/);
 assert.match(app,/teacher-access\?next=/);
 assert.match(page,/host-session\.webp/);
});
test('school and teacher may register before listing students; approval and invitation are still required',()=>{
 const app=r('src/app.js');const wizard=r('src/controllers/registrationWizard.js');
 const access=r('src/pages/teacher/TeacherAccessPage.js');
 assert.doesNotMatch(app,/Please add at least one student/);
 assert.doesNotMatch(wizard,/Add at least one student display name/);
 assert.match(access,/Register school &amp; teacher/);
 assert.match(access,/Registration invitation code/);
 assert.match(access,/approval/);
 assert.match(access,/#\/registration/);
});
test('optimized uploaded official badge is a local WebP with no new DB changes',()=>{
 const data=fs.readFileSync(new URL('../src/assets/gcc-v119-official.webp',import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.ok(data.byteLength < 150000);
 assert.doesNotMatch(css,/@import|https:\/\//);
});
