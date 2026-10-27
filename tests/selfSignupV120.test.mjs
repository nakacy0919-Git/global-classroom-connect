import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/gcc_v120_self_signup_review.sql');
const join=read('src/pages/teacher/TeacherJoinV120.js');
const admin=read('src/pages/host/TeacherApprovalsV120.js');
const app=read('src/app.js');
test('signup requires photo and identity but optional websites and region',()=>{
 for(const field of ['gcc120-photo','gcc120-bio','gcc120-name','gcc120-school','gcc120-city','gcc120-country','gcc120-timezone'])
 assert.match(join,new RegExp('id="'+field+'"[^>]*required'));
 for(const field of ['gcc120-website','gcc120-school-web','gcc120-region']) {
  assert.match(join,new RegExp('id="'+field+'"'));
  assert.doesNotMatch(join,new RegExp('id="'+field+'"[^>]*required'));
 }
 assert.match(join,/compressTeacherPhotoV116|uploadApplicationPhotoV120/);
 assert.match(sql,/char_length\(bio\) NOT BETWEEN 20 AND 1000/);
 assert.match(sql,/Photo must be a valid WebP under 300 KB/);
});
test('applications default to draft and require host approval',()=>{
 assert.match(sql,/status text NOT NULL DEFAULT 'draft'/);
 assert.match(sql,/status='pending'/);
 assert.match(sql,/gcc_v6_require_host\(\)/);
 assert.match(sql,/email_confirmed_at IS NOT NULL/);
 assert.match(sql,/GRANT SELECT ON public.gcc_v120_applications TO authenticated/);
 assert.doesNotMatch(sql,/GRANT (INSERT|UPDATE|DELETE) ON public.gcc_v120_applications TO authenticated/);
});
test('reviewer selects teacher-only or host and teacher; never auto assigns host',()=>{
 assert.match(admin,/Teacher \+ Host Admin/);
 assert.match(admin,/grantHost&&!confirm/);
 assert.match(sql,/CASE WHEN p_grant_host THEN 'host' ELSE 'teacher' END/);
 assert.match(sql,/public\.profiles\.role='host' THEN 'host'/);
});
test('existing host may be linked as teacher without losing host privilege',()=>{
 assert.match(sql,/p\.role IN \('teacher','host'\)/);
 assert.match(app,/gcc_teacher_identity/);
 assert.match(app,/teacher-approvals/);
 assert.match(app,/'signup'/);
});
test('photos private; only applicant draft can upload and approve cannot bypass photo',()=>{
 assert.match(sql,/a\.user_id=auth\.uid\(\) AND a\.status='draft'/);
 assert.match(sql,/CREATE POLICY "GCC V120 applicant upload"/);
 assert.match(sql,/CREATE POLICY "GCC V120 applicant photo read"/);
 assert.match(sql,/photo_path=p_photo_path/);
});
test('landing retains 3 real actions and adds signup, signin and button bounce',()=>{
 const page=read('src/pages/public/WelcomeV117.js'),css=read('src/styles/welcomeSignupV120.css');
 assert.equal((page.match(/class="gcc117-choice gcc117-choice-/g)||[]).length,3);
 assert.match(page,/#\/signup/);assert.match(page,/#\/teacher-access/);
 assert.match(css,/@keyframes gcc120-bouncy-hover/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
