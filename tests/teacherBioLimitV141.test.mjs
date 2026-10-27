import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('src/pages/teacher/TeacherJoinV120.js');
const css=read('src/styles/teacherBioLimitV141.css');
const migration=read('sql/gcc_v141_teacher_bio_3000.sql');

test('pasting long biography is not silently truncated by HTML maxlength',()=>{
 const match=ui.match(/<textarea id="gcc120-bio"[^>]*>/);
 assert.ok(match,'missing biography textarea');
 assert.doesNotMatch(match[0],/maxlength/);
 assert.match(match[0],/minlength="20" required/);
 assert.match(ui,/Short self-introduction \(20–3000 characters\)/);
});
test('pasted text immediately receives unicode-aware live character feedback and a clear error',()=>{
 assert.match(ui,/bio\.addEventListener\('input',updateBioCounter\)/);
 assert.match(ui,/Array\.from\(bio\.value\.trim\(\)\)\.length/);
 assert.match(ui,/bioCounter\.textContent=length\+' \/ 3000 characters'/);
 assert.match(ui,/bio\.setCustomValidity\(over\?/);
 assert.match(ui,/if\(Array\.from\(bio\.value\.trim\(\)\)\.length>3000\)/);
 assert.match(ui,/id="gcc141-bio-count"/);
 assert.match(css,/gcc141-bio-count-error/);
});
test('backend accepts 20 to 3000 code points and retains auth, ownership, photos and pending review',()=>{
 assert.match(migration,/char_length\(bio\) NOT BETWEEN 20 AND 3000/);
 assert.doesNotMatch(migration,/char_length\(bio\) NOT BETWEEN 20 AND 1000/);
 assert.match(migration,/SECURITY DEFINER/);
 assert.match(migration,/email_confirmed_at IS NOT NULL/);
 assert.match(migration,/a\.status<>'draft'/);
 assert.match(migration,/gcc_v120_can_upload_photo/);
 assert.match(migration,/status='pending'/);
 assert.doesNotMatch(migration,/DROP|TRUNCATE|DELETE FROM/i);
});
test('profile remains protected and the rest of the application form is unchanged',()=>{
 assert.match(ui,/assertApplicantIdentityV139/);
 assert.match(ui,/assertEditableDraftV139/);
 assert.match(ui,/submitApplicationV120\(payload,photo\.path\)/);
});
