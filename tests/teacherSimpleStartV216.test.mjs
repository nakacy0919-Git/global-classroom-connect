import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SESSION_STARTERS_V216,sessionStarterV216} from '../src/lib/sessionStartersV216.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('starter templates are small, selectable, valid and never set private scheduling fields',()=>{
 assert.deepEqual(SESSION_STARTERS_V216.map(s=>s.id),['culture','language','sdgs']);
 for(const starter of SESSION_STARTERS_V216){
  assert.equal(sessionStarterV216(starter.id),starter);
  assert.ok(starter.title.length>=3&&starter.title.length<=120);
  assert.ok(['Cultural Exchange','Language Exchange','SDGs'].includes(starter.theme));
  assert.ok(starter.topic.length>0&&starter.topic.length<=90);
  for(const forbidden of ['starts_at','ends_at','timezone','students','capacity','school','publish'])assert.equal(starter[forbidden],undefined);
 }
 assert.equal(sessionStarterV216('invalid'),null);
});

test('teacher entry explains two goals and preserves approved-teacher gating',()=>{
 const p=read('src/pages/teacher/TeacherPortalPage.js');
 assert.match(p,/Find a Partner/);
 assert.match(p,/Create a Session/);
 assert.match(p,/data-gctp-starter=/);
 assert.match(p,/sessionStarterV216\(button\.dataset\.gctpStarter\)/);
 assert.match(p,/scheduleDraft\(\)/);
 assert.match(p,/teacherCreateSession\(slot,data\)/);
 assert.match(p,/teacherIdentity\(\)/);
});

test('Find Partner stays independent of Create Session even when search is empty',()=>{
 const p=read('src/pages/teacher/TeacherPortalPage.js');
 const find=p.split('data-gct-view="find" hidden>')[1]?.split('data-gct-view="requests" hidden>')[0];
 assert.ok(find,'Find Partner section exists');
 assert.doesNotMatch(find,/view=create|Create a Session|Host a Session/);
 const empty=p.slice(p.indexOf('if(!page.total)'),p.indexOf('const previously=new Map'));
 assert.match(empty,/No sessions match your search/);
 assert.match(empty,/gcv216-empty-actions/);
 assert.doesNotMatch(empty,/view=create|Create a Session/);
 assert.match(p,/gctp-reset-filters/);
 assert.match(p,/teacherApply\(o\.id,message\.value\.trim\(\),number\)/);
 assert.doesNotMatch(p,/mountTeacherMessagesV214/);
});
