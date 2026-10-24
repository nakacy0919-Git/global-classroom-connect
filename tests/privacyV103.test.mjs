import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const original=read('sql/gcc_v103_private_student_codes.sql');
const upgrade=read('sql/gcc_v104_shared_code_rooms.sql');
const teacher=read('src/pages/public/SharedRegistrationPage.js');
const roster=read('src/lib/simpleRoster.js');
test('prior V10.3 migration stays in history but all old lookup modes are revoked',()=>{
 assert.match(original,/gcc_v103_student_codes/);
 assert.match(upgrade,/REVOKE EXECUTE ON FUNCTION public\.gcc_v102_find_my_room/);
 assert.match(upgrade,/REVOKE EXECUTE ON FUNCTION public\.gcc_v103_find_my_room/);
});
test('teacher registration keeps facilitators before review',()=>{
 const student=teacher.match(/<div class="gcc-v8-stage" data-v8-stage="2" hidden>([\s\S]*?)<div class="gcc-v8-stage" data-v8-stage="3" hidden>/)?.[1];
 const confirmation=teacher.match(/<div class="gcc-v8-stage" data-v8-stage="3" hidden>([\s\S]*?)<p role="alert"/)?.[1];
 assert.ok(student?.includes('gcc-v8-facilitators'));
 assert.ok(confirmation?.includes('gcc-v8-review'));
 assert.ok(!confirmation?.includes('gcc-v8-facilitators'));
});
test('friendly grade notation is retained',()=>{
 assert.match(roster,/Ana Sample \(Grade 11\)/);
});
