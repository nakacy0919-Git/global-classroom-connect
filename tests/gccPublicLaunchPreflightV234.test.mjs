import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../src/pages/teacher/TeacherPortalPage.js',import.meta.url),'utf8');

test('core sessions load even if optional public events or notification RPC fails',()=>{
 assert.match(page,/loadTeacherWorkspaceSnapshotV230\(/);
 assert.match(page,/sessions:teacherSessions,requests:teacherRequests/);
 assert.match(page,/publicEvents:listPublicSessionOverviews,notifications:teacherNotifications/);
 assert.match(page,/snapshot\.warnings\.join/);
});
test('request success is not reported as failure when follow-up refresh errors',()=>{
 const start=page.indexOf('await teacherApply(o.id,message.value.trim(),number,minAge,maxAge)');
 assert.ok(start>0);
 const excerpt=page.slice(start,start+850);
 assert.match(excerpt,/let refreshed=true;/);
 assert.match(excerpt,/try\{await refresh\(\);\}catch\{refreshed=false;\}/);
 assert.match(excerpt,/Request submitted, but this screen could not refresh/);
 assert.match(excerpt,/do not send it twice/);
 assert.match(excerpt,/showSuccessCelebration\(\{title:'Request submitted!'/);
});
test('approvals also preserve committed decision when view refresh fails',()=>{
 const start=page.indexOf('await teacherReview(r.id,decision)');
 assert.ok(start>0);
 const excerpt=page.slice(start,start+550);
 assert.match(excerpt,/try\{await refresh\(\);\}catch\{refreshed=false;\}/);
 assert.match(excerpt,/Decision saved, but this screen could not refresh/);
});
test('the GCC UI no longer claims automatic email is not enabled',()=>{
 assert.doesNotMatch(page,/Automated email is not yet enabled/);
 assert.match(page,/may also receive an email alert if delivery succeeds/);
 assert.match(page,/GCC does not store chat messages/);
});
