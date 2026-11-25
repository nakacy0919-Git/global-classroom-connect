import test from 'node:test';import assert from 'node:assert/strict';import {operationsHashV248,operationsParamsV248,parseRosterV248,rosterTextV248} from '../src/lib/teacherOperationsV248.js';
const id='30000000-0000-0000-0000-000000000001';
test('session links preserve only validated identifiers and known tab',()=>{
 assert.deepEqual(operationsParamsV248(operationsHashV248(id,'chart')),{id,tab:'chart'});
 assert.deepEqual(operationsParamsV248('#/teacher-access?next=operate&offer='+id),{id,tab:'register'});
 assert.equal(operationsParamsV248('#/teacher-portal?view=operate&offer=bad'),null);
 assert.throws(()=>operationsHashV248('https://evil.example'));
});
test('student roster parser retains display names and optional grade without exceeding allocation',()=>{
 const list=parseRosterV248('  Alex\t10\n\n  山田  \n',2);
 assert.deepEqual(list,[{name:'Alex',grade:'10'},{name:'山田',grade:''}]);
 assert.deepEqual(parseRosterV248(rosterTextV248(list),2),list);
 assert.throws(()=>parseRosterV248('a\nb',1));
 assert.throws(()=>parseRosterV248('a\tb\tc',2));
});
