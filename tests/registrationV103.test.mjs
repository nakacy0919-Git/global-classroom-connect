import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSimpleRoster} from '../src/lib/simpleRoster.js';
test('accepts teacher friendly Grade notation',()=>{
 const r=parseSimpleRoster('Ana Sample (Grade 11)\nLeo Sample (Grade 11)');
 assert.deepEqual(r.errors,[]);
 assert.deepEqual(r.records,[{name:'Ana Sample',grade:'11'},{name:'Leo Sample',grade:'11'}]);
});
test('retains tab pasted spreadsheet and invalid names rejected',()=>{
 assert.deepEqual(parseSimpleRoster('Ana Sample\t11').records,[{name:'Ana Sample',grade:'11'}]);
 assert.equal(parseSimpleRoster('田中 太郎 (Grade 11)').errors.length,1);
});
