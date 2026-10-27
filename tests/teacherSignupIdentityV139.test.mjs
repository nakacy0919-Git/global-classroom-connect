import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertApplicantIdentityV139, assertEditableDraftV139} from '../src/lib/teacherSignupIdentityV139.js';
const ui=fs.readFileSync(new URL('../src/pages/teacher/TeacherJoinV120.js',import.meta.url),'utf8');
test('cross-account and signed-out sessions are rejected',()=>{
 assert.equal(assertApplicantIdentityV139({id:'hot'},'hot'),true);
 for(const user of [null,{id:'old'},{id:''}])
  assert.throws(()=>assertApplicantIdentityV139(user,'hot'),/account changed/);
});
test('approval, pending, unrelated draft, and unrelated teacher record are not editable',()=>{
 const loaded={id:'draft1',teacher_id:'teacher1',status:'draft'};
 assert.equal(assertEditableDraftV139({...loaded},loaded),true);
 for(const change of [{status:'approved'},{status:'pending'},{id:'other'},{teacher_id:'other'}])
  assert.throws(()=>assertEditableDraftV139({...loaded,...change},loaded),/not editable/);
});
test('active login is visible and can be switched explicitly without deleting data',()=>{
 assert.match(ui,/id="gcc139-account-email"/);
 assert.match(ui,/id="gcc139-switch-account"/);
 assert.match(ui,/signOut\(\{scope:'local'\}\)/);
 assert.match(ui,/displayedUserId!==user.id/);
 assert.match(ui,/gcc120-application'\)\.reset\(\)/);
});
test('signup blocks a second account creation under another authenticated session',()=>{
 const check=ui.indexOf('const existing=await currentUserV120()');
 const signup=ui.indexOf('const result=await signupAccountV120(');
 assert.ok(check>=0&&check<signup);
 assert.match(ui,/if\(existing\)\{displayActiveAccount\(existing\);throw Error/);
});
test('submission requires fresh draft ownership and rechecks user after photo upload',()=>{
 const chunk=ui.slice(ui.indexOf(" $('gcc120-application').addEventListener"),ui.indexOf(" $('gcc139-switch-account').addEventListener"));
 assert.ok(chunk.indexOf('assertEditableDraftV139(latestDraft,draft)')<chunk.indexOf('uploadApplicationPhotoV120(draft.teacher_id,file)'));
 assert.match(chunk,/assertApplicantIdentityV139\(await currentUserV120\(\),activeDraftUserId\)/);
 assert.match(chunk,/const photo=await uploadApplicationPhotoV120\(draft.teacher_id,file\);\s*assertApplicantIdentityV139/);
 assert.match(chunk,/submitApplicationV120\(payload,photo.path\)/);
});
