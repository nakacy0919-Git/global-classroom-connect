import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/lib/roomFinderV161.js');
const {roomFinderEntriesV161,roomFinderSchoolsV161,roomFinderPeopleV161}=await import('data:text/javascript,'+encodeURIComponent(source.replace(/^import '\.\.\/styles\/roomFinderV161\.css';\s*/,'')));
const page=read('src/pages/public/RoomPlanLookupPage.js');
const css=read('src/styles/roomFinderV161.css');
const rooms=[
 {room_number:2,students:[{name:'Zoe',school:'Showa High School'},{name:'Alice',school:'Showa High School'}],facilitators:[{name:'Ms. Kim',school:'LSPU'}]},
 {room_number:11,students:[{name:'Ben',school:'LSPU'},{name:'Amy',school:'Showa High School'}],facilitators:[{name:'Mr. Lee',school:'Showa High School'}]},
 {room_number:7,students:[{name:'Alice',school:'Showa High School'}],facilitators:[]}
];
test('schools sorted alphabetically and every student and facilitator is searchable',()=>{
 const e=roomFinderEntriesV161(rooms);
 assert.equal(e.length,7);
 assert.deepEqual(roomFinderSchoolsV161(e),['LSPU','Showa High School']);
 assert.deepEqual(roomFinderPeopleV161(e,'showa high school').map(x=>x.name),['Alice','Alice','Amy','Mr. Lee','Zoe']);
 assert.deepEqual(roomFinderPeopleV161(e,'LSPU').map(x=>x.name),['Ben','Ms. Kim']);
 assert.equal(roomFinderPeopleV161(e,'Showa High School').find(x=>x.name==='Mr. Lee').roomNumber,11);
});
test('names may repeat; stable individual entries preserve the distinct room assignments',()=>{
 const alice=roomFinderPeopleV161(roomFinderEntriesV161(rooms),'Showa High School').filter(e=>e.name==='Alice');
 assert.equal(alice.length,2);
 assert.notEqual(alice[0].id,alice[1].id);
 assert.deepEqual(alice.map(e=>e.roomNumber),[2,7]);
});
test('blank names and schools are ignored and no unverified data fetch is introduced',()=>{
 const e=roomFinderEntriesV161([{room_number:1,students:[{name:'',school:'A'},{name:'Alice',school:''},{name:'Alice',school:'A'}]}]);
 assert.equal(e.length,1);
 assert.match(page,/netiquetteGuideV146\.show\(/);
 assert.match(page,/roomFinderV161\.showStart\(\)/);
 assert.match(page,/roomFinderV161\.onDraw\(data\)/);
 assert.match(page,/id="gcc-v161-choice"/);
 assert.match(page,/id="gcc-v161-finder"/);
 assert.match(page,/id="gcc-v161-full"/);
 assert.match(page,/card\.dataset\.roomNumber/);
 assert.doesNotMatch(page,/\.innerHTML|document\.write/);
});
test('selection is read-only, and the original all-rooms chart remains available',()=>{
 assert.match(source,/room\.cloneNode\(true\)/);
 assert.match(source,/show\('all'\)/);
 assert.match(source,/school\.addEventListener\('change'/);
 assert.match(source,/person\.addEventListener\('change'/);
 assert.match(source,/const oldPersonEntry=entries\.find/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
