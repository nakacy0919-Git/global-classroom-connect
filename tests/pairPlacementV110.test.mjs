import test from 'node:test';
import assert from 'node:assert/strict';
import {sortUnpairedV110,roomCandidatesV110,formatPlacementV110} from '../src/lib/roomPlacementV110.js';
const roster=[
 {id:'k',name:'Keita',room:1},{id:'a',name:'Airi',room:2},
 {id:'s',name:'Sosuke',room:1},{id:'m',name:'Miku',room:5},
 {id:'z',name:'Zoe',room:4}
];
test('alphabetizes English names, not assigned room order',()=>{
 assert.deepEqual(sortUnpairedV110(roster,[]).map(x=>x.name),['Airi','Keita','Miku','Sosuke','Zoe']);
});
test('excludes both already locked pupils but keeps them in the room-move mode',()=>{
 assert.deepEqual(sortUnpairedV110(roster,[{a:'k',b:'s'}]).map(x=>x.name),['Airi','Miku','Zoe']);
 assert.equal(sortUnpairedV110(roster,[]).length,5);
});
const roomStats=[
 {room:1,total:3,school_students:2},
 {room:2,total:2,school_students:0},
 {room:3,total:4,school_students:2},
 {room:4,total:1,school_students:0},
 {room:5,total:5,school_students:4}
];
test('recommends international rooms without disabling manual options',()=>{
 const result=roomCandidatesV110({roomStats,students:[{id:'k',room:1},{id:'m',room:5}],ownTotal:8});
 assert.equal(result[0].room,4);
 assert.equal(result.find(x=>x.room===3).allowed,true);
 assert.equal(result.find(x=>x.room===5).allowed,true);
 assert.equal(result.find(x=>x.room===3).warning,true);
 assert.ok(formatPlacementV110(result.find(x=>x.room===3)).includes('manual move allowed'));
});
test('subtracts both moving students from original rooms by authoritative room counts',()=>{
 const result=roomCandidatesV110({roomStats,students:[{id:'k',room:1},{id:'s',room:1}],ownTotal:8});
 assert.equal(result.find(x=>x.room===1).own,0);
 assert.equal(result.find(x=>x.room===1).total,1);
 assert.equal(result.find(x=>x.room===1).allowed,true);
});
test('keeps choices deterministic on repeated evaluation',()=>{
 const input={roomStats,students:[{id:'a',room:2},{id:'s',room:1}],ownTotal:8};
 assert.deepEqual(roomCandidatesV110(input),roomCandidatesV110(input));
});
