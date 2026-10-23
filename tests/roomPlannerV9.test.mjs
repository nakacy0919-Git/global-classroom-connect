import test from 'node:test';
import assert from 'node:assert/strict';
import {collectApproved,buildRoomDraft,moveStudent,setFacilitator,roomStatistics,exportRoomCSV} from '../src/lib/roomPlannerV9.js';
const signups=[
  {id:'a',status:'approved',school_name:'Tokyo HS',country_code:'JP',country_name:'Japan',students:[{id:'1',name:'Aiko Mori',grade:'10'},{id:'2',name:'Ken Tanaka'}],facilitators:['Mika Ito']},
  {id:'b',status:'approved',school_name:'Cebu HS',country_code:'PH',country_name:'Philippines',students:[{id:'3',name:'Maria Cruz'},{id:'4',name:'Ana Reyes'}],facilitators:['Juan Dela Cruz']},
  {id:'c',status:'pending',school_name:'Unconfirmed',country_code:'US',country_name:'United States',students:[{id:'5',name:'Unapproved Student'}],facilitators:['Not Confirmed']}
];
const rand=()=>0.32;
test('Only approved rosters and facilitators are used',()=>{
 const a=collectApproved(signups);assert.equal(a.students.length,4);assert.equal(a.facilitators.length,2);assert.equal(a.students[0].schoolKey,'JP::tokyo hs');
});
test('Exactly requested room count and no missing or duplicate students',()=>{
 const a=collectApproved(signups),r=buildRoomDraft(a.students,a.facilitators,{rooms:2,facilitatorsPerRoom:1},rand);
 assert.equal(r.length,2);assert.deepEqual(r.map(x=>x.students.length),[2,2]);assert.equal(roomStatistics(r).uniqueStudents,4);
});
test('Prioritizes two nationalities across two rooms when possible',()=>{
 const a=collectApproved(signups),r=buildRoomDraft(a.students,a.facilitators,{rooms:2,facilitatorsPerRoom:1,countryMode:'strong',schoolMode:'prefer'},rand);
 assert.deepEqual(r.map(x=>new Set(x.students.map(s=>s.countryCode)).size),[2,2]);
});
test('Supports ignore country/school, and accepts empty rooms',()=>{
 const a=collectApproved(signups),r=buildRoomDraft(a.students,a.facilitators,{rooms:6,facilitatorsPerRoom:0,countryMode:'ignore',schoolMode:'ignore'},rand);
 assert.equal(roomStatistics(r).emptyRooms,2);
});
test('Moving a student keeps their identity exactly once',()=>{
 const a=collectApproved(signups),r=buildRoomDraft(a.students,a.facilitators,{rooms:2,facilitatorsPerRoom:2},rand);
 moveStudent(r,'1',2);assert.equal(r[1].students.filter(p=>p.id==='1').length,1);assert.equal(roomStatistics(r).uniqueStudents,4);
});
test('Facilitator slots can be changed without double booking',()=>{
 const a=collectApproved(signups),r=buildRoomDraft(a.students,a.facilitators,{rooms:2,facilitatorsPerRoom:2},rand);
 setFacilitator(r,2,1,a.facilitators[0].id,a.facilitators);
 assert.equal(r.flatMap(x=>x.facilitators).filter(f=>f?.id===a.facilitators[0].id).length,1);
 assert.equal(r[1].facilitators[1].name,'Mika Ito');
});
test('CSV safely quotes commas and includes both roles with UTF-8 BOM',()=>{
 const a=collectApproved(signups);a.students[0].name='Mori, Aiko';
 const r=buildRoomDraft(a.students,a.facilitators,{rooms:2,facilitatorsPerRoom:2},rand);
 const csv=exportRoomCSV('Food, Culture',r);
 assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/"Food, Culture"/);assert.match(csv,/"Mori, Aiko"/);assert.match(csv,/Facilitator/);
});
test('Bad settings rejected',()=>{
 const a=collectApproved(signups);
 assert.throws(()=>buildRoomDraft(a.students,a.facilitators,{rooms:0},rand));
 assert.throws(()=>buildRoomDraft(a.students,a.facilitators,{rooms:1,facilitatorsPerRoom:3},rand));
 assert.throws(()=>buildRoomDraft([],a.facilitators,{rooms:1},rand));
});
