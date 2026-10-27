import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const admin=read('src/pages/host/TeacherApprovalsV120.js');
const join=read('src/pages/teacher/TeacherJoinV120.js');

test('admin verification no longer requires the school to have a website',()=>{
 assert.match(admin,/Teachers without websites may still be approved/);
 assert.match(admin,/I verified the school information and any website provided \(if available\)/);
 assert.doesNotMatch(admin,/I verified the school website and application details/);
 assert.match(admin,/\[a\.city,a\.region,a\.country\]\.filter\(Boolean\)\.join\(', '\)/);
});

test('approval still requires both teacher photograph and school verification checks',()=>{
 assert.match(admin,/!faceBox\.checked\|\|!schoolBox\.checked/);
 assert.match(admin,/reviewApplicationV120\(a\.id,decision,grantHost,school\)/);
 assert.match(admin,/if\(grantHost&&!confirm/);
});

test('signup optional website fields remain optional and secure',()=>{
 for(const id of ['gcc120-website','gcc120-school-web','gcc120-region']){
  const match=join.match(new RegExp('<input id="'+id+'"[^>]*>'));
  assert.ok(match,id);
  assert.doesNotMatch(match[0],/\srequired(?:\s|>)/);
 }
});
