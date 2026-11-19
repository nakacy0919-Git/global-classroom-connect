import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeHostSessionsV233,filterHostSessionsV233,validateAdminOfferChangeV233} from '../src/lib/hostSessionDirectoryV233.js';
const now=Date.parse('2026-11-19T00:00:00Z');
const offer={
 id:'offer-1',teacher_id:'teacher-1',country_code:'JP',timezone:'Asia/Tokyo',
 starts_at:'2026-12-09T07:00:00Z',ends_at:'2026-12-09T08:00:00Z',
 status:'open',student_count:20,room_count:3,topic:'Culture',notes:'',
 session_details:{session_name:'School Life',max_participants:100,registration_closes_at:'2026-12-08T07:00:00Z'},
 updated_at:'2026-11-19T00:00:00Z'
};
const draft={title:'School Life',topic:'Culture',notes:'',students:20,rooms:3,capacity:100,
 startsAt:offer.starts_at,endsAt:offer.ends_at,deadline:offer.session_details.registration_closes_at,status:'open'};
test('Host Admin sees both previously hidden teacher sessions and host events',()=>{
 const records=normalizeHostSessionsV233(
  [{id:'event-1',title:'Host Workshop',status:'published',starts_at:'2026-10-10T00:00:00Z',ends_at:'2026-10-10T01:00:00Z'}],
  [offer],
  [{id:'teacher-1',display_name:'A Teacher',school_id:'school-1'}],
  [{id:'school-1',name:'Example School',country_name:'Japan'}],
  [{offer_id:'offer-1',status:'approved',requested_students:10}]
 );
 assert.equal(records.length,2);
 assert.equal(records[0].source,'teacher');
 assert.equal(records[0].school,'Example School');
 assert.equal(records[0].requestStats.approvedStudents,10);
 assert.equal(filterHostSessionsV233(records,{query:'Example'}).length,1);
 assert.equal(filterHostSessionsV233(records,{period:'past'},now).length,1);
 assert.equal(filterHostSessionsV233(records,{period:'upcoming'},now).length,1);
 assert.equal(filterHostSessionsV233(records,{source:'host'}).length,1);
});
test('Editing requires validated capacity and coherent schedule',()=>{
 assert.equal(validateAdminOfferChangeV233(offer,draft,15,now).ok,true);
 assert.match(validateAdminOfferChangeV233(offer,{...draft,capacity:30},15,now).errors.join(' '),/capacity/);
 assert.match(validateAdminOfferChangeV233(offer,{...draft,endsAt:draft.startsAt},0,now).errors.join(' '),/time window/);
 assert.match(validateAdminOfferChangeV233(offer,{...draft,status:'broken'},0,now).errors.join(' '),/status/);
 assert.match(validateAdminOfferChangeV233(offer,{...draft,deadline:'2026-12-10T00:00:00Z'},0,now).errors.join(' '),/deadline/);
});
test('Legacy historical sessions may be described but cannot be rescheduled to the past',()=>{
 const old={...offer,status:'open',starts_at:'2026-10-10T00:00:00Z',ends_at:'2026-10-10T01:00:00Z',
 session_details:{...offer.session_details,registration_closes_at:'2026-10-09T00:00:00Z'}};
 const same={...draft,title:'Historic school life',startsAt:old.starts_at,endsAt:old.ends_at,deadline:old.session_details.registration_closes_at};
 assert.equal(validateAdminOfferChangeV233(old,same,0,now).ok,true);
 assert.match(validateAdminOfferChangeV233(old,{...same,startsAt:'2026-10-11T00:00:00Z',endsAt:'2026-10-11T01:00:00Z'},0,now).errors.join(' '),/Past sessions/);
});
test('Host directory enforces host authorization and protects records with join requests',()=>{
 const service=readFileSync(new URL('../src/services/hostSessionDirectoryV233.js',import.meta.url),'utf8');
 assert.match(service,/rpc\('gcc_v6_require_host'\)/);
 assert.match(service,/readEveryRow\('exchange_availability'/);
 assert.match(service,/readEveryRow\('events'/);
 assert.match(service,/\.order\('id',\{ascending:true\}\)/);
 assert.match(service,/Close it instead to preserve participant records/);
 assert.match(service,/deleteFinishedSessionV105/);
});
test('The admin Sessions page exposes a neutral directory above an optional calendar',()=>{
 const page=readFileSync(new URL('../src/pages/host/SimpleSessionsPage.js',import.meta.url),'utf8');
 const style=readFileSync(new URL('../src/styles/hostSessionDirectoryV233.css',import.meta.url),'utf8');
 assert.match(page,/id="gcc-v233-directory"/);
 assert.match(page,/gcc-v233-calendar-toggle/);
 assert.match(page,/mountHostSessionDirectoryV233/);
 assert.match(style,/\.gcc-v233-row/);
 assert.match(style,/\.gcc-v233-filters/);
});
