import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSearchWindow,filterSessionOffers} from '../src/lib/sessionSearch.js';

const teacher=[{id:'t1',display_name:'Sample Teacher',schools:{name:'Example School',country_name:'Japan'}}];
const data=[
 {id:'1',teacher_id:'t1',status:'open',country_code:'JP',age_band:'Upper Secondary',topic:'Food',starts_at:'2026-10-20T00:00:00.000Z',ends_at:'2026-10-20T01:00:00.000Z'},
 {id:'2',teacher_id:'t2',status:'open',country_code:'PH',age_band:'Primary',topic:'Science',starts_at:'2026-10-21T00:00:00.000Z',ends_at:'2026-10-21T01:00:00.000Z'},
 {id:'3',teacher_id:'t3',status:'closed',country_code:'FR',age_band:'Primary',topic:'Arts',starts_at:'2026-10-20T00:00:00.000Z',ends_at:'2026-10-20T02:00:00.000Z'}
];
const now=Date.parse('2026-10-15T00:00:00Z');
test('Tokyo morning finds same UTC morning',()=>{
 const w=buildSearchWindow({date:'2026-10-20',startTime:'09:00',endTime:'11:00',timezone:'Asia/Tokyo'});
 assert.equal(w.from,'2026-10-20T00:00:00.000Z');
 assert.equal(w.to,'2026-10-20T02:00:00.000Z');
 assert.deepEqual(filterSessionOffers(data,{...w,now},teacher).map(x=>x.id),['1']);
});
test('country and topic are optional filters',()=>{
 assert.deepEqual(filterSessionOffers(data,{country:'PH',now},teacher).map(x=>x.id),['2']);
 assert.deepEqual(filterSessionOffers(data,{query:'example school',now},teacher).map(x=>x.id),['1']);
 assert.deepEqual(filterSessionOffers(data,{level:'Primary',now},teacher).map(x=>x.id),['2']);
});
test('local midnight rollover',()=>{
 const w=buildSearchWindow({date:'2026-10-20',startTime:'23:00',endTime:'01:00',timezone:'Asia/Tokyo'});
 assert.equal(w.from,'2026-10-20T14:00:00.000Z');
 assert.equal(w.to,'2026-10-20T16:00:00.000Z');
});
test('DST nonexistent local time is rejected',()=>{
 assert.ok(buildSearchWindow({date:'2026-03-08',startTime:'02:30',endTime:'04:00',timezone:'America/New_York'}).error);
});
test('date not chosen shows all future open offers',()=>{
 const w=buildSearchWindow({date:'',timezone:'Asia/Tokyo'});
 assert.equal(w.from,null);
 assert.equal(filterSessionOffers(data,{...w,now},teacher).length,2);
});
