import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/pages/public/RoomPlanLookupPage.js',import.meta.url),'utf8');
const svc=readFileSync(new URL('../src/services/sharePlanV102.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/sharePlanV102.css',import.meta.url),'utf8');
const sql=readFileSync(new URL('../sql/gcc_v102_share_plan.sql',import.meta.url),'utf8');
test('public page needs private token + exact student and school inputs',()=>{
 for(const s of ['gcc-v102-name','gcc-v102-school','gcc-v102-lookup','gcc_v102_find_my_room','p_student_name','p_school_name'])
   assert.ok((page+svc).includes(s),s);
 assert.doesNotMatch(page,/listSessionSignups|fetchRoomDraft|gcc_v6_host_signups/);
});
test('no roster appears before validated lookup; use safe DOM text not innerHTML',()=>{
 assert.match(page,/result.*hidden/i);
 assert.match(page,/output\.hidden=false/);
 assert.doesNotMatch(page,/innerHTML|document\.write|localStorage|sessionStorage/);
 assert.match(page,/\.textContent/);
 assert.match(page,/rel='noopener noreferrer'/);
});
test('Supabase anonymous access restricted to exact-match lookup, not raw tables',()=>{
 assert.match(sql,/ALTER TABLE public\.gcc_v102_shared_plans ENABLE ROW LEVEL SECURITY/i);
 assert.match(sql,/REVOKE ALL ON public\.gcc_v102_shared_plans FROM PUBLIC, anon, authenticated/i);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v102_find_my_room\(text,text,text\) TO anon,authenticated/i);
 assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
 assert.match(sql,/v_matches<>1/);
 assert.match(sql,/lower\(btrim\(s\.school_name\)\)/);
 assert.match(sql,/sha256\(convert_to/);
});
test('host publication supports revision matching, secret rotation and revocation',()=>{
 assert.match(sql,/v_revision<>p_expected_revision/);
 assert.match(sql,/ON CONFLICT\(event_id\) DO UPDATE/);
 assert.match(sql,/is_active=false/);
 assert.match(svc,/gcc_v102_publish_room_plan/);
 assert.match(svc,/gcc_v102_revoke_room_plan/);
 assert.match(svc,/gcc_v102_host_share_status/);
 assert.doesNotMatch(sql,/CREATE POLICY.*TO anon/);
});
test('UI stylesheet is scoped and respects reduced motion',()=>{
 assert.match(css,/\.gcc-v102-public/);
 assert.match(css,/\.gcc-v8-share/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/(^|\n)body\s*\{/);
});
