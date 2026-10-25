import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const join=read('src/pages/teacher/TeacherJoinV120.js');
const admin=read('src/pages/host/TeacherApprovalsV120.js');
const app=read('src/app.js');
test('new teacher form initializer only runs on the signup form, not admin approvals',()=>{
 assert.match(join,/document\.querySelector\('\.gcc120-join\[aria-label=/);
 assert.match(join,/Join Global Classroom/);
 assert.doesNotMatch(join,/document\.querySelector\('\.gcc120-join'\)/);
 assert.match(admin,/class="gcc120-join gcc120-admin"/);
});
test('approval admin page initializes after signup handler and displays failures, not infinite Loading',()=>{
 assert.ok(app.indexOf('bindTeacherJoinV120();')>=0);
 assert.ok(app.indexOf('bindTeacherApprovalsV120();')>app.indexOf('bindTeacherJoinV120();'));
 assert.match(admin,/list\.replaceChildren\(el\('p','gcc120-panel','Could not load applications/);
 assert.match(admin,/notify\(e\.message/);
 assert.match(admin,/No pending applications/);
});
test('new fix does not alter admin privilege decisions and teacher registration backends',()=>{
 assert.match(admin,/Teacher \+ Host Admin/);
 assert.match(admin,/reviewApplicationV120\(a\.id,decision,grantHost,school\)/);
 assert.match(join,/submitApplicationV120/);
});
