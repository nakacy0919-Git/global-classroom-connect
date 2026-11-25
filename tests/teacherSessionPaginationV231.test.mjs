import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectTeacherSessionsV231,missingPagedBrowseV231} from '../src/lib/teacherSessionPaginationV231.js';
const iso=n=>new Date(Date.parse('2027-01-01T00:00:00Z')+n*60000).toISOString();
const make=(from,count)=>Array.from({length:count},(_,i)=>({id:'offer-'+String(from+i).padStart(4,'0'),starts_at:iso(from+i)}));
test('walks all cursor pages beyond the old 300 session limit without duplicates',async()=>{
 const records=make(0,325);let calls=0;
 const found=await collectTeacherSessionsV231({
  getLegacy:async()=>{throw Error('unexpected legacy fallback');},
  getPage:async({afterStart,afterId,limit})=>{
   calls++;assert.equal(limit,100);
   const next=afterStart===null?0:records.findIndex(r=>r.id===afterId)+1;
   return {items:records.slice(next,next+100),has_more:next+100<records.length};
  }
 });
 assert.equal(found.length,325);
 assert.equal(found[324].id,'offer-0324');
 assert.equal(calls,4);
});
test('missing V23.1 RPC returns old response only for a confirmed missing-function error',async()=>{
 const old=make(0,4);
 const found=await collectTeacherSessionsV231({
  getPage:async()=>{throw {code:'PGRST202',message:'Could not find public.gcc_v231_teacher_browse_sessions_page in schema cache'};},
  getLegacy:async()=>old
 });
 assert.deepEqual(found,old);
 assert.equal(missingPagedBrowseV231({code:'PGRST301',message:'permission denied'}),false);
 assert.equal(missingPagedBrowseV231({code:'PGRST202',message:'No other function found'}),false);
});
test('a legacy response at the 300 row cap is reported, never silently truncated',async()=>{
 await assert.rejects(collectTeacherSessionsV231({
  getPage:async()=>{throw {code:'PGRST202',message:'gcc_v231_teacher_browse_sessions_page not found'};},
  getLegacy:async()=>make(0,300)
 }),/capped at 300 results/);
});
test('permission failures, network failures and schema inconsistencies are not hidden',async()=>{
 for(const error of [{code:'42501',message:'permission denied'},new Error('Failed to fetch')]){
  await assert.rejects(collectTeacherSessionsV231({
   getPage:async()=>{throw error;},
   getLegacy:async()=>{throw Error('fallback must not be used');}
  }),e=>e===error);
 }
 await assert.rejects(collectTeacherSessionsV231({
  getPage:async()=>({items:null,has_more:false}),getLegacy:async()=>[]
 }),/Invalid paginated session listing response/);
});
test('a duplicate, nonmonotonic cursor or stuck empty page fails closed',async()=>{
 await assert.rejects(collectTeacherSessionsV231({
  getPage:async()=>({items:[make(0,1)[0],make(0,1)[0]],has_more:false}),
  getLegacy:async()=>[]
 }),/Duplicate session/);
 await assert.rejects(collectTeacherSessionsV231({
  getPage:async()=>({items:[],has_more:true}),getLegacy:async()=>[]
 }),/cursor did not advance/);
});
test('paged SQL enforces teacher identity, secure grants and stable cursor ordering',()=>{
 const sql=readFileSync(new URL('../sql/gcc_v231_teacher_browse_paged.sql',import.meta.url),'utf8');
 const service=readFileSync(new URL('../src/services/teacherSelfService.js',import.meta.url),'utf8');
 assert.match(sql,/teacher:=public\.gcc_current_teacher_id\(\)/);
 assert.match(sql,/SECURITY DEFINER SET search_path TO ''/);
 assert.match(sql,/a\.teacher_id=teacher OR/);
 assert.match(sql,/a\.session_details-'meeting_url'/);
 assert.match(sql,/\(a\.starts_at,a\.id\)>\(p_after_start,p_after_id\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v231_teacher_browse_sessions_page/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v231_teacher_browse_sessions_page[\s\S]*TO authenticated/);
 assert.doesNotMatch(sql,/GRANT EXECUTE[\s\S]*TO anon;/);
 assert.match(service,/collectTeacherSessionsV231/);
 assert.match(service,/getLegacy:\(\)=>rpc\('gcc_teacher_browse_sessions'\)/);
});
