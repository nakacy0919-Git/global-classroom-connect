import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/app.js');
const login=read('src/pages/teacher/TeacherAccessPage.js');
const reset=read('src/pages/teacher/TeacherPasswordPageV136.js');
test('teacher login presents a safe password recovery link, without creating new account',()=>{
 assert.ok(login.includes('Forgot your password? Reset it by email'));
 assert.ok(login.includes('href="#/teacher-password"'));
 assert.ok(login.includes('teacherSignupErrorV135(e)'));
});
test('recovery is a public app route and correctly handles Supabase fragment callbacks',()=>{
 for(const x of ["'teacher-password': TeacherPasswordPageV136","'teacher-password',","route === 'teacher-password'","bindTeacherPasswordPageV136()"])
  assert.ok(app.includes(x),x);
 assert.ok(app.includes("get('gcc_recovery')==='1'"));
 assert.ok(reset.includes("get('gcc_recovery')==='1'"));
});
test('reset request uses Supabase Auth email and an explicit return address, not direct email send',()=>{
 assert.ok(reset.includes('supabase.auth.resetPasswordForEmail'));
 assert.ok(reset.includes("window.location.origin+window.location.pathname+'?gcc_recovery=1'"));
 assert.ok(reset.includes('Date.now()-lastRequest<60000'));
 assert.ok(reset.includes('If this address is registered'));
 assert.ok(!reset.includes('auth.admin'));
 assert.ok(!reset.includes('service_role'));
});
test('changing password requires a verified Supabase session and matching new passwords',()=>{
 assert.ok(reset.includes('supabase.auth.getSession()'));
 assert.ok(reset.includes('Boolean(data?.session?.user)'));
 assert.ok(reset.includes('if(!validSession)'));
 assert.ok(reset.includes('if(password!==confirm)'));
 assert.ok(reset.includes('supabase.auth.updateUser({password})'));
 assert.ok(reset.includes("window.location.pathname+'#/signup'"));
 assert.ok(!reset.includes('setUserPassword'));
});
test('recovery keeps admin approval and existing teacher profile untouched',()=>{
 assert.ok(!reset.includes('gcc_v120_review_application'));
 assert.ok(!reset.includes('gcc_v120_submit_application'));
 assert.ok(reset.includes('Do not create another account'));
 assert.ok(reset.includes('Never share your password'));
});
