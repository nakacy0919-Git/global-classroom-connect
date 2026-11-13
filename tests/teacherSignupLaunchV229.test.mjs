import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const join=read('src/pages/teacher/TeacherJoinV120.js');
const css=read('src/styles/teacherSignupLaunchV229.css');
test('first-time teacher sees a concise four-step signup flow',()=>{
 assert.match(join,/1\. Create an account/);
 assert.match(join,/2\. Confirm your email/);
 assert.match(join,/3\. Introduce your school/);
 assert.match(join,/4\. Get approved and connect/);
});
test('school timezone is local to the school, not traveller device',()=>{
 assert.match(join,/time zone where your school is located/);
 assert.match(join,/id="gcc120-timezone"/);
 assert.match(join,/Asia\/Manila/);
});
test('approved teachers are directed to teacher space and volunteering remains optional',()=>{
 assert.match(join,/id="gcc229-open-teacher-space"/);
 assert.match(join,/href="#\/teacher-portal\?view=home"/);
 assert.match(join,/Optional: Become a Facilitator/);
 assert.match(join,/hidden=kind!=='approved'/);
 assert.match(css,/#gcc229-open-teacher-space\[hidden\]/);
});
