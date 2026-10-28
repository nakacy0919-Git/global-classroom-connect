import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261028_host_school_pairs_v163.sql');
const ui=read('src/lib/hostRoomToolsV113.js');
test('host pair creation checks host credentials, school membership and optimistic revision',()=>{
 assert.match(sql,/gcc_v113_host_auth\(p_token,p_code,p_pin\)/);
 assert.match(sql,/sa\.signup_id IS DISTINCT FROM sb\.signup_id/);
 assert.match(sql,/sa\.school_name IS DISTINCT FROM p_school/);
 assert.match(sql,/d\.revision IS DISTINCT FROM p_expected_revision/);
 assert.match(sql,/gcc_v113_host_move\(p_token,p_code,p_pin,p_student_a,v_target,d\.revision\)/);
 assert.match(sql,/gcc_v106_locked_pairs/);
 assert.match(sql,/host_pair/);assert.match(sql,/host_unpair/);
 assert.doesNotMatch(sql,/SET token_hash|SET code_hash/);
});
test('host UI can choose school and two students, lock and unlock, and refresh shared chart',()=>{
 assert.match(ui,/School-specific pair settings/);
 assert.match(ui,/Lock pair together/);
 assert.match(ui,/Unlock existing pair/);
 assert.match(ui,/gcc_v163_host_pair/);
 assert.match(ui,/onRefresh\(getCode\(\)\)/);
});
