import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {englishName,parseSimpleRoster,parseSimpleFacilitators} from '../src/lib/simpleRoster.js';
const host=readFileSync(new URL('../src/pages/host/SimpleSessionsPage.js',import.meta.url),'utf8');
const teacher=readFileSync(new URL('../src/pages/public/SharedRegistrationPage.js',import.meta.url),'utf8');
const svc=readFileSync(new URL('../src/services/simpleSessionService.js',import.meta.url),'utf8');
test('English names accept common punctuation but reject other scripts',()=>{
 assert.equal(englishName('Maria Santos'),true);
 assert.equal(englishName("D'Angelo Smith"),true);
 assert.equal(englishName('Santos, Maria'),true);
 assert.equal(englishName('山田 太郎'),false);
 assert.equal(englishName('María'),false);
});
test('one- and two-column pasted Excel lists',()=>{
 const a=parseSimpleRoster('Name\tGrade\nMaria Santos\t10\nJuan Dela Cruz\t11');
 assert.deepEqual(a.records,[{name:'Maria Santos',grade:'10'},{name:'Juan Dela Cruz',grade:'11'}]);
 assert.deepEqual(a.errors,[]);
 assert.deepEqual(parseSimpleRoster('Maria Santos\nJuan Dela Cruz').records.map(x=>x.name),['Maria Santos','Juan Dela Cruz']);
});
test('quoted comma names preserved and invalid rows reported',()=>{
 assert.equal(parseSimpleRoster('"Santos, Maria",10').records[0].name,'Santos, Maria');
 const r=parseSimpleRoster('Ana Reyes\n山田 太郎\nMaria Santos\t10\tExtra');
 assert.deepEqual(r.errors.map(x=>x.line),[2,3]);
});
test('facilitators deduplicated, invalid names reported',()=>{
 const r=parseSimpleFacilitators('Maria Santos\nMaria Santos\n山田 太郎');
 assert.deepEqual(r.records,['Maria Santos']);assert.equal(r.errors[0].line,3);
});
test('teacher registration is a single link, private, no invite codes',()=>{
 assert.match(teacher,/listPublicSessions/);assert.match(teacher,/submitSharedRoster/);
 assert.doesNotMatch(teacher,/invite code|invitation code|code provided by host/i);
 assert.doesNotMatch(svc,/\.from\(['"]gcc_session_signups['"]\)/);
 assert.match(teacher,/Other schools cannot view or change it/);
});
test('host wizard supports rooms, cap, register/review, and does not fabricate sharing',()=>{
 for(const key of ['name="rooms"','name="capacity"','name="facs"','reviewSessionSignup','updateRegistrationNames','mountRoomPlannerV9','No plan has been published'])assert.match(host,new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(host,/Generate invite code|issueSessionCode/);
});
test('only the host lists signups; public form submits via RPC',()=>{
 assert.match(host,/listSessionSignups/);assert.doesNotMatch(teacher,/listSessionSignups/);
 assert.match(svc,/gcc_v8_submit_roster/);
});
