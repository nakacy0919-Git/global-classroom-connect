import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rosterSubmissionErrorV236} from '../src/lib/rosterAdmissionV236.js';
test('burst feedback keeps the entered roster and advises a bounded retry',()=>{
 const text=rosterSubmissionErrorV236({message:'GCC_ROSTER_BUSY'});
 assert.match(text,/keep this page open/);
 assert.match(text,/wait a few minutes/);
 assert.match(text,/entered information is still here/);
 assert.match(text,/contact your host/);
 assert.doesNotMatch(text,/GCC_ROSTER_BUSY/);
 assert.match(rosterSubmissionErrorV236({message:'already registered for this session'}),/4-digit code/);
 assert.equal(rosterSubmissionErrorV236({message:'Registration is closed'}),'Registration is closed');
});
test('guard is staged, applies to all insert paths and is not browser-controlled',()=>{
 const sql=readFileSync(new URL('../sql/gcc_v236_roster_admission_guard.sql',import.meta.url),'utf8');
 assert.match(sql,/BEFORE INSERT ON public\.gcc_session_signups/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/ON CONFLICT\(event_id\) DO UPDATE/);
 assert.match(sql,/w\.accepted_count<v_limit/);
 assert.match(sql,/REVOKE ALL ON SCHEMA gcc_roster_guard FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(sql,/request\.headers|inet_client_addr|teacher_name|school_name/);
 const page=readFileSync(new URL('../src/pages/public/SharedRegistrationPage.js',import.meta.url),'utf8');
 assert.match(page,/message\(rosterSubmissionErrorV236\(err\)\)/);
 assert.match(page,/sending=false;b\.disabled=false/);
});
