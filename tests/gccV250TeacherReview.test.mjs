import test from 'node:test';import assert from 'node:assert/strict';
import {newestApplicationsV250,rejectionDraftV250,validSchoolWebsiteV250} from '../src/lib/teacherReviewV250.js';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('pending applications first, newest first, without mutating source',()=>{
 const data=[{id:'older',status:'pending',submitted_at:'2026-11-24T00:00:00Z'},{id:'approved',status:'approved',submitted_at:'2026-11-25T00:00:00Z'},{id:'newer',status:'pending',submitted_at:'2026-11-25T00:00:00Z'}];
 assert.deepEqual(newestApplicationsV250(data).map(a=>a.id),['newer','older']);assert.equal(data[0].id,'older');
 const page=src('src/pages/host/TeacherApprovalsV120.js');
 assert.ok(page.indexOf('id="gcc120-review-list"')<page.indexOf('id="gcc134-accounts"'));
 assert.ok(page.indexOf('id="gcc120-review-list"')<page.indexOf('id="gcc153-host-school-list"'));
 assert.match(page,/!photoReady\|\|!validSchoolWebsiteV250/);
});
test('rejection draft includes selected issues and only applicant email',()=>{
 const a={name:'Example Teacher',email:'example+teacher@example.org'};
 const d=rejectionDraftV250(a,['photo','school'],'Please check your school URL.');
 assert.match(d.body,/individual photograph/);assert.match(d.body,/official school website/);assert.doesNotMatch(d.body,/some of the information/);
 assert.match(d.body,/Please check your school URL/);assert.match(d.body,/do not create a duplicate account/);
 assert.ok(d.mailto.startsWith('mailto:example%2Bteacher%40example.org?subject='));
 assert.throws(()=>rejectionDraftV250(a,[]));assert.throws(()=>rejectionDraftV250({...a,email:'a@example.org?bcc=b@example.org'},['photo']));
});
test('school URL verification and registration notice',()=>{
 for(const u of ['','http://example.org','https://localhost','https://user:pass@example.org','javascript:alert(1)'])assert.equal(validSchoolWebsiteV250(u),false);
 assert.equal(validSchoolWebsiteV250('https://www.example.org/school'),true);
 const join=src('src/pages/teacher/TeacherJoinV120.js');assert.match(join,/id="gcc120-school-web"[^>]+required/);assert.match(join,/will be rejected/);
});
