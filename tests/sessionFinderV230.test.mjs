import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teacherIdentityCardV230,showTeacherProfileV230} from '../src/lib/sessionFinderTeacherV230.js';

class FakeNode {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.textContent='';this.open=false;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];this.textContent='';}
 setAttribute(key,value){this.attrs[key]=value;}
 addEventListener(key,fn){this.listeners[key]=fn;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 querySelector(selector){if(selector==='#gcs230-profile')return this.children.find(x=>x.id==='gcs230-profile')||null;return null;}
}
globalThis.document={createElement:tag=>new FakeNode(tag)};
const flatten=n=>String(n.textContent||'')+' '+n.children.map(flatten).join(' ');

test('host teacher is readable and provides a clickable profile control',()=>{
 const o={teacher_name:'Teacher One',school_name:'Partner High School'};
 let picked=false;
 const card=teacherIdentityCardV230(o,null,()=>{picked=true;});
 assert.match(flatten(card),/Partner High School/);
 assert.match(flatten(card),/Teacher One/);
 const button=card.children[1].children[1].children[1];
 assert.equal(button.tag,'button');
 button.listeners.click();
 assert.equal(picked,true);
});
test('a teacher who has not opted into the directory exposes no private profile details',()=>{
 const root=new FakeNode('section');
 showTeacherProfileV230(root,{teacher_name:'Teacher One',school_name:'Partner High School'},null,()=>Promise.resolve(null));
 assert.equal(root.children[0].open,true);
 assert.match(flatten(root.children[0]),/not shared a public GCC profile/);
 assert.doesNotMatch(flatten(root.children[0]),/Languages:/);
});
test('opted-in public profile information renders without exposing emails',()=>{
 const root=new FakeNode('section');
 showTeacherProfileV230(root,{teacher_name:'Teacher One',school_name:'Partner High School'},{
  name:'Teacher One',school:'Partner High School',bio:'We explore cultural exchange.',languages:['English','Japanese'],
  website_url:'https://school.example.org',email:'private@example.org'
 },null);
 const content=flatten(root.children[0]);
 assert.match(content,/We explore cultural exchange/);
 assert.match(content,/Languages: English, Japanese/);
 assert.doesNotMatch(content,/private@example.org/);
});
test('teacher Find a Session preserves current RPCs, adds accessible inline request validation, and shows opt-in profiles',()=>{
 const src=readFileSync(new URL('../src/pages/teacher/TeacherPortalPage.js',import.meta.url),'utf8');
 assert.match(src,/teacherDirectoryV116\(\)\.catch/);
 assert.match(src,/showTeacherProfileV230/);
 assert.match(src,/gcs230-quicksearch/);
 assert.match(src,/gcs230-request-error/);
 assert.match(src,/count\.checkValidity\(\)/);
 assert.match(src,/ageMin\.checkValidity\(\)/);
 assert.match(src,/minAge>maxAge/);
 assert.match(src,/teacherApply\(o.id,message.value.trim\(\),number,minAge,maxAge\)/);
 assert.match(src,/calendarMenuV214/);
 assert.match(src,/teacherSetFavoriteV213/);
 assert.match(src,/sessionSearchRecordsV213/);
 assert.match(src,/hostEvents/);
 assert.match(src,/session-register\?session=/);
});
test('calm card styles remain scoped to teacher discovery and handle narrower screens',()=>{
 const css=readFileSync(new URL('../src/styles/sessionFinderV230.css',import.meta.url),'utf8');
 assert.match(css,/\.gct-portal #gctp-results \.gcs230-card/);
 assert.match(css,/\.gcs230-quicksearch/);
 assert.match(css,/\.gcs230-profile-dialog/);
 assert.match(css,/@media\(max-width:760px\)/);
});
