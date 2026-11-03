import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionSearchRecordsV213,filterSessionRecordsV213,sessionResultsPageV213,favoriteKeyV213} from '../src/lib/sessionSearchV213.js';
import {captureSessionDraftV213,applySessionDraftV213,copiedSessionDraftV213} from '../src/lib/sessionDraftV213.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const far='2099-11-09T04:10:00Z',later='2099-11-09T05:10:00Z';
const jap={
 id:'a',status:'open',country_code:'JP',country_name:'Japan',starts_at:far,ends_at:later,
 student_count:20,room_count:4,age_band:'Upper Secondary',available_seats:15,
 topic:'School Culture',school_name:'Tokyo High School',
 session_details:{session_name:'School Culture Day',session_type:'cultural_exchange',
  mode:'classroom',sdg:4,min_age:12,max_age:18,
  target_levels:['Upper Secondary'],description:'Students exchange ideas about classrooms'}
};
const egypt={
 id:'b',status:'open',country_code:'EG',country_name:'Egypt',
 starts_at:'2099-11-10T04:10:00Z',ends_at:'2099-11-10T05:10:00Z',
 student_count:25,available_seats:36,topic:'Climate debate',school_name:'Cairo School',
 session_details:{session_name:'SDG Climate Debate',session_type:'structured_debate',
  mode:'device',sdg:13,min_age:15,max_age:19,target_levels:['Upper Secondary','University']}
};
const publicSession={
 id:'c',status:'published',title:'Global Culture Workshop',starts_at:'2099-11-11T04:10:00Z',
 ends_at:'2099-11-11T05:10:00Z',max_students:120,students:80,
 session_details:{host_country_code:'JP',host_country_name:'Japan',
  session_type:'cultural_exchange',mode:'hybrid',sdg:4,min_age:12,max_age:18,
  description:'Culture and language in the classroom',target_levels:['Upper Secondary']}
};
const identity={timezone:'Asia/Tokyo',school_level:'Upper Secondary'};
const now=Date.parse('2099-01-01T00:00:00Z');
const all=()=>sessionSearchRecordsV213([jap,egypt],[publicSession],now);
test('teacher and host-session records share the same canonical country, type, level and age filters',()=>{
 assert.deepEqual(filterSessionRecordsV213(all(),{country:'JP'},identity,now).map(x=>x.id),['a','c']);
 assert.deepEqual(filterSessionRecordsV213(all(),{kind:'cultural_exchange'},identity,now).map(x=>x.id),['a','c']);
 assert.deepEqual(filterSessionRecordsV213(all(),{band:'Upper Secondary'},identity,now).map(x=>x.id),['a','b','c']);
 assert.deepEqual(filterSessionRecordsV213(all(),{sdg:'13'},identity,now).map(x=>x.id),['b']);
 assert.deepEqual(filterSessionRecordsV213(all(),{age:'12'},identity,now).map(x=>x.id),['a','c']);
 assert.deepEqual(filterSessionRecordsV213(all(),{mode:'hybrid'},identity,now).map(x=>x.id),['c']);
 assert.deepEqual(filterSessionRecordsV213(all(),{query:'climate'},identity,now).map(x=>x.id),['b']);
 assert.deepEqual(filterSessionRecordsV213(all(),{date:'2099-11-09'},identity,now).map(x=>x.id),['a']);
});
test('favorites, sorting, and display paging use same results across both data sources',()=>{
 const rec=all();
 assert.equal(favoriteKeyV213('event','c'),'event:c');
 assert.deepEqual(filterSessionRecordsV213(rec,{favoritesOnly:true,favoriteKeys:new Set(['event:c'])},identity,now).map(x=>x.id),['c']);
 assert.deepEqual(filterSessionRecordsV213(rec,{sort:'latest'},identity,now).map(x=>x.id),['c','b','a']);
 assert.deepEqual(filterSessionRecordsV213(rec,{sort:'seats'},identity,now).map(x=>x.id),['c','b','a']);
 assert.deepEqual(filterSessionRecordsV213(rec,{sort:'country'},identity,now).map(x=>x.id),['b','a','c']);
 const large=Array.from({length:32},(_,i)=>({...rec[0],id:String(i)}));
 assert.equal(sessionResultsPageV213(large,12).items.length,12);
 assert.equal(sessionResultsPageV213(large,24).remaining,8);
 assert.equal(sessionResultsPageV213(large,36).hasMore,false);
});
test('future-only records, closed sessions, own offers, and expired deadlines are excluded',()=>{
 const found=sessionSearchRecordsV213([jap,{...egypt,status:'closed'},
  {...jap,id:'mine',is_mine:true},
  {...jap,id:'expired',session_details:{...jap.session_details,registration_closes_at:'2025-01-01T00:00:00Z'}}],
  [{...publicSession,id:'past',ends_at:'2000-01-01T00:00:00Z'}],now);
 assert.deepEqual(found.map(x=>x.id),['a']);
});
test('draft captures radio, multiple levels, text, and excludes flyer file contents',()=>{
 const fields=[
  {id:'gctp-name',value:'Teacher exchange',type:'text'},
  {id:'',name:'gctp-mode',type:'radio',value:'device',checked:true},
  {id:'',name:'gctp-mode',type:'radio',value:'classroom',checked:false},
  {id:'',name:'gctp-target-level',type:'checkbox',value:'Upper Secondary',checked:true},
  {id:'',name:'gctp-target-level',type:'checkbox',value:'Primary',checked:false},
  {id:'gctp-flow',type:'textarea',value:'13:10 Welcome\n13:20 Talk'},
  {id:'gctp-flyerfile',type:'file',value:'photo.png'},
  {id:'gctp-zone',type:'text',value:'Asia/Tokyo'},
  {id:'gctp-platform',type:'select',value:'zoom',tagName:'SELECT',dispatchEvent(){}}
 ];
 const form={querySelectorAll:()=>fields,querySelector:sel=>fields.find(x=>'#'+x.id===sel)};
 const draft=captureSessionDraftV213(form,2);
 assert.equal(draft.step,2);
 assert.equal(draft.fields['gctp-mode'],'device');
 assert.deepEqual(draft.fields['gctp-target-level'],['Upper Secondary']);
 assert.equal(draft.fields['gctp-flyerfile'],undefined);
 assert.equal(draft.fields['gctp-zone'],undefined);
 assert.equal(applySessionDraftV213(form,draft),true);
 assert.equal(fields.find(x=>x.name==='gctp-mode'&&x.value==='device').checked,true);
});
test('duplicate copies pedagogy, not meeting dates/deadlines or confirmed registrations',()=>{
 const copy=copiedSessionDraftV213(jap,{date:'',from:'13:10',to:'14:10',deadline:''});
 assert.match(copy.fields['gctp-name'],/\(Copy\)$/);
 assert.equal(copy.fields['gctp-date'],'');
 assert.equal(copy.fields['gctp-deadline'],'');
 assert.equal(copy.fields['gctp-flow'],'');
 assert.equal(copy.fields['gctp-mode'],'classroom');
 assert.deepEqual(copy.fields['gctp-target-level'],['Upper Secondary']);
 assert.equal(copy.fields['gctp-platform'],'');
 assert.equal(copy.source_flyer_url,'');
});
test('host-assisted join requests carry the actual school-size count to capacity checks',()=>{
 const host=read('src/pages/host/FindSessionPage.js');
 const service=read('src/services/sessionJoinRequestService.js');
 assert.match(host,/id="gcf-request-students"/);
 assert.match(host,/requestSessionJoin\(activeOffer.id,id,msg,count\)/);
 assert.match(service,/requested_students:studentCount/);
});
test('SQL grants teacher-only draft and favorite access, never modifies session rosters',()=>{
 const sql=read('supabase/migrations/20261103_gcc_v213_teacher_workspace_and_favorites.sql');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public.gcc_teacher_workspace_v213/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public.gcc_teacher_favorites_v213/);
 assert.match(sql,/ALTER TABLE public.gcc_teacher_workspace_v213 ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public.gcc_teacher_workspace_v213 FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/WHERE w.teacher_id=tid/);
 assert.match(sql,/p_draft->>'version'\) IS DISTINCT FROM '1'/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public.gcc_v213_set_teacher_favorite\(text,uuid,boolean\) FROM PUBLIC,anon/);
 assert.doesNotMatch(sql,/(?:UPDATE|DELETE FROM)\s+public\.(?:events|gcc_v91_room_drafts|gcc_v102_shared_plans|gcc_v104_shared_access|gcc_session_signup_students)\b/i);
});
test('both Find Session experiences use the unified search engine and pagination',()=>{
 const teacher=read('src/pages/teacher/TeacherPortalPage.js'),host=read('src/pages/host/FindSessionPage.js');
 assert.match(teacher,/sessionSearchRecordsV213\(upcoming\(\),hostEvents\)/);
 assert.match(teacher,/filterSessionRecordsV213\(records,currentSearchFilters\(\),identity\)/);
 assert.match(teacher,/gcs213-favorites-only/);
 assert.match(teacher,/teacherSaveDraftV213\(snapshot\)/);
 assert.match(teacher,/duplicateOwnSession\(o\)/);
 assert.match(teacher,/teacherClearDraftV213\(\)/);
 assert.match(host,/sessionSearchRecordsV213\(offers,publicEvents\)/);
 assert.match(host,/filterSessionRecordsV213\(records/);
 assert.match(host,/gcf-sdg/);assert.match(host,/gcf-mode/);
 assert.match(host,/gcf-show-more/);
});
