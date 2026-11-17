import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyPublishedSessionV226} from '../src/lib/sessionPublicationV226.js';
const now=Date.parse('2026-11-17T09:00:00Z');
const offer={
 id:'new-id',is_mine:true,status:'open',
 starts_at:'2026-12-11T04:10:00Z',ends_at:'2026-12-11T05:10:00Z',
 student_count:20,available_seats:80,
 session_details:{session_name:'Culture Workshop',session_type:'collaborative_project',
  max_participants:100,registration_closes_at:'2026-12-09T04:00:00Z'}
};
const expected={startsAt:offer.starts_at,endsAt:offer.ends_at,
 sessionName:'Culture Workshop',sessionType:'collaborative_project',maxParticipants:100};
test('successful publishing is confirmed by a matching discoverable own session',()=>{
 const result=verifyPublishedSessionV226(offer.id,[offer],expected,now);
 assert.equal(result.ok,true);
 assert.deepEqual(result.issues,[]);
});
test('missing registration and foreign sessions are not reported as published',()=>{
 assert.equal(verifyPublishedSessionV226('unknown',[offer],expected,now).ok,false);
 assert.match(verifyPublishedSessionV226('new-id',[{...offer,is_mine:false}],expected,now).issues.join(' '),/hosted session/);
});
test('closed, expired, incomplete and altered sessions report actionable issues',()=>{
 const changed={...offer,status:'closed',available_seats:null,
  ends_at:'2026-11-01T00:00:00Z',
  session_details:{...offer.session_details,session_type:'icebreaking',
   max_participants:null,registration_closes_at:'2026-11-01T00:00:00Z'}};
 const result=verifyPublishedSessionV226('new-id',[changed],expected,now);
 assert.equal(result.ok,false);
 assert.match(result.issues.join(' '),/not open/);
 assert.match(result.issues.join(' '),/capacity/);
 assert.match(result.issues.join(' '),/deadline/);
 assert.match(result.issues.join(' '),/format/);
});
test('publication UI checks the returned ID before showing verified success',()=>{
 const source=readFileSync(new URL('../src/pages/teacher/TeacherPortalPage.js',import.meta.url),'utf8');
 assert.match(source,/const sessionId=await teacherCreateSession\(slot,data\);created=true/);
 assert.match(source,/verifyPublishedSessionV226\(sessionId,visibleOffers/);
 assert.match(source,/Session published and verified in Find Sessions/);
});
