import test from 'node:test';
import assert from 'node:assert/strict';
import {sortUnpairedV110,roomCandidatesV110,formatPlacementV110} from '../src/lib/roomPlacementV110.js';
import {boardRowsV111,moveWarningsV111} from '../src/lib/roomDragV111.js';
const people=[{id:'a',name:'Airi',room:1},{id:'b',name:'Sosuke',room:2},{id:'c',name:'Kana',room:3},{id:'d',name:'Rinto',room:1}];
const pairs=[{a:'a',b:'b'}];
const stats=[{room:1,total:7,school_students:4},{room:2,total:6,school_students:3},{room:3,total:2,school_students:0}];
test('every room remains selectable even when already crowded',()=>{
 const rooms=roomCandidatesV110({roomStats:stats,students:[people[2]],ownTotal:4});
 assert.equal(rooms.length,3);
 assert.ok(rooms.every(r=>r.allowed));
 assert.ok(rooms.some(r=>r.warning));
 assert.ok(rooms.every(r=>!formatPlacementV110(r).includes('NOT ALLOWED')));
});
test('available safe rooms are recommended before busy destinations',()=>{
 const rooms=roomCandidatesV110({roomStats:stats,students:[people[2]],ownTotal:4});
 assert.equal(rooms[0].room,3);
 assert.ok(rooms[0].score<rooms.find(r=>r.room===1).score);
});
test('current room subtraction prevents false crowd warnings',()=>{
 const rooms=roomCandidatesV110({roomStats:stats,students:[people[0],people[3]],ownTotal:4});
 assert.equal(rooms.find(r=>r.room===1).newTotal,7);
});
test('school partners appear as one draggable unit and names sorted',()=>{
 const data={students:people,pairs};
 const rows=boardRowsV111(data);
 assert.equal(rows.filter(x=>x.count===2).length,1);
 assert.equal(rows.length,3);
 assert.ok(rows.some(r=>r.name.includes('Airi')&&r.name.includes('Sosuke')));
});
test('moving fixed pair is accounted for in destination warnings',()=>{
 const data={students:people,pairs,room_stats:stats};
 const to=moveWarningsV111(data,['a','b'],1);
 assert.equal(to.newOwn,5);
 assert.equal(to.warning,true);
});
test('already fixed students remain excluded in pair creation only',()=>{
 assert.deepEqual(sortUnpairedV110(people,pairs).map(p=>p.name),['Kana','Rinto']);
});
