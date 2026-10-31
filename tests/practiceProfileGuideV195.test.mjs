import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {missingPracticeProfileFields, practiceProfileFieldInfo} from '../src/lib/practiceProfileGuideV195.js';
const page=readFileSync(new URL('../src/pages/public/PracticePageV170.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/practiceProfileGuideV195.css',import.meta.url),'utf8');

test('hobby is required only when referenced; blank and whitespace both count as missing',()=>{
 assert.deepEqual(missingPracticeProfileFields('One of my hobbies is {hobby}.',{}),['hobby']);
 assert.deepEqual(missingPracticeProfileFields('One of my hobbies is {hobby}.',{hobby:'  '}),['hobby']);
 assert.deepEqual(missingPracticeProfileFields('One of my hobbies is {hobby}.',{hobby:'playing soccer'}),[]);
 assert.deepEqual(missingPracticeProfileFields('Can you hear me?',{}),[]);
});
test('only necessary fields appear, in phrase order and without duplication',()=>{
 assert.deepEqual(missingPracticeProfileFields('I am {name} from {school}. Meet {name}. My hobby is {hobby}.',{school:'Aichi High School'}),['name','hobby']);
 assert.deepEqual(missingPracticeProfileFields('I live in {hometown} and my school has {schoolDescription}.',{}),['hometown','schoolDescription']);
 assert.deepEqual(missingPracticeProfileFields('I am {name}.',{name:'Sara'}),[]);
});
test('field specifications agree with existing GCC profile input IDs and have guided labels',()=>{
 for(const field of ['name','school','hobby','hometown','schoolDescription']){
   const info=practiceProfileFieldInfo(field);
   assert.ok(info?.label&&info?.prompt&&info?.ja&&info?.maxLength);
   assert.ok(page.includes(`id="gcc170-${field}"`));
 }
});
test('speaking dialog prompts for missing fields and saves to existing profile',()=>{
 assert.match(page,/gcc195-profile-guide/);
 assert.match(page,/syncPracticeProfileGuide\(\)/);
 assert.match(page,/missingPracticeProfileFields\(item\.text,state\.profile\)/);
 assert.match(page,/state\.profile\[field\]=value/);
 assert.match(page,/\$\('start'\)\.disabled=true/);
 assert.match(page,/\$\('listen'\)\.disabled=Boolean\(field\)/);
 assert.match(page,/save\(\);paintItem\(\);paintPreview\(\)/);
});
test('mission remains intact and guide is scoped to speaking dialog',()=>{
 assert.match(page,/practiceMissionV194\.css/);
 assert.match(page,/function renderMission/);
 assert.match(page,/scorePracticePhrase\(item\.text,text,state\.profile\)/);
 assert.match(css,/\.gcc195-profile-guide\[hidden\]/);
 assert.match(css,/.gcc195-profile-guide-controls/); // responsive compact inline form
});
