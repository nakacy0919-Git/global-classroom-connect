import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTeacherWorkspaceSnapshotV230} from '../src/lib/teacherWorkspaceRefreshV230.js';
const ok=()=>Promise.resolve([]);
test('successful refresh returns all four resource arrays',async()=>{
 const result=await loadTeacherWorkspaceSnapshotV230({
  sessions:()=>[{id:'own'}],requests:ok,publicEvents:ok,notifications:ok
 });
 assert.equal(result.offers[0].id,'own');
 assert.deepEqual(result.warnings,[]);
});
test('failed public events and notifications never erase owned sessions or cached panels',async()=>{
 const old={hostEvents:[{id:'prior-public'}],notifications:[{id:'old-alert'}]};
 const result=await loadTeacherWorkspaceSnapshotV230({
  sessions:async()=>[{id:'new-session',is_mine:true}],
  requests:async()=>[{id:'application'}],
  publicEvents:async()=>{throw Error('public RPC unavailable');},
  notifications:async()=>{throw Error('inbox RPC unavailable');}
 },old);
 assert.deepEqual(result.offers.map(v=>v.id),['new-session']);
 assert.deepEqual(result.hostEvents,old.hostEvents);
 assert.deepEqual(result.notifications,old.notifications);
 assert.deepEqual(result.warnings,['public host sessions','notifications']);
});
test('a failed primary session read is actionable and must not display an empty fake list',async()=>{
 await assert.rejects(loadTeacherWorkspaceSnapshotV230({
  sessions:async()=>{throw Error('teacher auth expired');},
  requests:ok,publicEvents:ok,notifications:ok
 }),/Could not load your sessions: teacher auth expired/);
});
