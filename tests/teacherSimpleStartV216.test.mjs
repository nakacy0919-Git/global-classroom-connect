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

test('empty search offers a safe path to create with unchanged approval rules',()=>{
 const p=read('src/pages/teacher/TeacherPortalPage.js');
 assert.match(p,/gcv216-empty-actions/);
 assert.match(p,/No sessions match your search/);
 assert.match(p,/#\/teacher-portal\?view=create/);
 assert.match(p,/gctp-reset-filters/);
 assert.match(p,/teacherApply\(o\.id,message\.value\.trim\(\),number\)/);
 assert.doesNotMatch(p,/mountTeacherMessagesV214/);
});
