import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleRequesters,requestForPair,canDecideRequest,requestCounts} from '../src/lib/joinRequestRules.js';
const t=(id,country)=>({id,display_name:id,schools:{name:`School ${id}`,country_code:country}});
test('host teacher cannot request own session',()=>{
 assert.deepEqual(eligibleRequesters([t('a','JP'),t('b','PH')],{teacher_id:'a'}).map(x=>x.id),['b']);
});
test('teachers without a valid school are not selectable',()=>{
 assert.equal(eligibleRequesters([t('a','JP'),{id:'c',schools:null}],{teacher_id:'a'}).length,0);
});
test('request lookup is scoped by both offer and teacher',()=>{
 assert.equal(requestForPair([{offer_id:'1',requesting_teacher_id:'b',status:'pending'}],'1','b').status,'pending');
 assert.equal(requestForPair([{offer_id:'1',requesting_teacher_id:'b'}],'2','b'),null);
});
test('pending requests only can be reviewed',()=>{
 assert.equal(canDecideRequest({status:'pending'}),true);
 assert.equal(canDecideRequest({status:'approved'}),false);
 assert.equal(canDecideRequest({status:'declined'}),false);
});
test('counts each request state',()=>{
 assert.deepEqual(requestCounts([{status:'pending'},{status:'approved'},{status:'pending'},{status:'declined'}]),{total:4,pending:2,approved:1,declined:1});
});
