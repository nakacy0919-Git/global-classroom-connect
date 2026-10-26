import test from 'node:test';
import assert from 'node:assert/strict';
import {flagForCountryV130,rosterOverviewV130,sessionScheduleV130,planFreshnessV130} from '../src/lib/hostOverviewV130.js';
import fs from 'node:fs';
const read=(file)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('country flags are rendered from ISO codes, with safe fallback',()=>{
 assert.equal(flagForCountryV130('ID'),'🇮🇩');assert.equal(flagForCountryV130('JP'),'🇯🇵');
 assert.equal(flagForCountryV130('PH'),'🇵🇭');assert.equal(flagForCountryV130('LK'),'🇱🇰');
 assert.equal(flagForCountryV130(''),'🌐');assert.equal(flagForCountryV130('<html>'),'🌐');
});
test('registration bento summary counts approved students, schools, countries',()=>{
 const s=[{status:'approved',country_code:'JP',students:[{id:'a'},{id:'b'}]},{status:'approved',country_code:'ID',students:[{id:'c'}]},{status:'pending',country_code:'PH',students:[{id:'d'}]}];
 assert.deepEqual(rosterOverviewV130(s),{schools:3,approved:2,waiting:1,students:3,countries:2});
});
test('schedule retains the real October 28th start and end in Japan time',()=>{
 const x=sessionScheduleV130({starts_at:'2026-10-28T04:10:00Z',ends_at:'2026-10-28T05:00:00Z',timezone:'Asia/Tokyo'});
 assert.match(x.date,/28 Oct 2026/);assert.equal(x.start,'13:10');assert.equal(x.end,'14:00');
 assert.equal(x.hourAngle,35);assert.equal(x.minuteAngle,60);
});
test('saved 74, all approved 74, older published 40 should warn',()=>{
 const ids=Array.from({length:74},(_,i)=>String(i));
 const signups=[{status:'approved',students:ids.map(id=>({id}))}];
 const savedDraft={revision:41,draft:{rooms:[{students:ids}]}};
 const x=planFreshnessV130({signups,savedDraft,publication:{is_active:true,revision:40}});
 assert.equal(x.savedStudents,74);assert.equal(x.missing,0);assert.equal(x.allIncluded,true);assert.equal(x.publicationBehind,true);
});
test('unplaced new school is detected, without editing saved data',()=>{
 const draft={revision:8,draft:{rooms:[{students:['a','b']}]}};
 const x=planFreshnessV130({signups:[{status:'approved',students:[{id:'a'},{id:'b'},{id:'id1'}]}],savedDraft:draft});
 assert.equal(x.missing,1);assert.equal(x.allIncluded,false);assert.equal(JSON.stringify(draft).includes('id1'),false);
});
test('duplicate or removed roster IDs are not reported as successfully synced',()=>{
 assert.equal(planFreshnessV130({signups:[{status:'approved',students:[{id:'a'}]}],savedDraft:{revision:1,draft:{rooms:[{students:['a','a']} ]}}}).allIncluded,false);
 assert.equal(planFreshnessV130({signups:[{status:'approved',students:[{id:'a'}]}],savedDraft:{revision:1,draft:{rooms:[{students:['a','b']} ]}}}).extra,1);
});
test('host has bento cards, flags, refresh before room planning and clear stale publication warning',()=>{
 const src=read('src/pages/host/SimpleSessionsPage.js');
 const css=read('src/styles/hostBentoV130.css');
 assert.match(src,/gcc-v130-school-grid/);assert.match(src,/flagForCountryV130/);
 assert.match(src,/sessionScheduleV130/);assert.match(src,/clock-hour/);
 assert.match(src,/if\(next===2\)/);assert.match(src,/await reload\(false\)/);
 assert.match(src,/getRoomShareStatus\(e.id\)/);assert.match(src,/gcc-v130-publish-warning/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:850px\)/);
});
