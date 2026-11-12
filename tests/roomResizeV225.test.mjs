import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resizeRoomPlanV225} from '../src/lib/roomResizeV225.js';
import {packRoomDraft,unpackRoomDraft} from '../src/lib/roomDraftV91.js';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const st = (id,schoolKey='JP::school') => ({id,name:id,schoolKey,countryCode:schoolKey.slice(0,2),school:schoolKey});
const fac = id => ({id,name:id});
const make = (...groups) => groups.map((students,i)=>({
  number:i+1,name:'Room '+String(i+1).padStart(2,'0'),
  students:students.map(id=>typeof id==='string'?st(id):id),
  facilitators:[i===0?fac('f1'):null],
}));
const prefs = {rooms:2,facilitatorsPerRoom:1,countryMode:'prefer',schoolMode:'prefer'};
const ids=rooms=>rooms.flatMap(r=>r.students.map(s=>s.id)).sort();

test('increase after issuance: minimal movement, all student IDs retained and original plan untouched',()=>{
  const original=make(['a','b','c','d'],['e','f','g','h']);
  const snapshot=JSON.stringify(original);
  const result=resizeRoomPlanV225(original,3,[],[fac('f2'),fac('f3')]);
  assert.equal(result.rooms.length,3);
  assert.equal(result.rooms[2].number,3);
  assert.equal(result.rooms[2].students.length>0,true);
  assert.deepEqual(ids(result.rooms),ids(original));
  assert.ok(result.movedStudents>0 && result.movedStudents<original.flatMap(r=>r.students).length);
  assert.equal(JSON.stringify(original),snapshot);
  assert.equal(result.rooms[0].facilitators[0].id,'f1');
  assert.equal(new Set(result.rooms.flatMap(r=>r.facilitators.filter(Boolean).map(f=>f.id))).size,3);
  const draft=packRoomDraft(result.rooms,{...prefs,rooms:3});
  assert.equal(unpackRoomDraft(draft,result.rooms.flatMap(r=>r.students),result.rooms.flatMap(r=>r.facilitators.filter(Boolean))).rooms.length,3);
});
test('decreasing only reassigns rooms that are removed, preserving retained allocations',()=>{
  const original=make(['a','b'],['c','d'],['e','f'],['g','h']);
  const result=resizeRoomPlanV225(original,2,[],[fac('f2')]);
  assert.equal(result.rooms.length,2);
  assert.ok(result.rooms[0].students.some(s=>s.id==='a'));
  assert.ok(result.rooms[1].students.some(s=>s.id==='d'));
  assert.deepEqual(ids(result.rooms),ids(original));
  assert.equal(result.movedStudents,4);
});
test('locked pairs are never split when expanding or shrinking',()=>{
  const original=make(['a','b','c','d'],['e','f','g','h'],['i','j','k','l']);
  const pairs=[{a:'a',b:'b'},{a:'i',b:'j'},{a:'k',b:'l'}];
  for(const count of [1,2,4,6]){
    const result=resizeRoomPlanV225(original,count,pairs);
    const where=id=>result.rooms.find(r=>r.students.some(s=>s.id===id))?.number;
    for(const pair of pairs)assert.equal(where(pair.a),where(pair.b),count+' rooms separated '+pair.a);
    assert.deepEqual(ids(result.rooms),ids(original));
  }
});
test('impossible to split a two-person pair just to fill a new room',()=>{
  const original=make(['a','b'],['c','d']);
  const r=resizeRoomPlanV225(original,3,[{a:'a',b:'b'},{a:'c',b:'d'}]);
  assert.equal(r.emptyRooms,1);
  assert.equal(r.movedStudents,0);
});
test('invalid room counts, missing or split pairs, duplicate students rejected',()=>{
  const original=make(['a','b'],['c','d']);
  for(const count of [0,61,2.5,'no']) assert.throws(()=>resizeRoomPlanV225(original,count),/between 1 and 60/);
  assert.throws(()=>resizeRoomPlanV225(original,3,[{a:'a',b:'absent'}]),/missing or duplicated/);
  assert.throws(()=>resizeRoomPlanV225(original,3,[{a:'a',b:'c'}]),/different rooms/);
  assert.throws(()=>resizeRoomPlanV225(make(['a','a'],['c']),3),/duplicated/);
});
test('protected atomic resize saves draft and synchronizes shared revisions without changing credentials',()=>{
  const sql=read('supabase/migrations/20261112_gcc_v225_resize_published_rooms.sql');
  assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
  assert.match(sql,/FOR UPDATE/);
  assert.match(sql,/public\.gcc_v91_save_room_draft\(p_event_id, p_draft, p_expected_revision\)/);
  assert.match(sql,/SET breakout_rooms = p_target_rooms/);
  assert.match(sql,/SET revision = v_revision, published_at = now\(\), published_by = auth\.uid\(\)/);
  assert.match(sql,/SET revision = v_revision\s+WHERE event_id = p_event_id AND publication_hash = v_hash/);
  assert.doesNotMatch(sql,/SET\s+token_hash\s*=/);
  assert.doesNotMatch(sql,/SET\s+code_hash\s*=/);
  assert.doesNotMatch(sql,/SET\s+zoom_url\s*=/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v225_resize_room_plan\(uuid,integer,jsonb,integer\) TO authenticated/);
  assert.doesNotMatch(sql,/TO anon\s*;/);
});
test('saved-plan host controls are visible after a permanent code exists',()=>{
  const ui=read('src/components/RoomPlannerV9.js');
  const host=read('src/pages/host/SimpleSessionsPage.js');
  const service=read('src/services/roomResizeV225.js');
  assert.match(ui,/Change room count/);
  assert.match(ui,/getLockedRoomPairsV225\(event.id\)/);
  assert.match(ui,/saveResizedRoomPlanV225\(event.id,revision,payload,newCount\)/);
  assert.match(ui,/packRoomDraft\(resized.rooms,newPrefs\)/);
  assert.match(host,/Change room count in Rooms/);
  assert.match(service,/gcc_v225_resize_room_plan/);
});
