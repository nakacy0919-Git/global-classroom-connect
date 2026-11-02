import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SESSION_TYPES_V203,PLATFORMS_V203,parseFlowV203,TYPE_LABEL_V203} from '../src/lib/sessionPlannerV203.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261102_gcc_v203_session_plans.sql');
test('educational session types are independent of conferencing platform',()=>{
 assert.equal(SESSION_TYPES_V203.length,10);
 assert.equal(PLATFORMS_V203.length,5);
 assert.equal(TYPE_LABEL_V203('structured_debate'),'Structured Debate');
 assert.ok(SESSION_TYPES_V203.some(x=>x[0]==='conversation_practice'));
 assert.ok(SESSION_TYPES_V203.some(x=>x[0]==='collaborative_project'));
});
test('agenda requires timed ordered stages that span the session',()=>{
 const rows=parseFlowV203('13:10 | Welcome and goals\n13:20 | Cultural exchange breakout\n13:55 | Reflection and closing','13:10','14:00');
 assert.equal(rows.length,3);
 assert.equal(rows[2].time,'13:55');
 assert.throws(()=>parseFlowV203('13:20 | Too late\n13:30 | Discuss together','13:10','14:00'),/first flow/);
 assert.throws(()=>parseFlowV203('13:10 | Welcome together\n13:09 | Another activity','13:10','14:00'),/times must be ordered|ordered within/);
 assert.throws(()=>parseFlowV203('13:10 | Welcome together','13:10','14:00'),/2–20/);
});
test('protected host and teacher routes store mandatory plans and protect the invitation',()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.gcc_v203_validate_plan/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.gcc_v203_save_event_plan/);
 assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.gcc_v203_teacher_register_session/);
 assert.match(sql,/gcc_v203_validate_plan\(p_details,p_starts_at,p_ends_at,p_timezone\)/);
 assert.match(sql,/ALTER TABLE public\.events ADD COLUMN/);
 assert.match(sql,/session_details - 'meeting_url'/);
 assert.match(sql,/gcc_v203_enforce_event_deadline/);
 assert.match(sql,/gcc_v203_enforce_offer_deadline/);
});
test('public and private pages show appropriate details',()=>{
 const teacher=read('src/pages/teacher/TeacherPortalPage.js');
 const host=read('src/pages/host/SimpleSessionsPage.js');
 const find=read('src/pages/host/FindSessionPage.js');
 const register=read('src/pages/public/SharedRegistrationPage.js');
 const rooms=read('src/pages/public/RoomPlanLookupPage.js');
 assert.match(teacher,/mountPlanFieldsV203/);assert.match(teacher,/readPlanV203/);
 assert.match(host,/mountHostPlanEditorV203/);assert.match(host,/saveHostPlanV203/);
 assert.match(find,/showPublicSessionOverviewV168/);assert.match(find,/gcc203-published-list/);
 assert.match(register,/gcc203-registration-details/);
 assert.match(rooms,/renderSessionDetailsV203\(plan,data\.session_details,\{privateLink:true\}\)/);
});
