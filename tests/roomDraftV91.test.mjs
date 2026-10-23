import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {packRoomDraft,unpackRoomDraft} from '../src/lib/roomDraftV91.js';
const students=[
 {id:'id1',name:'Aiko Mori',school:'Sakura',country:'Japan'},
 {id:'id2',name:'Ana Reyes',school:'Cebu',country:'Philippines'},
];
const facilitators=[{id:'f1',name:'Mika Ito',school:'Sakura'}];
const prefs={rooms:2,facilitatorsPerRoom:1,countryMode:'strong',schoolMode:'prefer'};
const rooms=[
 {number:1,name:'Room 01',students:[students[0]],facilitators:[facilitators[0]]},
 {number:2,name:'Room 02',students:[students[1]],facilitators:[null]},
];
test('Draft stores only identifiers and choices, not copied student names',()=>{
 const packed=packRoomDraft(rooms,prefs);
 assert.deepEqual(packed.rooms[0],{number:1,students:['id1'],facilitators:['f1']});
 assert.doesNotMatch(JSON.stringify(packed),/Aiko|Ana|Mika|Cebu/);
 assert.equal(packed.version,1);
});
test('Saved drafts restore latest corrected student names',()=>{
 const packed=packRoomDraft(rooms,prefs);
 const fresh=students.map(s=>({...s,name:s.name+' Corrected'}));
 const loaded=unpackRoomDraft(packed,fresh,facilitators);
 assert.equal(loaded.rooms[0].students[0].name,'Aiko Mori Corrected');
 assert.deepEqual(loaded.prefs,prefs);
});
test('Newly approved students must not be silently excluded from an old plan',()=>{
 const packed=packRoomDraft(rooms,prefs);
 assert.throws(()=>unpackRoomDraft(packed,[...students,{id:'id3',name:'New Student'}],facilitators),/changed/);
});
test('Removed approved students and removed facilitators invalidate a draft',()=>{
 const packed=packRoomDraft(rooms,prefs);
 assert.throws(()=>unpackRoomDraft(packed,students.slice(0,1),facilitators),/no longer approved/);
 assert.throws(()=>unpackRoomDraft(packed,students,[]),/facilitator|approved/);
});
test('Duplicate student IDs and duplicate facilitator assignments are rejected',()=>{
 assert.throws(()=>packRoomDraft([{...rooms[0],students:[students[0],students[0]]},rooms[1]],prefs),/Duplicate/);
 assert.throws(()=>packRoomDraft([{...rooms[0]},{...rooms[1],facilitators:[facilitators[0]]}],prefs),/more than once/);
});
test('Protected host RPC only; no public table reads or plan publication',()=>{
 const service=readFileSync(new URL('../src/services/roomDraftV91.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/components/RoomPlannerV9.js',import.meta.url),'utf8');
 assert.match(service,/gcc_v91_load_room_draft/);assert.match(service,/gcc_v91_save_room_draft/);
 assert.doesNotMatch(service,/\.from\(/);
 assert.match(ui,/Continue saved plan/);assert.match(ui,/Save arrangement/);
 assert.match(ui,/SAVED DRAFT/);assert.match(ui,/SAMPLE PREVIEW/);
});
