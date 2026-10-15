import assert from 'node:assert/strict';
import {toUtc,makeSlot,findMatches} from '../src/lib/matching.js';

assert.equal(toUtc('2026-10-15','13:44','Asia/Tokyo').iso,'2026-10-15T04:44:00.000Z');
assert.equal(toUtc('2026-10-15','13:45','Asia/Kathmandu').iso,'2026-10-15T08:00:00.000Z');
assert.match(toUtc('2026-03-08','02:30','America/New_York').error,/does not exist/);
assert.match(toUtc('2026-11-01','01:30','America/New_York').error,/twice/);
const overnight=makeSlot({date:'2026-10-15',startTime:'23:30',endTime:'00:30',timezone:'Asia/Tokyo'});
assert.equal(overnight.minutes,60);
assert.equal(overnight.endsAt,'2026-10-15T15:30:00.000Z');
const base={status:'open',age_band:'Upper Secondary',room_count:4,topic:'Culture'};
const data=[
 {...base,id:'a',teacher_id:'ta',country_code:'JP',student_count:20,starts_at:'2030-01-01T09:00:00Z',ends_at:'2030-01-01T11:00:00Z'},
 {...base,id:'b',teacher_id:'tb',country_code:'PH',student_count:18,starts_at:'2030-01-01T09:45:00Z',ends_at:'2030-01-01T10:45:00Z'},
 {...base,id:'c',teacher_id:'tc',country_code:'JP',student_count:12,starts_at:'2030-01-01T09:30:00Z',ends_at:'2030-01-01T10:30:00Z'},
 {...base,id:'d',teacher_id:'td',country_code:'FR',student_count:15,starts_at:'2030-01-01T11:30:00Z',ends_at:'2030-01-01T13:00:00Z'}
];
assert.equal(findMatches(data,{now:0}).length,2);
assert.equal(findMatches(data,{now:0,minOverlap:70}).length,0);
assert.equal(findMatches(data,{now:0,onlyInternational:false}).length,3);
assert.equal(findMatches(data,{now:0})[0].minutes,60);
assert.equal(findMatches(data,{now:0})[0].studentCount,18);
console.log('MATCHING TESTS PASSED (UTC, DST, overnight, overlap, countries, rooms)');
