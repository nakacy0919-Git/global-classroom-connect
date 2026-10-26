import test from 'node:test';
import assert from 'node:assert/strict';
import {packRoomDraft} from '../src/lib/roomDraftV91.js';
import {mergeSavedRoomDraftV129} from '../src/lib/roomIncrementalV129.js';
import fs from 'node:fs';

const students=[
 {id:'jp1',name:'Aiko',countryCode:'JP',schoolKey:'JP::showa'},
 {id:'jp2',name:'Haruto',countryCode:'JP',schoolKey:'JP::showa'},
 {id:'ph1',name:'Maria',countryCode:'PH',schoolKey:'PH::cebu'},
 {id:'lk1',name:'Nimal',countryCode:'LK',schoolKey:'LK::colombo'},
];
const oldFac=[{id:'f1',name:'Teacher A'}, {id:'f2',name:'Teacher B'}];
const rooms=[
 {number:1,name:'Room 01',students:students.slice(0,2),facilitators:[oldFac[0]]},
 {number:2,name:'Room 02',students:students.slice(2),facilitators:[null]},
];
const prefs={rooms:2,facilitatorsPerRoom:1,countryMode:'strong',schoolMode:'prefer'};
const original=packRoomDraft(rooms,prefs);
const additions=[
 {id:'id1',name:'Made',countryCode:'ID',schoolKey:'ID::jakarta'},
 {id:'id2',name:'Putri',countryCode:'ID',schoolKey:'ID::jakarta'},
];

test('new Indonesian participants join existing rooms without moving fixed Japanese pair',()=>{
 const merged=mergeSavedRoomDraftV129(original,[...students,...additions],[...oldFac]);
 assert.deepEqual(merged.rooms[0].students.slice(0,2).map(s=>s.id),['jp1','jp2']);
 assert.deepEqual(merged.rooms[1].students.slice(0,2).map(s=>s.id),['ph1','lk1']);
 assert.equal(merged.addedStudents,2);
 const ids=merged.rooms.flatMap(r=>r.students.map(s=>s.id));
 assert.equal(new Set(ids).size,6);assert.deepEqual(ids.sort(),[...students,...additions].map(s=>s.id).sort());
 assert.equal(merged.rooms[0].facilitators[0].id,'f1');
 assert.equal(JSON.stringify(original).includes('id1'),false);
});
test('same roster remains unchanged with no dirty additions',()=>{
 const merged=mergeSavedRoomDraftV129(original,students,oldFac);
 assert.equal(merged.addedStudents,0);
 assert.deepEqual(merged.rooms.map(r=>r.students.map(s=>s.id)),rooms.map(r=>r.students.map(s=>s.id)));
});
test('extra facilitator fills only an empty existing slot',()=>{
 const extra={id:'f3',name:'Teacher C'};
 const merged=mergeSavedRoomDraftV129(original,students,[...oldFac,extra]);
 assert.equal(merged.addedFacilitators,1);
 assert.equal(merged.rooms[0].facilitators[0].id,'f1');
 assert.equal(merged.rooms[1].facilitators[0].id,'f2');
});
test('removed saved student is blocked, never silently omitted',()=>{
 assert.throws(()=>mergeSavedRoomDraftV129(original,students.slice(1),oldFac),/no longer approved|changed/);
});
test('removed assigned facilitator is blocked',()=>{
 assert.throws(()=>mergeSavedRoomDraftV129(original,students,[]),/facilitator|approved/);
});
test('duplicate incoming ID is blocked before any room change',()=>{
 assert.throws(()=>mergeSavedRoomDraftV129(original,[...students,students[0]],oldFac),/duplicate/);
});
test('new students and international mixing are deterministic',()=>{
 const roster=[...students,...additions];
 const a=mergeSavedRoomDraftV129(original,roster,oldFac);
 const b=mergeSavedRoomDraftV129(original,[...roster].reverse(),oldFac);
 assert.deepEqual(a.rooms.map(r=>r.students.map(s=>s.id)),b.rooms.map(r=>r.students.map(s=>s.id)));
});
test('saved-session UI cannot generate or reshuffle everybody',()=>{
 const ui=fs.readFileSync(new URL('../src/components/RoomPlannerV9.js',import.meta.url),'utf8');
 assert.match(ui,/if\(!savedMeta\)\{const remix=/);
 assert.match(ui,/if\(savedMeta\|\|checkingSaved\|\|loadError\)/);
 assert.match(ui,/return;\/\/|return;\n?\s*\}/);
 assert.match(ui,/mergeSavedRoomDraftV129/);
 assert.match(ui,/checkingSaved=false/);
});
