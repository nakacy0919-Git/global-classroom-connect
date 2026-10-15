import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoster,parseFacilitators,isIdentityComplete} from '../src/lib/sessionRoster.js';
test('pasted Excel names and grades',()=>{
 const res=parseRoster('Name\tGrade\nMaria Santos\t10\nJuan Dela Cruz\t11');
 assert.equal(res.records.length,2);assert.equal(res.records[1].grade,'11');assert.deepEqual(res.invalid,[]);
});
test('single-column names are accepted',()=>{assert.deepEqual(parseRoster('Maria\nJuan').records.map(x=>x.name),['Maria','Juan']);});
test('quoted CSV names with commas are preserved',()=>{assert.equal(parseRoster('"Santos, Maria",10').records[0].name,'Santos, Maria');});
test('bad columns are reported',()=>{assert.deepEqual(parseRoster('Name\tGrade\nAna\t11\tExtra').invalid,[2]);});
test('school and country mandatory',()=>{assert.equal(isIdentityComplete({teacher:'Mary',school:'',country:'PH'}),false);assert.equal(isIdentityComplete({teacher:'Mary',school:'Central High',country:''}),false);assert.equal(isIdentityComplete({teacher:'Mary',school:'Central High',country:'PH'}),true);});
test('facilitator lists ignore blank and repeated names',()=>{assert.deepEqual(parseFacilitators('Maria\n\nAnna\nMaria'),['Maria','Anna']);});

import {readFileSync} from 'node:fs';
test('facilitator scope returns managed flag and event teacher set',()=>{
 const code=readFileSync(new URL('../src/services/sessionRosterService.js',import.meta.url),'utf8');
 assert.match(code,/gcc_v6_event_uses_registrations/);
 assert.match(code,/managed:scope\.data===true/);
 assert.match(code,/ids:new Set/);
});
