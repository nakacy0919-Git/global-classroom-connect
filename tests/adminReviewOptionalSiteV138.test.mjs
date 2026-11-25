import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const admin=read('src/pages/host/TeacherApprovalsV120.js');
const join=read('src/pages/teacher/TeacherJoinV120.js');

test('admin requires official school website before approving',()=>{
 assert.match(admin,/Official school website is missing or invalid/);
 assert.match(admin,/I verified the official school website and school affiliation/);
 assert.doesNotMatch(admin,/I verified the school website and application details/);
 assert.match(admin,/\[a\.city,a\.region,a\.country\]\.filter\(Boolean\)\.join\(', '\)/);
});

test('approval still requires both teacher photograph and school verification checks',()=>{
 assert.match(admin,/!faceBox\.checked\|\|!schoolBox\.checked/);
 assert.match(admin,/review\(a\.id,decision,grantHost,school\)/);
 assert.match(admin,/if\(grantHost&&!confirm/);
});

test('personal website and region remain optional; school website required',()=>{
 assert.match(join,/id="gcc120-school-web"[^>]*required/);
 for(const id of ['gcc120-website','gcc120-region']){
  const match=join.match(new RegExp('<input id="'+id+'"[^>]*>'));
  assert.ok(match,id);
  assert.doesNotMatch(match[0],/\srequired(?:\s|>)/);
 }
});
