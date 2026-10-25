import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/teacher/TeacherAccessPage.js');
const css=read('src/styles/teacherLoginV126.css');
test('sign in screen presents exactly one focused login and a compact signup action',()=>{
 assert.match(page,/Teacher sign in/);
 assert.match(page,/id="gcta-login"/);
 assert.match(page,/gcc126-actions/);
 assert.match(page,/href="#\/signup"/);
 assert.doesNotMatch(page,/Legacy school registration|New here\? Sign up →/);
 assert.doesNotMatch(page,/class="gcc120-primary gcc120-span"/);
});
test('existing approved/invitation account activation and host link remain operational',()=>{
 for(const id of ['gcta-email','gcta-password','gcta-message','gcta-claim','gcta-token'])assert.match(page,new RegExp(id));
 assert.match(page,/teacherSignIn\(/);
 assert.match(page,/claimTeacherInvite\(/);
 assert.match(page,/teacherIdentity\(/);
 assert.match(page,/beginApplicationV120\(/);
 assert.match(page,/href="#\/login"/);
 assert.match(page,/return '#\/teacher-portal\?view='/);
});
test('new design follows interior palette and does not stretch actions',()=>{
 assert.match(css,/#fffefa/);
 assert.match(css,/#207a83/);
 assert.match(css,/\.gcc126-actions/);
 assert.match(css,/width:auto/);
 assert.match(css,/grid-template-columns:1fr/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(page,/teacherLoginV126\.css/);
});
test('legacy registration route remains in the application but is absent from sign-in UI',()=>{
 assert.match(read('src/app.js'),/registration:\s*RegistrationPage/);
 assert.doesNotMatch(page,/href="#\/registration"/);
});
