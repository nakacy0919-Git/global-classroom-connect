import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {teacherSignupErrorV135,teacherPhotoErrorV135} from '../src/lib/teacherSignupRecoveryV135.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/pages/teacher/TeacherJoinV120.js');
const svc=read('src/services/teacherOnboardingV120.js');
const sql=read('sql/gcc_v135_applicant_photo_upload.sql');
test('email rate errors instruct recovery without suggesting automatic verification',()=>{
 const msg=teacherSignupErrorV135({code:'over_email_send_rate_limit',message:'email rate limit exceeded'});
 assert.match(msg,/temporarily reached its sending limit/);
 assert.match(msg,/do not repeat Create account/);
 assert.doesNotMatch(msg,/disable.*verification|automatically.*approved/i);
});
test('unverified, duplicate, and unauthorized email errors have actionable text',()=>{
 assert.match(teacherSignupErrorV135({message:'Email not confirmed'}),/confirmation link/);
 assert.match(teacherSignupErrorV135({message:'User already registered'}),/Sign in and continue/);
 assert.match(teacherSignupErrorV135({code:'email_address_not_authorized'}),/contact the GCC administrator/);
});
test('photo policy recovery does not wipe the form and lets the same account retry',()=>{
 assert.match(teacherPhotoErrorV135({message:'new row violates row-level security policy'}),/profile entries are still/);
 assert.match(ui,/teacherPhotoErrorV135\(err\)/);
 assert.match(ui,/finally\{button\.disabled=false;\}/);
 assert.match(ui,/teacherPhotoErrorV135\(err\)/);
});
test('photo INSERT RLS restriction retains draft owner and WebP checks',()=>{
 assert.match(sql,/DROP POLICY IF EXISTS "GCC V120 applicant upload"/);
 assert.match(sql,/CREATE POLICY "GCC V120 applicant upload"/);
 assert.match(sql,/FOR INSERT TO authenticated/);
 assert.match(sql,/public\.gcc_v120_can_upload_photo\(name\)/);
 assert.match(sql,/lower\(storage\.extension\(name\)\)='webp'/);
 assert.doesNotMatch(sql,/metadata->>'size'|metadata->>'mimetype'/);
 const original=read('sql/gcc_v120_self_signup_review.sql');
 assert.match(original,/Photo must be a valid WebP under 300 KB/);
 assert.match(original,/a\.status='draft'/);
 assert.match(original,/p_photo_path/);
});
test('teacher sign up has explicit account->confirm->sign-in->profile->approval flow',()=>{
 assert.match(ui,/confirm the link sent to your email/);
 assert.match(ui,/Sign in and continue/);
 assert.match(ui,/submit your teacher profile for approval/);
 assert.match(ui,/resendConfirmationV135/);
 assert.match(ui,/Date\.now\(\)-resendAt<60000/);
 assert.match(svc,/auth\.resend\(\{type:'signup'/);
 assert.match(svc,/auth\.signUp/);
 assert.match(svc,/auth\.signInWithPassword/);
});
test('email production configuration requires SMTP, never disables confirmation',()=>{
 const doc=read('docs/gcc-v135-email-delivery.md');
 assert.match(doc,/SMTP/);
 assert.match(doc,/2 email messages per hour/);
 assert.match(doc,/Do NOT turn off confirmation/);
 assert.doesNotMatch(svc,/mailer_autoconfirm|service_role/);
});
