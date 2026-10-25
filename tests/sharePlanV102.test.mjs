import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const page=read('src/pages/public/RoomPlanLookupPage.js');
const host=read('src/pages/host/SimpleSessionsPage.js');
const service=read('src/services/sharePlanV102.js');
const sql=read('sql/gcc_v104_shared_code_rooms.sql');
test('one 6-digit session code opens the complete read-only room chart',()=>{
 assert.match(page,/gcc-v104-code/);
 assert.match(page,/View all rooms/);
 assert.match(page,/Find a student or school/);
 assert.match(page,/room\.students/);
 assert.doesNotMatch(page,/gcc-v103-access-code|gcc-v102-name|gcc-v102-school|listSessionSignups|fetchRoomDraft|\.innerHTML/);
 assert.match(service,/gcc_v112_open_room_chart/);
 const timeSql=read('sql/gcc_v112_world_session_time.sql');
 assert.match(timeSql,/v_chart:=public\.gcc_v104_open_room_chart\(p_token,p_access_code\)/);
 assert.match(timeSql,/IF v_chart IS NULL THEN RETURN NULL/);
 assert.doesNotMatch(service,/runRpc\('gcc_v10[23]_find_my_room'/);
});
test('host has an intentional two-step invitation flow',()=>{
 assert.match(host,/One session\. One code\. All rooms/);
 assert.match(host,/Publish your rooms/);
 assert.match(host,/Share one invitation/);
 assert.match(host,/Create 6-digit session code/);
 assert.match(host,/Copy invitation \(link \+ code\)/);
 assert.doesNotMatch(host,/Generate private student codes|Regenerate ALL student codes|Copy codes for this school/);
});
test('database locks down old read endpoints and V10.4 table',()=>{
 assert.match(sql,/REVOKE EXECUTE ON FUNCTION public\.gcc_v102_find_my_room/);
 assert.match(sql,/REVOKE EXECUTE ON FUNCTION public\.gcc_v103_find_my_room/);
 assert.match(sql,/REVOKE EXECUTE ON FUNCTION public\.gcc_v103_issue_student_codes/);
 assert.match(sql,/ALTER TABLE public\.gcc_v104_shared_access ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.gcc_v104_shared_access FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v104_open_room_chart\(text,text\) TO anon,authenticated/);
});
test('rate limits wrong codes and expires credentials',()=>{
 assert.match(sql,/failed_attempts/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/v_attempts>=12/);
 assert.match(sql,/interval '15 minutes'/);
 assert.match(sql,/g\.expires_at<=now\(\)/);
 assert.match(sql,/extensions\.gen_random_bytes\(4\)/);
 assert.match(sql,/sha256\(convert_to/);
 assert.match(sql,/count\(DISTINCT entry\.id\)/);
});
