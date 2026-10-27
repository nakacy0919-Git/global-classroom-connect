import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {GCC_SDG_V150,GCC_LEVELS_V150,GCC_MODES_V150,sessionTitleV150,partnerLevelsV150,filterOffersV150,sessionDetailsPayloadV150,overlapsLocalTimeV150} from '../src/lib/sessionStudioV150.js';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(base,path),'utf8');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
const sql=read('supabase/migrations/20261028_session_studio_v150.sql');
test('four-step wizard automatically uses verified teacher/school data and safely saves all details',()=>{
 for(const s of ['gctp-name','gctp-host-school','gctp-host-identity','gctp-from','gctp-to','gctp-theme','gctp-sdg','gctp-language','gctp-english','gctp-goals','gctp-form-progress','gctp-review','data-gctp-form-section="3"'])assert.ok(portal.includes(s),s);
 assert.match(portal,/identity\.school/);assert.match(portal,/identity\.country/);assert.match(portal,/identity\.name/);
 assert.match(portal,/details:detailsPayload\(\)/);
 assert.match(portal,/teacherCreateSession\(slot,data\)/);
 assert.equal(GCC_SDG_V150.length,17);
 assert.equal(GCC_LEVELS_V150.length,5);
 assert.deepEqual(Object.keys(GCC_MODES_V150),['device','classroom','hybrid']);
});
test('server retains secure old RPC and adds validated V15.0 RPC with no unapproved email or notes exposure',()=>{
 assert.match(sql,/add column if not exists session_details jsonb/);
 assert.match(sql,/public\.gcc_v150_teacher_register_session/);
 assert.match(sql,/public\.gcc_current_teacher_id\(\)/);
 assert.match(sql,/public\.gcc_teacher_register_session\(/);
 assert.match(sql,/where id=offer and teacher_id=tid/);
 assert.match(sql,/revoke all on function public\.gcc_v150_teacher_register_session/);
 assert.match(sql,/to authenticated/);
 assert.match(sql,/a\.session_details/);
 assert.doesNotMatch(sql,/t\.email|a\.notes|auth\.users/);
 const svc=read('src/services/teacherSelfService.js');
 assert.match(svc,/gcc_v150_teacher_register_session/);
 assert.match(svc,/gcc_teacher_register_session/);
});
test('legacy sessions remain visible with sensible defaults',()=>{
 const old={topic:'Open Culture',age_band:'Upper Secondary'};
 assert.equal(sessionTitleV150(old),'Open Culture');
 assert.deepEqual(partnerLevelsV150(old),['Upper Secondary']);
});
test('expanded sessions can welcome multiple age groups, filter SDG and device format',()=>{
 const offer={id:'a',status:'open',is_mine:false,
  starts_at:'2026-11-04T04:00:00Z',ends_at:'2026-11-04T05:00:00Z',
  country_code:'JP',country_name:'Japan',school_name:'Anjo Gakuen',topic:'SDGs',
  age_band:'Upper Secondary',session_details:{session_name:'Talk Climate',mode:'device',sdg:13,
   target_levels:['Lower Secondary','Upper Secondary'],language:'English'}};
 const me={timezone:'Asia/Tokyo',school_level:'Lower Secondary'};
 assert.deepEqual(filterOffersV150([offer],{compatible:true,from:'12:00',to:'15:00',sdg:'13',mode:'device'},me,0).map(x=>x.id),['a']);
 assert.deepEqual(filterOffersV150([offer],{band:'University'},me,0),[]);
 assert.deepEqual(filterOffersV150([offer],{from:'17:00',to:'20:00'},me,0),[]);
 assert.deepEqual(filterOffersV150([offer],{date:'2026-11-05'},me,0),[]);
 assert.equal(sessionTitleV150(offer),'Talk Climate');
 assert.equal(overlapsLocalTimeV150(offer,'Asia/Tokyo','12:00','15:00'),true);
});
test('session payload trims optional details and excludes arbitrary identity fields',()=>{
 const payload=sessionDetailsPayloadV150({name:'  Culture Day  ',mode:'hybrid',targetLevels:['Primary','Primary','University','wrong'],
  sdg:'4',language:'Japanese, English',englishLevel:'Beginner',goals:'Share daily routines',teacherId:'should-not-be-sent'});
 assert.deepEqual(payload.target_levels,['Primary','University']);
 assert.equal(payload.session_name,'Culture Day');
 assert.equal(payload.sdg,4);
 assert.equal(payload.teacherId,undefined);
});
test('Find Session makes local time prominent and adds concise optional filters',()=>{
 for(const s of ['gctp-find-preset','gctp-find-date','gctp-find-mode','gctp-find-sdg','gctp-find-compatible','gctp-find-zone-label','gcs150-clock-pair','filterOffersV150'])assert.ok(portal.includes(s),s);
 assert.match(portal,/timeRangeV112\(o\.starts_at,o\.ends_at,zone\)/);
 const css=read('src/styles/sessionStudioV150.css');
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/gcs150-mode-grid/);
});

test('device-choice illustrations are local SVGs with readable labels',()=>{
 for(const mode of ['device','classroom','hybrid']){
  assert.match(portal,new RegExp('/assets/session-formats/'+mode+'\\.svg'));
  const svg=read('public/assets/session-formats/'+mode+'.svg');
  assert.match(svg,/<svg /);assert.match(svg,/aria-label=/);
 }
});
